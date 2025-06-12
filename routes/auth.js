const express = require('express');
const router = express.Router();
const { poolPromise } = require('../db/database');

router.get('/login', (req, res) => {
  res.render('login');
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('email', email)
      .input('password', password)
      .query('SELECT * FROM Usuarios WHERE email = @email AND password = @password');

    const user = result.recordset[0];
    if (user) {
      req.session.user = user;

      if (user.rol === 'cliente') {
        res.redirect('/citas');
      } else if (user.rol === 'veterinario') {
        res.redirect('/veterinario/dashboard');
      } else {
        res.redirect('/chat');  // otros roles si existieran
      }
    } else {
      res.send('Credenciales incorrectas');
    }
  } catch (err) {
    console.error(err);
    res.send('Error en login');
  }
});

router.get('/register', (req, res) => {
  res.render('register'); // Asegúrate de tener views/register.ejs
});

module.exports = router;
