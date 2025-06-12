const express = require('express');
const router = express.Router();
const { poolPromise } = require('../db/database');
const crypto = require('crypto');

// Función para hashear la contraseña
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

router.get('/login', (req, res) => {
  res.render('login');
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const hashedPassword = hashPassword(password);
    const pool = await poolPromise;
    const result = await pool.request()
      .input('email', email)
      .input('password', hashedPassword)
      .query('SELECT * FROM Usuarios WHERE email = @email AND password = @password');

    const user = result.recordset[0];
    if (user) {
      req.session.user = user;
      if (user.rol === 'cliente') {
        res.redirect('/citas');
      } else if (user.rol === 'veterinario') {
        res.redirect('/veterinario/dashboard');
      } else {
        res.redirect('/chat');
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

router.post('/register', async (req, res) => {
  const { nombre, email, password, rol, pregunta_seguridad, respuesta_seguridad } = req.body;
  try {
    const hashedPassword = hashPassword(password);
    const hashedRespuesta = hashPassword(respuesta_seguridad.trim().toLowerCase()); // Hashea la respuesta
    const pool = await poolPromise;
    await pool.request()
      .input('nombre', nombre)
      .input('email', email)
      .input('password', hashedPassword)
      .input('rol', rol)
      .input('pregunta_seguridad', pregunta_seguridad)
      .input('respuesta_seguridad', hashedRespuesta)
      .query('INSERT INTO Usuarios (nombre, email, password, rol, pregunta_seguridad, respuesta_seguridad) VALUES (@nombre, @email, @password, @rol, @pregunta_seguridad, @respuesta_seguridad)');
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    res.send('Error al registrar usuario');
  }
});

// Paso 1: Recibe el correo y muestra la pregunta (puedes hacerlo con AJAX o en dos pasos)
router.post('/recuperar-contrasenia', async (req, res) => {
  const { email } = req.body;
  const pool = await poolPromise;
  const result = await pool.request()
    .input('email', email)
    .query('SELECT pregunta_seguridad FROM Usuarios WHERE email = @email');
  if (result.recordset.length === 0) {
    return res.send('Correo no encontrado');
  }
  // Puedes renderizar la pregunta o devolverla por JSON si usas AJAX
  res.json({ pregunta: result.recordset[0].pregunta_seguridad });
});

// Paso 2: Verifica la respuesta y cambia la contraseña
router.post('/verificar-pregunta', async (req, res) => {
  const { email, pregunta, respuesta, nueva_password } = req.body;
  const preguntas = {
    '¿Cómo se llamaba tu primera mascota?': 'mascota',
    '¿Cuál es el nombre de tu escuela primaria?': 'escuela',
    '¿En qué ciudad naciste?': 'ciudad',
    '¿Cuál es tu color favorito?': 'color'
  };
  const pregunta_seguridad = preguntas[pregunta] || pregunta;
  const hashedRespuesta = hashPassword(respuesta.trim().toLowerCase());
  const hashedPassword = hashPassword(nueva_password);
  const pool = await poolPromise;
  // Verifica de nuevo por seguridad
  const result = await pool.request()
    .input('email', email)
    .input('pregunta_seguridad', pregunta_seguridad)
    .input('respuesta_seguridad', hashedRespuesta)
    .query('SELECT * FROM Usuarios WHERE email = @email AND pregunta_seguridad = @pregunta_seguridad AND respuesta_seguridad = @respuesta_seguridad');
  if (result.recordset.length === 0) {
    return res.send('Pregunta o respuesta incorrecta');
  }
  // Cambia la contraseña
  await pool.request()
    .input('email', email)
    .input('password', hashedPassword)
    .query('UPDATE Usuarios SET password = @password WHERE email = @email');
  res.send('Contraseña actualizada correctamente');
});

router.get('/recuperar-contrasenia', (req, res) => {
   res.render('recuperar-contrasenia');
});

router.get('/api/pregunta-seguridad', async (req, res) => {
  const { email } = req.query;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('email', email)
      .query('SELECT pregunta_seguridad FROM Usuarios WHERE email = @email');
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Correo no encontrado' });
    }
    // Traduce el valor a la pregunta legible
    const preguntas = {
      mascota: '¿Cómo se llamaba tu primera mascota?',
      escuela: '¿Cuál es el nombre de tu escuela primaria?',
      ciudad: '¿En qué ciudad naciste?',
      color: '¿Cuál es tu color favorito?'
    };
    const clave = result.recordset[0].pregunta_seguridad;
    res.json({ pregunta: preguntas[clave] || clave });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/api/verificar-respuesta', async (req, res) => {
  const { email, pregunta, respuesta } = req.body;
  const preguntas = {
    '¿Cómo se llamaba tu primera mascota?': 'mascota',
    '¿Cuál es el nombre de tu escuela primaria?': 'escuela',
    '¿En qué ciudad naciste?': 'ciudad',
    '¿Cuál es tu color favorito?': 'color'
  };
  const pregunta_seguridad = preguntas[pregunta] || pregunta;
  const hashedRespuesta = hashPassword(respuesta.trim().toLowerCase());
  const pool = await poolPromise;
  const result = await pool.request()
    .input('email', email)
    .input('pregunta_seguridad', pregunta_seguridad)
    .input('respuesta_seguridad', hashedRespuesta)
    .query('SELECT * FROM Usuarios WHERE email = @email AND pregunta_seguridad = @pregunta_seguridad AND respuesta_seguridad = @respuesta_seguridad');
  res.json({ correcta: result.recordset.length > 0 });
});

module.exports = router;