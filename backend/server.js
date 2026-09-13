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

// Route de test
app.get('/', (req, res) => {
  res.send('Backend Codejoueur fonctionne !');
});

// Gestion des connexions Socket.io
io.on('connection', (socket) => {
  console.log('Un joueur est connecté :', socket.id);

  socket.on('disconnect', () => {
    console.log('Joueur déconnecté :', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
