const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const ivm = require('isolated-vm');

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

// ---------------------------------------------------------------------------
// SANDBOX SÉCURISÉ : exécute le code du joueur dans un V8 Isolate séparé.
// Aucun accès à require, process, fs, réseau, etc. Timeout strict.
// ---------------------------------------------------------------------------

const SANDBOX_TIMEOUT_MS = 1000; // 1 seconde max d'exécution
const SANDBOX_MEMORY_LIMIT_MB = 8; // très large pour add/multiply

/**
 * Exécute le code du joueur dans un isolate séparé, puis appelle la fonction
 * nommée `functionName` avec `args`, et compare le résultat à `expected`.
 * Retourne { success, message } — ne lève jamais d'exception vers l'appelant.
 */
async function runInSandbox(code, functionName, testCases) {
  let isolate;
  try {
    isolate = new ivm.Isolate({ memoryLimit: SANDBOX_MEMORY_LIMIT_MB });
    const context = await isolate.createContext();
    const jail = context.global;
    await jail.set('global', jail.derefInto());

    // On construit un script qui : définit la fonction du joueur, puis
    // exécute chaque cas de test et renvoie un tableau de résultats en JSON.
    // Tout est stringifié — aucune référence d'objet ne traverse la frontière,
    // ce qui évite la classe de faille "glue code" mentionnée dans les CVEs récentes.
    const testRunner = `
      ${code}
      (function() {
        if (typeof ${functionName} !== "function") {
          return JSON.stringify({ error: "NOT_A_FUNCTION" });
        }
        const cases = ${JSON.stringify(testCases)};
        const results = [];
        for (const c of cases) {
          try {
            const result = ${functionName}(...c.args);
            results.push(result === c.expected);
          } catch (e) {
            results.push(false);
          }
        }
        return JSON.stringify({ results });
      })()
    `;

    const script = await isolate.compileScript(testRunner);
    const rawResult = await script.run(context, { timeout: SANDBOX_TIMEOUT_MS });
    const parsed = JSON.parse(rawResult);

    if (parsed.error === "NOT_A_FUNCTION") {
      return { success: false, message: `Tu dois créer une fonction appelée ${functionName}` };
    }

    const allPassed = parsed.results.every(r => r === true);
    if (allPassed) {
      return { success: true, message: "Bravo ! Solution correcte" };
    }

    const firstFailIndex = parsed.results.findIndex(r => r === false);
    const failedCase = testCases[firstFailIndex];
    return {
      success: false,
      message: `${functionName}(${failedCase.args.join(", ")}) devrait retourner ${failedCase.expected}`
    };

  } catch (err) {
    // Timeout, erreur de syntaxe, dépassement mémoire, etc.
    if (err instanceof ivm.Script.TimeoutError || /timeout/i.test(err.message)) {
      return { success: false, message: "Ton code prend trop de temps à s'exécuter (boucle infinie ?)" };
    }
    return { success: false, message: "Erreur dans ton code : " + err.message };
  } finally {
    // Toujours libérer l'isolate, même en cas d'erreur, pour éviter les fuites mémoire
    if (isolate) isolate.dispose();
  }
}

// ---------------------------------------------------------------------------
// Définition des manches. `test` est maintenant async et délègue au sandbox.
// ---------------------------------------------------------------------------

const problems = [
  {
    id: 1,
    title: "Manche 1 - Addition",
    statement: "Écris une fonction add(a, b) qui retourne la somme de a et b.\n\nExemple :\nadd(2, 3) → 5",
    duration: 180,
    test: (code) => runInSandbox(code, "add", [
      { args: [2, 3], expected: 5 },
      { args: [10, 5], expected: 15 },
      { args: [-4, 4], expected: 0 }
    ])
  },
  {
    id: 2,
    title: "Manche 2 - Multiplication",
    statement: "Écris une fonction multiply(a, b) qui retourne le produit de a et b.\n\nExemple :\nmultiply(4, 5) → 20",
    duration: 180,
    test: (code) => runInSandbox(code, "multiply", [
      { args: [4, 5], expected: 20 },
      { args: [3, 7], expected: 21 },
      { args: [0, 9], expected: 0 }
    ])
  }
];

app.get('/', (req, res) => {
  res.send('Backend Codejoueur fonctionne !');
});

io.on('connection', (socket) => {
  console.log('Joueur connecté :', socket.id);

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

  socket.on('joinRoom', ({ roomCode, playerName }, callback) => {
    const room = rooms[roomCode];
    if (!room) return callback({ success: false, message: 'Salle introuvable' });
    if (room.started) return callback({ success: false, message: 'La partie a déjà commencé' });

    room.players.push({ id: socket.id, name: playerName || 'Joueur', solved: false, eliminated: false });
    socket.join(roomCode);
    io.to(roomCode).emit('playerJoined', room.players);
    callback({ success: true, players: room.players });
  });

  socket.on('startGame', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.host !== socket.id) return;

    room.started = true;
    startRound(roomCode, 0);
  });

  // Soumettre une solution — maintenant async à cause du sandbox
  socket.on('submitSolution', async ({ roomCode, code }, callback) => {
    const room = rooms[roomCode];
    if (!room || !room.started) return;

    const problem = problems[room.currentRound];
    if (!problem) return;

    // Garde-fou basique sur la taille du code envoyé
    if (typeof code !== 'string' || code.length > 5000) {
      return callback({ success: false, message: "Code invalide ou trop long" });
    }

    const result = await problem.test(code);
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

function startRound(roomCode, roundIndex) {
  const room = rooms[roomCode];
  if (!room) return;

  room.players.forEach(p => {
    if (!p.eliminated) p.solved = false;
  });

  room.currentRound = roundIndex;
  const problem = problems[roundIndex];
  if (!problem) {
    io.to(roomCode).emit('gameOver', { players: room.players });
    return;
  }

  room.timeLeft = problem.duration;

  io.to(roomCode).emit('roundStarted', {
    problem: { id: problem.id, title: problem.title, statement: problem.statement, duration: problem.duration },
    timeLeft: room.timeLeft,
    players: room.players,
    roundNumber: roundIndex + 1
  });

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

  if (survivors.length > 0 && room.currentRound + 1 < problems.length) {
    setTimeout(() => {
      startRound(roomCode, room.currentRound + 1);
    }, 5000);
  } else {
    setTimeout(() => {
      io.to(roomCode).emit('gameOver', { players: room.players });
    }, 5000);
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
