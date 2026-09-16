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

const problem1 = {
  id: 1,
  title: "Manche 1 - Addition",
  statement: "Écris une fonction add(a, b) qui retourne la somme de a et b.\n\nExemple :\nadd(2, 3) → 5",
  duration: 180, // 3 minutes
  test: (code) => {
    try {
      const func = new Function(code + "; return add;");
      const add = func();
      if (typeof add !== "function") return { success: false, message: "Tu dois créer une fonction appelée add" };
      if (add(2, 3) !== 5) return { success: false, message: "add(2, 3) devrait retourner 5" };
      if (add(10, 5) !== 15) return { success: false, message: "add(10, 5) devrait retourner 15" };
      return { success: true, message: "Bravo ! Solution correcte" };
    } catch (err) {
      return { success: false, message: "Erreur : " + err.message };
    }
  }
};

app.get('/', (req, res) => {
  res.send('Backend Codejoueur fonctionne !');
});

io.on('connection', (socket) => {
  console.log('Joueur connecté :', socket.id);

  socket.on('createRoom', ({ playerName }, callback) => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms[roomCode] = {
      players: [{ id: socket.id, name: playerName || 'Joueur 1', solved: false }],
      host: socket.id,
      started: false,
      problem: null,
      timeLeft: 0
    };
    socket.join(roomCode);
    callback({ success: true, roomCode, players: rooms[roomCode].players });
  });

  socket.on('joinRoom', ({ roomCode, playerName }, callback) => {
    const room = rooms[roomCode];
    if (!room) return callback({ success: false, message: 'Salle introuvable' });
    if (room.started) return callback({ success: false, message: 'La partie a déjà commencé' });

    room.players.push({ id: socket.id, name: playerName || 'Joueur', solved: false });
    socket.join(roomCode);
    io.to(roomCode).emit('playerJoined', room.players);
    callback({ success: true, players: room.players });
  });

  socket.on('startGame', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.host !== socket.id) return;

    room.started = true;
    room.problem = problem1;
    room.timeLeft = problem1.duration;

    io.to(roomCode).emit('gameStarted', {
      problem: problem1,
      timeLeft: room.timeLeft,
      players: room.players
    });

    // Chronomètre
    const timer = setInterval(() => {
      room.timeLeft--;
      io.to(roomCode).emit('timerUpdate', room.timeLeft);

      if (room.timeLeft <= 0) {
        clearInterval(timer);
        const eliminated = room.players.filter(p => !p.solved);
        const survivors = room.players.filter(p => p.solved);

        io.to(roomCode).emit('roundEnded', {
          survivors,
          eliminated
        });
      }
    }, 1000);
  });

  socket.on('submitSolution', ({ roomCode, code }, callback) => {
    const room = rooms[roomCode];
    if (!room) return;

    const result = problem1.test(code);
    callback(result);

    if (result.success) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.solved = true;
        io.to(roomCode).emit('playerSolved', {
          playerId: socket.id,
          players: room.players
        });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Joueur déconnecté :', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
