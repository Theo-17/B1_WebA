const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const user = req.session.user;

  if (user.rol === 'veterinario') {
    // El veterinario puede tener un chat general o con lista
    const esVeterinario = true;
    res.render('chat', { user, esVeterinario, veterinarioId: null });
  } else if (user.rol === 'cliente') {
    // El cliente no debe entrar aquí sin veterinarioId, redirigir a la lista de citas o a /citas/mis-citas
    return res.redirect('/citas/mis-citas');
  } else {
    // Otros roles o por defecto
    res.redirect('/login');
  }
});

router.get('/cliente/:veterinarioId', (req, res) => {
  if (!req.session.user || req.session.user.rol !== 'cliente') {
    return res.redirect('/login');
  }

  const user = req.session.user; // cliente
  const veterinarioId = req.params.veterinarioId;

  res.render('chat', { user, otroUsuarioId: veterinarioId });
});
module.exports = router;
