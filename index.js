const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

const historySize = 20;
const history = ['start'];
function push(array, item, length) {
  array.unshift(item) > length ?  array.pop() : null
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
    console.log(history)
    if (history.length > 1) {
      history.pop();
    }

    const position = history[0];
    console.log(position);
    socket.emit('refresh position', position);
  });

  socket.on('restart game', () => {
    history.splice(0, history.length);
    socket.emit('refresh position', 'start');
    push(history, 'start', historySize);
  });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});
