const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

await client.connect();

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

const historySize = 20;
let history = ['start'];
const saveHistory = () => {
  client.query(`UPDATE storage SET value = $1 WHERE key = 'history'`, [JSON.stringify(history)])
};

function push(array, item, length) {
  array.unshift(item) > length ?  array.pop() : null

  saveHistory();
}

io.on('connection', (socket) => {
  if (history.length > 0) {
    socket.emit('refresh position', history[0]);
  }

  socket.on('new board position', (position) => {
    push(history, position, historySize);
    socket.broadcast.emit('refresh position', position);
  });

  socket.on('revert step', () => {
    if (history.length > 1) {
      history.shift();
    }

    const position = history[0];
    socket.emit('refresh position', position);
  });

  socket.on('restart game', () => {
    history.splice(0, history.length);
    socket.emit('refresh position', 'start');
    push(history, 'start', historySize);
  });
});

client.query(`SELECT value FROM storage WHERE key = 'history'`, (err, res) => {
  let storedHistory = ['start'];
  if (err) throw err;
  for (let row of res.rows) {
    storedHistory = row.value;
  }

  history = storedHistory;

  server.listen((process.env.PORT || 3000), () => {
    console.log('server is ready');
  });
});
