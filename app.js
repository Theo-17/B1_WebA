const express = require('express');
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const chatRouter = require('./routes/chat');
const veterinarioRouter = require('./routes/veterinario');


dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

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
app.use('/', veterinarioRouter);
app.use('/chat', chatRouter);


// Importar rutas
const authRoutes = require('./routes/auth');
const citasRoutes = require('./routes/citas');
const chatRoutes = require('./routes/chat');

// Usar rutas
app.use('/', authRoutes);
app.use('/citas', citasRoutes);
app.use('/chat', chatRouter);

// Ruta raíz: redirige a login
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Socket.io para chat
io.on('connection', socket => {
  console.log('Usuario conectado');

  socket.on('join', ({ userId, veterinarioId }) => {
    // Creamos un nombre único de sala para la conversación (ordenamos los ids para que sea igual para ambos)
    const room = [userId, veterinarioId].sort().join('_');
    socket.join(room);
    console.log(`Socket ${socket.id} unido a la sala ${room}`);
  });

  socket.on('chat message', data => {
    const { fromUserId, toUserId, fromUserName, msg } = data;
    const room = [fromUserId, toUserId].sort().join('_');
    // Emitimos solo en la sala correcta
    io.to(room).emit('chat message', data);
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

