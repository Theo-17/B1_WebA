const express = require('express');
const router = express.Router();
const { poolPromise } = require('../db/database');

router.get('/dashboard', async (req, res) => {
  if (!req.session.user || req.session.user.rol !== 'veterinario') {
    return res.redirect('/login');
  }

  try {
    const pool = await poolPromise;
    const veterinarioId = req.session.user.id;

    // Obtener citas
    const citasResult = await pool.request()
      .input('veterinarioId', veterinarioId)
      .query(`
        SELECT c.*, u.nombre AS cliente_nombre
        FROM Citas c
        JOIN Usuarios u ON c.cliente_id = u.id
        WHERE c.id_veterinario = @veterinarioId
        ORDER BY c.fecha ASC
      `);

    // Obtener chats activos
    const chatsResult = await pool.request()
      .input('veterinarioId', veterinarioId)
      .query(`
        SELECT 
          cs.id AS sesion_id,
          cs.id,
          u.nombre AS cliente_nombre,
          (SELECT TOP 1 fecha 
           FROM ChatMensajes 
           WHERE id_sesion = cs.id
           ORDER BY fecha DESC) AS ultimo_mensaje_fecha,
          (SELECT TOP 1 mensaje 
           FROM ChatMensajes 
           WHERE id_sesion = cs.id
           ORDER BY fecha DESC) AS ultimo_mensaje
        FROM ChatSesiones cs
        JOIN Usuarios u ON cs.id_cliente = u.id
        WHERE cs.id_veterinario = @veterinarioId
        AND cs.estado = 'activo'
        ORDER BY (SELECT TOP 1 fecha 
                 FROM ChatMensajes 
                 WHERE id_sesion = cs.id
                 ORDER BY fecha DESC) DESC
      `);

    res.render('dashboard_veterinario', {
      user: req.session.user,
      citas: citasResult.recordset,
      chatsActivos: chatsResult.recordset
    });
  } catch (err) {
    console.error(err);
    res.send('Error al cargar dashboard veterinario');
  }
});

router.get('/chat/:clienteId', async (req, res) => {
  if (!req.session.user || req.session.user.rol !== 'veterinario') {
    return res.redirect('/login');
  }

  try {
    const pool = await poolPromise;
    const veterinarioId = req.session.user.id;
    const clienteId = req.params.clienteId;

    // Get client information and existing chat session
    const clienteResult = await pool.request()
      .input('clienteId', clienteId)
      .input('veterinarioId', veterinarioId)
      .query(`
        SELECT 
          u.id, 
          u.nombre,
          cs.id as sesion_id
        FROM Usuarios u
        LEFT JOIN ChatSesiones cs ON 
          (cs.id_cliente = @clienteId AND cs.id_veterinario = @veterinarioId)
          AND cs.estado = 'activo'
        WHERE u.id = @clienteId
      `);

    if (!clienteResult.recordset[0]) {
      return res.redirect('/veterinario/dashboard');
    }

    const cliente = clienteResult.recordset[0];

    // Get existing messages if there's an active session
    let mensajes = [];
    if (cliente.sesion_id) {
      const mensajesResult = await pool.request()
        .input('sesionId', cliente.sesion_id)
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
      user: req.session.user,
      otroUsuarioId: clienteId,
      otroUsuarioNombre: cliente.nombre,
      sesionId: cliente.sesion_id,
      mensajes: mensajes
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar chat');
  }
});

module.exports = router;