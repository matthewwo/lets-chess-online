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
const saveHistory = () => {
  client.query(`UPDATE storage SET value = $1 WHERE key = 'history'`, [{ 'position': history, 'turn': currentTurn }])
};

function push(array, item, length) {
  array.unshift(item) > length ?  array.pop() : null
  saveHistory();
}

const connectedUsers = new Set();

io.on('connection', (socket) => {
  if (history.length > 0) {
    socket.emit('refresh state', { position: history[0], turn: currentTurn });
  }

  connectedUsers.add(socket.id);

  socket.emit('number of users connected', connectedUsers.size);
  socket.broadcast.emit('number of users connected', connectedUsers.size);

  socket.on('new board position', (position) => {
    currentTurn = currentTurn === 'red' ? 'black' : 'red';
    push(history, position, historySize);
    socket.emit('refresh state', { position, turn: currentTurn });
    socket.broadcast.emit('refresh state', { position, turn: currentTurn });
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
    storedHistory = row.value.position;
    currentTurn = row.value.turn;
  }

  if (storedHistory && storedHistory.length > 1) {
    history = Array.from(storedHistory);
  } else {
    saveHistory();
  }

  server.listen((process.env.PORT || 3000), () => {
    console.log('server is ready');
  });
});
