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

// Liste des manches (on commencera avec 2, on en ajoutera après)
const problems = [
  {
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
  },
  {
    id: 2,
    title: "Manche 2 - Multiplication",
    statement: "Écris une fonction multiply(a, b) qui retourne le produit de a et b.\n\nExemple :\nmultiply(4, 5) → 20",
    duration: 180,
    test: (code) => {
      try {
        const func = new Function(code + "; return multiply;");
        const multiply = func();
        if (typeof multiply !== "function") return { success: false, message: "Tu dois créer une fonction appelée multiply" };
        if (multiply(4, 5) !== 20) return { success: false, message: "multiply(4, 5) devrait retourner 20" };
        if (multiply(3, 7) !== 21) return { success: false, message: "multiply(3, 7) devrait retourner 21" };
        return { success: true, message: "Bravo ! Solution correcte" };
      } catch (err) {
        return { success: false, message: "Erreur : " + err.message };
      }
    }
  }
];

app.get('/', (req, res) => {
  res.send('Backend Codejoueur fonctionne !');
});

io.on('connection', (socket) => {
  console.log('Joueur connecté :', socket.id);

  // Créer une salle
  socket.on('createRoom', ({ playerName }, callback) => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms[roomCode] = {
      players: [{ id: socket.id, name: playerName || 'Joueur 1', solved: false, eliminated: false }],
      host: socket.id,
      started: false,
      currentRound: 0,
      timeLeft: 0,
      timer: null
    };
    socket.join(roomCode);
    callback({ success: true, roomCode, players: rooms[roomCode].players });
  });

  // Rejoindre une salle
  socket.on('joinRoom', ({ roomCode, playerName }, callback) => {
    const room = rooms[roomCode];
    if (!room) return callback({ success: false, message: 'Salle introuvable' });
    if (room.started) return callback({ success: false, message: 'La partie a déjà commencé' });

    room.players.push({ id: socket.id, name: playerName || 'Joueur', solved: false, eliminated: false });
    socket.join(roomCode);
    io.to(roomCode).emit('playerJoined', room.players);
    callback({ success: true, players: room.players });
  });

  // Lancer la partie (passe à la première manche)
  socket.on('startGame', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.host !== socket.id) return;

    room.started = true;
    startRound(roomCode, 0);
  });

  // Soumettre une solution
  socket.on('submitSolution', ({ roomCode, code }, callback) => {
    const room = rooms[roomCode];
    if (!room || !room.started) return;

    const problem = problems[room.currentRound];
    if (!problem) return;

    const result = problem.test(code);
    callback(result);

    if (result.success) {
      const player = room.players.find(p => p.id === socket.id);
      if (player && !player.solved) {
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

// Fonction pour démarrer une manche
function startRound(roomCode, roundIndex) {
  const room = rooms[roomCode];
  if (!room) return;

  // Reset solved pour les joueurs encore en course
  room.players.forEach(p => {
    if (!p.eliminated) p.solved = false;
  });

  room.currentRound = roundIndex;
  const problem = problems[roundIndex];
  if (!problem) {
    // Plus de manches → fin de partie
    io.to(roomCode).emit('gameOver', { players: room.players });
    return;
  }

  room.timeLeft = problem.duration;

  io.to(roomCode).emit('roundStarted', {
    problem,
    timeLeft: room.timeLeft,
    players: room.players,
    roundNumber: roundIndex + 1
  });

  // Chronomètre
  if (room.timer) clearInterval(room.timer);

  room.timer = setInterval(() => {
    room.timeLeft--;
    io.to(roomCode).emit('timerUpdate', room.timeLeft);

    if (room.timeLeft <= 0) {
      clearInterval(room.timer);
      endRound(roomCode);
    }
  }, 1000);
}

// Fin de manche → élimination
function endRound(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  room.players.forEach(p => {
    if (!p.solved && !p.eliminated) {
      p.eliminated = true;
    }
  });

  const survivors = room.players.filter(p => !p.eliminated);
  const eliminated = room.players.filter(p => p.eliminated);

  io.to(roomCode).emit('roundEnded', {
    survivors,
    eliminated,
    players: room.players
  });

  // Si il reste des joueurs, on passe à la manche suivante après 5 secondes
  if (survivors.length > 0 && room.currentRound + 1 < problems.length) {
    setTimeout(() => {
      startRound(roomCode, room.currentRound + 1);
    }, 5000);
  } else {
    // Fin de la partie
    setTimeout(() => {
      io.to(roomCode).emit('gameOver', { players: room.players });
    }, 5000);
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
