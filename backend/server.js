const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
app.use(cors());
app.use(express.json());

const rooms = {};

const problems = [
  {
    id: 1,
    title: 'Manche 1 - Addition',
    statement: 'Écris une fonction add(a, b) qui retourne la somme de a et b.\n\nExemple :\nadd(2, 3) → 5',
    duration: 180,
    test: code => {
      try {
        const func = new Function(code + '; return add;');
        const add = func();
        if (typeof add !== 'function') return { success: false, message: 'Tu dois créer une fonction appelée add' };
        if (add(2, 3) !== 5) return { success: false, message: 'add(2, 3) devrait retourner 5' };
        if (add(10, 5) !== 15) return { success: false, message: 'add(10, 5) devrait retourner 15' };
        return { success: true, message: 'Bravo ! Solution correcte' };
      } catch (err) { return { success: false, message: 'Erreur : ' + err.message }; }
    }
  },
  {
    id: 2,
    title: 'Manche 2 - Multiplication',
    statement: 'Écris une fonction multiply(a, b) qui retourne le produit de a et b.\n\nExemple :\nmultiply(4, 5) → 20',
    duration: 180,
    test: code => {
      try {
        const func = new Function(code + '; return multiply;');
        const multiply = func();
        if (typeof multiply !== 'function') return { success: false, message: 'Tu dois créer une fonction appelée multiply' };
        if (multiply(4, 5) !== 20) return { success: false, message: 'multiply(4, 5) devrait retourner 20' };
        if (multiply(3, 7) !== 21) return { success: false, message: 'multiply(3, 7) devrait retourner 21' };
        return { success: true, message: 'Bravo ! Solution correcte' };
      } catch (err) { return { success: false, message: 'Erreur : ' + err.message }; }
    }
  }
];

