const socket = io();

document.body.addEventListener('touchmove', function(e){
  document.getElementsByTagName('body')[0]. style .height = "100vh";
  document.getElementsByTagName('body')[0]. style. overflow = "hidden";
});

function onChange (oldPos, newPos) {
  if (newPos !== oldPos) {
    console.log('emitting')
    socket.emit('new board position', Xiangqiboard.objToFen(newPos));
  }
}

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

function onDrop (source, target, piece, newPos, oldPos, orientation) {
  socket.emit('new board position', Xiangqiboard.objToFen(newPos));
}


const config = {
  draggable: true,
  position: 'start',
  // onChange: onChange,
  onDrop: onDrop
};
const board = Xiangqiboard('myBoard', config);

socket.on('refresh position', (position) => {
  if (position) {
    board.position(position)
  }
});
