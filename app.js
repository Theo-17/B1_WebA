const express = require('express');
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const { poolPromise } = require('./db/database');

dotenv.config();

const app = express();
const server = http.createServer(app);
// Initialize Socket.IO with CORS enabled
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Configuraciones básicas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
  secret: process.env.SESSION_SECRET || '12345',
  resave: false,
  saveUninitialized: false
}));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Importar rutas
const authRoutes = require('./routes/auth');
const citasRoutes = require('./routes/citas');
const chatRoutes = require('./routes/chat');
const veterinarioRoutes = require('./routes/veterinario');

// Usar rutas (remove duplicate routes)
app.use('/', authRoutes);
app.use('/citas', citasRoutes);
app.use('/chat', chatRoutes);
app.use('/veterinario', veterinarioRoutes);

// Socket.io para chat
// Socket.io para chat
io.on('connection', socket => {
  console.log('Usuario conectado');

  socket.on('chat message', async (data) => {
    const { fromUserId, toUserId, fromUserName, msg, sesionId } = data;
    const room = [fromUserId, toUserId].sort().join('_');

    try {
      const pool = await poolPromise;

      // First verify if session exists, if not create it
      const sessionResult = await pool.request()
        .input('idCliente', fromUserId)
        .input('idVeterinario', toUserId)
        .query(`
          DECLARE @idSesion INT;
          
          -- Check if session exists
          SELECT @idSesion = id 
          FROM ChatSesiones 
          WHERE (id_cliente = @idCliente AND id_veterinario = @idVeterinario)
             OR (id_cliente = @idVeterinario AND id_veterinario = @idCliente)
          AND estado = 'activo';
          
          -- If no session exists, create one
          IF @idSesion IS NULL
          BEGIN
            INSERT INTO ChatSesiones (id_cliente, id_veterinario, estado)
            VALUES (@idCliente, @idVeterinario, 'activo');
            SET @idSesion = SCOPE_IDENTITY();
          END;
          
          SELECT @idSesion as id;
        `);

      const chatSesionId = sessionResult.recordset[0].id;

      // Now insert the message using the confirmed session ID
      await pool.request()
        .input('idSesion', chatSesionId)
        .input('idEmisor', fromUserId)
        .input('mensaje', msg)
        .query(`
          INSERT INTO ChatMensajes (id_sesion, id_emisor, mensaje)
          VALUES (@idSesion, @idEmisor, @mensaje)
        `);

      // Update last message timestamp
      await pool.request()
        .input('idSesion', chatSesionId)
        .query(`
          UPDATE ChatSesiones 
          SET fecha_ultimo_mensaje = GETDATE()
          WHERE id = @idSesion
        `);

      // Send message to room with confirmed session ID
      // Emitir al emisor con "Tú"
        socket.emit('chat message', {
          ...data,
          fromUserName: 'Tú',
          sesionId: chatSesionId
        });

        // Emitir al receptor con el nombre real del emisor
        socket.to(room).emit('chat message', {
          ...data,
          fromUserName: data.fromUserName,
          sesionId: chatSesionId
        });


    } catch (err) {
      console.error('Error guardando mensaje:', err);
      socket.emit('chat error', { message: 'Error al enviar el mensaje' });
    }
  });

  // Update the join handler in app.js
  socket.on('join', async ({ userId, veterinarioId, clienteId }) => {
    const room = [veterinarioId, clienteId].sort().join('_');
    socket.join(room);
    console.log(`Socket ${socket.id} unido a la sala ${room}`);

    try {
      const pool = await poolPromise;
      const sessionResult = await pool.request()
        .input('idCliente', clienteId)
        .input('idVeterinario', veterinarioId)
        .query(`
        DECLARE @idSesion INT;
        
        SELECT @idSesion = id 
        FROM ChatSesiones 
        WHERE id_cliente = @idCliente 
        AND id_veterinario = @idVeterinario 
        AND estado = 'activo';
        
        IF @idSesion IS NULL
        BEGIN
          INSERT INTO ChatSesiones (id_cliente, id_veterinario, estado)
          VALUES (@idCliente, @idVeterinario, 'activo');
          SET @idSesion = SCOPE_IDENTITY();
        END
        
        SELECT @idSesion AS id;
      `);

      const newSesionId = sessionResult.recordset[0].id;
      socket.emit('session_created', { sesionId: newSesionId });

    } catch (err) {
      console.error('Error managing chat session:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado');
  });
});

// Ruta raíz que redirige al login
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Configuración de sesiones (asegúrate de que ya esté configurado)
app.use(session({
  secret: 'vetcare_secret', // Usa el mismo valor que en tu archivo .env
  resave: false,
  saveUninitialized: true,
}));

// Ruta para cerrar sesión
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error al cerrar sesión:', err);
      return res.status(500).send('Error al cerrar sesión');
    }
    res.redirect('/login'); // Redirige al login después de cerrar sesión
  });
});

// Configuración del servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});