function shuffledRoundOrder() {
  const order = problems.map((_, index) => index);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

function publicProblem(problem) {
  if (!problem) return null;
  return { id: problem.id, title: problem.title, statement: problem.statement, duration: problem.duration };
}

app.get('/', (req, res) => res.send('Backend Codejoueur fonctionne !'));

io.on('connection', socket => {
  console.log('Joueur connecté :', socket.id);

  socket.on('createRoom', ({ playerName }, callback) => {
    let roomCode;
    do { roomCode = Math.random().toString(36).substring(2, 8).toUpperCase(); } while (rooms[roomCode]);
    rooms[roomCode] = {
      players: [{ id: socket.id, name: playerName || 'Joueur 1', solved: false, eliminated: false, incorrectAttempts: 0, mode: 'player', pendingChoice: false }],
      host: socket.id, started: false, currentRound: -1, roundPosition: -1,
      roundOrder: shuffledRoundOrder(), timeLeft: 0, timer: null
    };
    socket.join(roomCode);
    callback({ success: true, roomCode, players: rooms[roomCode].players });
  });

  socket.on('joinRoom', ({ roomCode, playerName }, callback) => {
    const room = rooms[roomCode];
    if (!room) return callback({ success: false, message: 'Salle introuvable' });
    if (room.started && room.timeLeft <= 0) return callback({ success: false, message: 'La manche est terminée, attends la prochaine manche' });
    const player = { id: socket.id, name: playerName || 'Joueur', solved: false, eliminated: false, incorrectAttempts: 0, mode: 'player', pendingChoice: false };
    room.players.push(player); socket.join(roomCode);
    io.to(roomCode).emit('playerJoined', room.players);
    callback({ success: true, players: room.players, started: room.started });
    if (room.started && room.timeLeft > 0) socket.emit('roundStarted', { problem: publicProblem(problems[room.currentRound]), timeLeft: room.timeLeft, players: room.players, roundNumber: room.roundPosition + 1 });
  });

  socket.on('startGame', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.host !== socket.id) return;
    room.started = true;
    room.roundOrder = shuffledRoundOrder();
    startRound(roomCode, 0);
  });

  socket.on('submitSolution', ({ roomCode, code }, callback = () => {}) => {
    const room = rooms[roomCode];
    if (!room || !room.started) return callback({ success: false, message: "La partie n'a pas encore commencé" });
    if (room.timeLeft <= 0) return callback({ success: false, message: 'Le temps de la manche est écoulé' });
    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.eliminated || player.mode !== 'player') return callback({ success: false, message: 'Tu ne participes plus à cette manche' });
    if (player.pendingChoice) return callback({ success: false, message: 'Choisis ton mode pour continuer' });
    if (player.solved) return callback({ success: false, message: 'Ta solution est déjà validée' });
    const problem = problems[room.currentRound];
    const result = problem.test(code);
    if (!result.success) {
      player.incorrectAttempts++;
      if (player.incorrectAttempts >= 2) {
        player.pendingChoice = true;
        callback({ ...result, attempts: player.incorrectAttempts, chooseMode: true });
        socket.emit('chooseEliminationMode', {
          attempts: player.incorrectAttempts,
          previousRounds: room.roundOrder.slice(0, room.roundPosition).map(index => publicProblem(problems[index]))
        });
        return;
      }
    }
    callback({ ...result, attempts: player.incorrectAttempts });
    if (result.success) {
      player.solved = true;
      io.to(roomCode).emit('playerSolved', { playerId: socket.id, players: room.players });
    }
  });

  socket.on('choosePlayerMode', ({ roomCode, mode }) => {
    const room = rooms[roomCode];
    const player = room && room.players.find(p => p.id === socket.id);
    if (!room || !player || !player.pendingChoice || !['spectator', 'explorer'].includes(mode)) return;
    player.pendingChoice = false; player.mode = mode; player.eliminated = true;
    socket.emit('playerModeChanged', { mode, previousRounds: room.roundOrder.slice(0, room.roundPosition).map(index => publicProblem(problems[index])) });
    io.to(roomCode).emit('playerStatusChanged', { players: room.players });
  });

  socket.on('exploreRound', ({ roomCode, roundId }) => {
    const room = rooms[roomCode];
    const player = room && room.players.find(p => p.id === socket.id);
    if (!room || !player || player.mode !== 'explorer') return;
    const index = room.roundOrder.findIndex(problemIndex => problems[problemIndex].id === Number(roundId));
    if (index < 0 || index >= room.roundPosition) return;
    socket.emit('roundPreview', { problem: publicProblem(problems[room.roundOrder[index]]), roundNumber: index + 1 });
  });

  socket.on('disconnect', () => console.log('Joueur déconnecté :', socket.id));
});

function startRound(roomCode, position) {
  const room = rooms[roomCode];
  if (!room) return;
  const problemIndex = room.roundOrder[position];
  const problem = problems[problemIndex];
  if (!problem) return io.to(roomCode).emit('gameOver', { players: room.players });
  room.roundPosition = position; room.currentRound = problemIndex; room.timeLeft = problem.duration;
  room.players.forEach(p => { if (!p.eliminated) { p.solved = false; p.incorrectAttempts = 0; p.pendingChoice = false; } });
  io.to(roomCode).emit('roundStarted', { problem: publicProblem(problem), timeLeft: room.timeLeft, players: room.players, roundNumber: position + 1 });
  if (room.timer) clearInterval(room.timer);
  room.timer = setInterval(() => {
    room.timeLeft--; io.to(roomCode).emit('timerUpdate', room.timeLeft);
    if (room.timeLeft <= 0) { clearInterval(room.timer); endRound(roomCode); }
  }, 1000);
}

function endRound(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;
  room.players.forEach(p => { if (!p.solved && !p.eliminated && p.mode === 'player') p.eliminated = true; });
  const survivors = room.players.filter(p => !p.eliminated && p.mode === 'player');
  io.to(roomCode).emit('roundEnded', { survivors, eliminated: room.players.filter(p => p.eliminated), players: room.players });
  if (survivors.length > 0 && room.roundPosition + 1 < room.roundOrder.length) {
    setTimeout(() => startRound(roomCode, room.roundPosition + 1), 5000);
  } else setTimeout(() => io.to(roomCode).emit('gameOver', { players: room.players }), 5000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
