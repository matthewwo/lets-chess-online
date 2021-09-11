const socket = io()

document.body.addEventListener('touchmove', function(e){
  document.getElementsByTagName('body')[0]. style .height = "100vh";
  document.getElementsByTagName('body')[0]. style. overflow = "hidden";
});

let currentTurn = 'red';

function onRestartPressed() {
  if (confirm('確認重新棋局嗎？')) {
    socket.emit('restart game');
  }
}

function onRevertPressed() {
  if (confirm('確認悔棋嗎？')) {
    socket.emit('revert step');
  }
}

function onDrop (source, target, piece, newPos, oldPos) {
  if (!_.isEqual(newPos, oldPos)) {
    socket.emit('new board position', Xiangqiboard.objToFen(newPos));
  }
}

function onDragStart (source, piece) {
  if ((piece.startsWith('r') && currentTurn === 'black') || (piece.startsWith('b') && currentTurn === 'red')) {
    return false;
  }
}

const config = {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
};
const board = Xiangqiboard('myBoard', config);

socket.on('refresh state', ({ position, turn }) => {
  if (position) {
    board.position(position)
  }
  currentTurn = turn;

  const indicator = document.getElementById('turn-indicator');
  indicator.innerText = currentTurn === 'red' ? '紅棋回合' : '黑棋回合';
  indicator.style.color = currentTurn;
});

socket.on('number of users connected', (people) => {
  const indicator = document.getElementById('people-count-indicator');
  indicator.innerText = people + ' 人在線';
})
