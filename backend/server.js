const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const rooms = {};

app.get('/', (req, res) => {
  res.send('Backend Codejoueur fonctionne !');
});

io.on('connection', (socket) => {
  console.log('Joueur connecté :', socket.id);

  // Créer une salle
  socket.on('createRoom', ({ playerName }, callback) => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    rooms[roomCode] = {
      players: [{ id: socket.id, name: playerName || 'Joueur 1' }],
      host: socket.id,
      started: false
    };

    socket.join(roomCode);
    callback({ success: true, roomCode, players: rooms[roomCode].players });
    console.log('Salle créée :', roomCode);
  });

  // Rejoindre une salle
  socket.on('joinRoom', ({ roomCode, playerName }, callback) => {
    const room = rooms[roomCode];

    if (!room) {
      callback({ success: false, message: 'Salle introuvable' });
      return;
    }

    if (room.started) {
      callback({ success: false, message: 'La partie a déjà commencé' });
      return;
    }

    room.players.push({ id: socket.id, name: playerName || 'Joueur' });
    socket.join(roomCode);

    io.to(roomCode).emit('playerJoined', room.players);
    callback({ success: true, players: room.players, isHost: false });
  });

  // Lancer la partie
  socket.on('startGame', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;

    if (room.host !== socket.id) return; // seul le host peut lancer

    room.started = true;
    io.to(roomCode).emit('gameStarted');
  });

  socket.on('disconnect', () => {
    console.log('Joueur déconnecté :', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
