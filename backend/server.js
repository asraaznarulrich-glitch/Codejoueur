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

// Stockage des salles en mémoire
const rooms = {};

app.get('/', (req, res) => {
  res.send('Backend Codejoueur fonctionne !');
});

io.on('connection', (socket) => {
  console.log('Joueur connecté :', socket.id);

  // Créer une salle
  socket.on('createRoom', (callback) => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms[roomCode] = {
      players: [{ id: socket.id, name: 'Joueur 1' }],
      host: socket.id
    };
    socket.join(roomCode);
    callback({ roomCode, success: true });
    console.log('Salle créée :', roomCode);
  });

  // Rejoindre une salle
  socket.on('joinRoom', ({ roomCode, playerName }, callback) => {
    if (!rooms[roomCode]) {
      callback({ success: false, message: 'Salle introuvable' });
      return;
    }

    rooms[roomCode].players.push({ id: socket.id, name: playerName || 'Joueur' });
    socket.join(roomCode);

    // Prévenir les autres joueurs
    io.to(roomCode).emit('playerJoined', rooms[roomCode].players);

    callback({ success: true, players: rooms[roomCode].players });
  });

  socket.on('disconnect', () => {
    console.log('Joueur déconnecté :', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
