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

// Problème de la première manche
const problem1 = {
  id: 1,
  title: "Manche 1 - Addition",
  statement: "Écris une fonction add(a, b) qui retourne la somme de a et b.\n\nExemple :\nadd(2, 3) doit retourner 5",
  // Pour la validation simple (MVP)
  test: (code) => {
    try {
      // On crée la fonction à partir du code du joueur
      const func = new Function(code + "; return add;");
      const add = func();
      if (typeof add !== "function") return { success: false, message: "Tu dois créer une fonction appelée add" };
      if (add(2, 3) !== 5) return { success: false, message: "add(2, 3) devrait retourner 5" };
      if (add(10, 5) !== 15) return { success: false, message: "add(10, 5) devrait retourner 15" };
      return { success: true, message: "Bravo ! Solution correcte" };
    } catch (err) {
      return { success: false, message: "Erreur dans ton code : " + err.message };
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
      players: [{ id: socket.id, name: playerName || 'Joueur 1' }],
      host: socket.id,
      started: false
    };
    socket.join(roomCode);
    callback({ success: true, roomCode, players: rooms[roomCode].players });
  });

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
    callback({ success: true, players: room.players });
  });

  socket.on('startGame', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.host !== socket.id) return;

    room.started = true;
    io.to(roomCode).emit('gameStarted', problem1);
  });

  // Soumission de solution
  socket.on('submitSolution', ({ roomCode, code }, callback) => {
    const result = problem1.test(code);
    callback(result);

    if (result.success) {
      // On prévient tout le monde qu'un joueur a réussi
      io.to(roomCode).emit('playerSolved', { playerId: socket.id });
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
