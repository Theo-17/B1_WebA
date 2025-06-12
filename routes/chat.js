const express = require('express');
const router = express.Router();
const { poolPromise } = require('../db/database');

router.get('/', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const user = req.session.user;

  const sesionId = req.session.sesionId;

  if (user.rol === 'veterinario') {
    const esVeterinario = true;
    res.render('chat', { 
      user, 
      esVeterinario, 
      veterinarioId: null, 
      sesionId,
      otroUsuarioNombre: 'Cliente'
    });
  } else if (user.rol === 'cliente') {
    try {
      const pool = await poolPromise;
      const result = await pool.request()
        .query("SELECT id, nombre FROM Usuarios WHERE rol = 'veterinario'");
      const veterinarios = result.recordset;
      
      res.render('dashboard_cliente', { 
        user: req.session.user, 
        veterinarios: veterinarios 
      });
    } catch (err) {
      console.error(err);
      res.redirect('/citas/mis-citas');
    }
  } else {
    res.redirect('/login');
  }
});

router.get('/cliente/:veterinarioId', async (req, res) => {
  if (!req.session.user || req.session.user.rol !== 'cliente') {
    return res.redirect('/login');
  }

  try {
    const pool = await poolPromise;
    const user = req.session.user;
    const veterinarioId = parseInt(req.params.veterinarioId);
    const clienteId = user.id;

    // Verificación de cita confirmada entre cliente y veterinario
    const verificacion = await pool.request()
      .input('clienteId', clienteId)
      .input('veterinarioId', veterinarioId)
      .query(`
        SELECT COUNT(*) as total
        FROM Citas
        WHERE cliente_id = @clienteId
          AND id_veterinario = @veterinarioId
          AND estado = 'Confirmado'
      `);

    if (verificacion.recordset[0].total === 0) {
      return res.redirect('/citas/mis-citas');
    }

    // Obtener información del veterinario y sesión de chat activa
    const veterinarioResult = await pool.request()
      .input('veterinarioId', veterinarioId)
      .input('clienteId', clienteId)
      .query(`
        SELECT 
          u.id, 
          u.nombre,
          cs.id as sesion_id
        FROM Usuarios u
        LEFT JOIN ChatSesiones cs ON 
          (cs.id_cliente = @clienteId AND cs.id_veterinario = @veterinarioId)
          AND cs.estado = 'activo'
        WHERE u.id = @veterinarioId AND u.rol = 'veterinario'
      `);

    if (!veterinarioResult.recordset[0]) {
      return res.redirect('/chat');
    }

    const veterinario = veterinarioResult.recordset[0];

    let mensajes = [];
    if (veterinario.sesion_id) {
      const mensajesResult = await pool.request()
        .input('sesionId', veterinario.sesion_id)
        .query(`
          SELECT 
            cm.*,
            u.nombre AS emisor_nombre
          FROM ChatMensajes cm
          JOIN Usuarios u ON cm.id_emisor = u.id
          WHERE cm.id_sesion = @sesionId
          ORDER BY cm.fecha ASC
        `);
      mensajes = mensajesResult.recordset;
    }

    res.render('chat', { 
      user,
      otroUsuarioId: veterinarioId,
      otroUsuarioNombre: veterinario.nombre,
      sesionId: veterinario.sesion_id,
      mensajes: mensajes
    });

  } catch (err) {
    console.error(err);
    res.redirect('/chat');
  }
});

router.get('/messages/:sesionId', async (req, res) => {
  if (!req.session.user) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  try {
    const pool = await poolPromise;
    const sesionId = req.params.sesionId;

    const result = await pool.request()
      .input('sesionId', sesionId)
      .query(`
        SELECT 
          cm.*,
          u.nombre AS emisor_nombre
        FROM ChatMensajes cm
        JOIN Usuarios u ON cm.id_emisor = u.id
        WHERE cm.id_sesion = @sesionId
        ORDER BY cm.fecha ASC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cargar mensajes' });
  }
});

module.exports = router;
