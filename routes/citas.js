const express = require('express');
const router = express.Router();
const { poolPromise } = require('../db/database');
const sql = require('mssql');

router.get('/', async (req, res) => {
    if (!req.session.user || req.session.user.rol !== 'cliente') return res.redirect('/login');

    const pool = await poolPromise;
        // Traemos veterinarios para el select
    const vetsResult = await pool.request()
        .query(`SELECT id, nombre FROM Usuarios WHERE rol = 'veterinario'`);
    const veterinarios = vetsResult.recordset;

    res.render('dashboard_cliente', { user: req.session.user, veterinarios });
});

// Formulario para agendar cita
router.get('/agendar', async (req, res) => {
    if (!req.session.user || req.session.user.rol !== 'cliente') return res.redirect('/login');
    try {
        const pool = await poolPromise;
        // Traemos veterinarios para el select
        const vetsResult = await pool.request()
            .query(`SELECT id, nombre FROM Usuarios WHERE rol = 'veterinario'`);
        const veterinarios = vetsResult.recordset;

        res.render('agendar_cita', { veterinarios });
    } catch (err) {
        console.error(err);
        res.send('Error al cargar datos');
    }
});

router.get('/veterinario', async (req, res) => {
    if (!req.session.user || req.session.user.rol !== 'veterinario') return res.redirect('/login');
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query(`
        SELECT Citas.fecha, Citas.motivo, U.nombre AS cliente_nombre
        FROM Citas
        JOIN Usuarios U ON U.id = Citas.cliente_id
      `);
        res.render('dashboard_veterinario', { user: req.session.user, citas: result.recordset });
    } catch (err) {
        console.error(err);
        res.send('Error al cargar citas');
    }
});


router.post('/agendar', async (req, res) => {
    const {
        nombre_mascota,
        especie,
        raza,
        fecha_nacimiento,
        fecha,
        motivo,
        id_veterinario  // <-- agregar para recibirlo del formulario
    } = req.body;

    const userId = req.session.user.id;

    try {
        const pool = await poolPromise;

        // Insertar mascota y obtener su ID
        const resultMascota = await pool.request()
            .input('id_usuario', sql.Int, userId)
            .input('nombre', sql.VarChar(100), nombre_mascota)
            .input('especie', sql.VarChar(50), especie)
            .input('raza', sql.VarChar(50), raza || null)
            .input('fecha_nacimiento', sql.Date, fecha_nacimiento || null)
            .query(`
        INSERT INTO Mascotas (id_usuario, nombre, especie, raza, fecha_nacimiento)
        OUTPUT INSERTED.id
        VALUES (@id_usuario, @nombre, @especie, @raza, @fecha_nacimiento)
      `);

        const idMascota = resultMascota.recordset[0].id;

        // Insertar cita con el veterinario seleccionado
        await pool.request()
            .input('cliente_id', sql.Int, userId)
            .input('id_mascota', sql.Int, idMascota)
            .input('id_veterinario', sql.Int, parseInt(id_veterinario))  // <-- acá
            .input('fecha', sql.DateTime, new Date(fecha))
            .input('motivo', sql.NVarChar, motivo)
            .query(`
        INSERT INTO Citas (cliente_id, id_mascota, id_veterinario, fecha, motivo)
        VALUES (@cliente_id, @id_mascota, @id_veterinario, @fecha, @motivo)
      `);

        res.redirect('/citas/mis-citas');
    } catch (err) {
        console.error(err);
        res.send('Error al agendar cita');
    }
});

router.get('/mis-citas', async (req, res) => {
    if (!req.session.user || req.session.user.rol !== 'cliente') return res.redirect('/login');
    try {
        const pool = await poolPromise;
        const userId = req.session.user.id;
        const result = await pool.request()
            .input('cliente_id', sql.Int, userId)
            .query(`
        SELECT Citas.fecha, Citas.motivo, U.nombre AS veterinario_nombre, U.id AS veterinario_id, M.nombre AS mascota_nombre
FROM Citas
JOIN Usuarios U ON U.id = Citas.id_veterinario
JOIN Mascotas M ON M.id = Citas.id_mascota
WHERE Citas.cliente_id = @cliente_id
ORDER BY Citas.fecha DESC
      `);
        res.render('mis_citas', { citas: result.recordset });
    } catch (err) {
        console.error(err);
        res.send('Error al cargar sus citas');
    }
});


module.exports = router;
