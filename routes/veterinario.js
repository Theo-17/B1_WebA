// routes/veterinario.js
const express = require('express');
const router = express.Router();
const { poolPromise } = require('../db/database');

router.get('/veterinario/dashboard', async (req, res) => {
  if (!req.session.user || req.session.user.rol !== 'veterinario') {
    return res.redirect('/login');
  }

  try {
    const pool = await poolPromise;
    const veterinarioId = req.session.user.id;

    const result = await pool.request()
      .input('veterinarioId', veterinarioId)
      .query(`
        SELECT c.*, u.nombre AS cliente_nombre
        FROM Citas c
        JOIN Usuarios u ON c.cliente_id = u.id
        WHERE c.id_veterinario = @veterinarioId
        ORDER BY c.fecha ASC
      `);

    const citas = result.recordset;

    res.render('dashboard_veterinario', {
      user: req.session.user,
      citas: citas
    });
  } catch (err) {
    console.error(err);
    res.send('Error al cargar dashboard veterinario');
  }
});

router.get('/chat/:clienteId', (req, res) => {
  if (!req.session.user || req.session.user.rol !== 'veterinario') {
    return res.redirect('/login');
  }

  const clienteId = req.params.clienteId;
  const veterinario = req.session.user;

  res.render('chat', { 
    user: veterinario, 
    otroUsuarioId: clienteId
  });
});
module.exports = router;
