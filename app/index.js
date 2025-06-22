import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Client } = require('pg');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV ? {
    rejectUnauthorized: false
  } : false
});

await client.connect();

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

const historySize = 20;
let history = ['start'];
let currentTurn = 'red';
let lastMove = [];
const saveHistory = () => {
  client.query(`INSERT INTO storage (key, value) VALUES ('history', $1) ON CONFLICT (key) DO UPDATE SET value = $1`, [{ 'position': history, 'turn': currentTurn, 'lastMove': lastMove }])
};

function push(array, item, length) {
  array.unshift(item) > length ?  array.pop() : null
  saveHistory();
}

const connectedUsers = new Set();

io.on('connection', (socket) => {
  if (history.length > 0) {
    socket.emit('refresh state', { position: history[0], turn: currentTurn, lastMove, });
  }

  connectedUsers.add(socket.id);

  socket.emit('number of users connected', connectedUsers.size);
  socket.broadcast.emit('number of users connected', connectedUsers.size);

  socket.on('make move', (source, target, position) => {
    currentTurn = currentTurn === 'red' ? 'black' : 'red';
    lastMove = [source, target];
    push(history, position, historySize);
    socket.emit('refresh state', { position, turn: currentTurn, lastMove });
    socket.broadcast.emit('refresh state', { position, turn: currentTurn, lastMove });
  });

  socket.on('revert step', () => {
    if (history.length > 1) {
      history.shift();
    }

    const position = history[0];
    currentTurn = currentTurn === 'red' ? 'black' : 'red';
    saveHistory();
    socket.emit('refresh state', { position, turn: currentTurn });
    socket.broadcast.emit('refresh state', { position, turn: currentTurn });
  });

  socket.on('restart game', () => {
    history.splice(0, history.length);
    socket.emit('refresh state', { position: 'start', turn: 'red' });
    socket.broadcast.emit('refresh state', { position: 'start', turn: 'red' });
    push(history, 'start', historySize);
  });


  socket.on('disconnect', () => {
    connectedUsers.delete(socket.id);
    socket.broadcast.emit('number of users connected', connectedUsers.size);
  });
});

client.query(`SELECT value FROM storage WHERE key = 'history'`, (err, res) => {
  let storedHistory = ['start'];
  if (err) throw err;
  for (let row of res.rows) {
    storedHistory = row.value.position ?? ['start'];
    currentTurn = row.value.turn ?? 'red';
    lastMove = row.value.lastMove ?? [];
  }

  if (storedHistory && storedHistory.length > 1) {
    history = Array.from(storedHistory);
  }

  server.listen((process.env.PORT || 3000), () => {
    console.log('server is ready');
  });
});
