var board, game, username, player, canMove = false, chan = location.pathname == "/" ? null : location.pathname.substr(1), socket = io();

$('html, body').on('touchstart touchmove', function(e){ 
     e.preventDefault(); 
});

socket.on('waiting', function(data) {
	chan = data.chan;
	$('#joinLink').html('<a href="/'+chan+'">' + location.host + '/' + chan + '</a>');
});

socket.on('hostLeft', function(data) {
  canMove = false;
});

socket.on('playerLeft', function(data) {
  canMove = false;
});

socket.on('newBoard', function(data) {
  player = data.color;
	initBoard(data.pos, data.game);
	updateStatus();
});

socket.on('newUser', function(data) {
  $('#p1').html(data.user);
});

socket.on('player1', function(data) {
  $('#p1').html(data.user);
  canMove = true;
  if (player == 'white') start();
});

socket.on('ready', function(data) {
  canMove = true;
  if (player == 'white') start();
});

socket.on('reload', function() {
  console.log('re');
  window.location.href = "/";
});

socket.on('newGame', function() {
  resetBoard();
});

socket.on('move', function(data) {
	game.move(data.move);
	board.position(data.pos);
	updateStatus();
});

if (chan) $('#color').hide();

function addPlayer() {
  if($('#username').val().length <=0 ) return;
  if (!chan) player = $('#color').val();
	username = $('#username').val();
  initBoard();
  $('#p2').html(username);
	socket.emit('newUser', {user:username, chan:chan, pos:game.fen(), color:player});
  if (chan) socket.emit('getUser', {});
	$('#login').hide();
}

function checkUsername(event) {
	if (event.keyCode == 13) {
		addPlayer();
	}
}

function initBoard(pos, _game) {
	board = null;
	game = pos ? new Chess(pos) : new Chess();
	status = $('#status');

	var config = {
	  draggable: true,
	  position: pos || 'start',
	  onDragStart: onDragStart,
	  onDrop: onDrop,
	  onSnapEnd: onSnapEnd,
	  orientation: player,
	  showNotation: false

	};
	board = ChessBoard('myBoard', config);
	updateStatus();
}


function onDragStart (source, piece, position, orientation) {
  if (game.game_over()) return false
  if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1) ||
      game.turn() !== player.substr(0,1) || 
      !canMove) {
    return false
  }
}

function onDrop (source, target) {
  var move = game.move({
    from: source,
    to: target,
    promotion: 'q'
  })

  if (move === null) return 'snapback'

  updateStatus(move)
}

function onSnapEnd () {
  board.position(game.fen())
}

function playAgain() {
  $('#playAgain').toggleClass('show');
  setTimeout(function() {
    $('#gameOver').toggleClass("show");
  }, 4000);
}

function resetBoard() {
  initBoard();
  $('#playAgain').toggleClass('show');
  $('#gameOver').hide();
  if (player == 'white') start();
}

function newGame() {
  socket.emit('newGame', {chan:chan});
}

function start() {
  if (player == 'white') {
    $('#gameOver').html('START');
    $('#gameOver').toggleClass('show');
    setTimeout(function() {
      $('#gameOver').html('Game Over');
      $('#gameOver').toggleClass('show');
    }, 1000);
  }
}

function updateStatus (move) {
  var status = '';

  var moveColor = 'Blanco';
  if (game.turn() === 'b') {
    moveColor = 'Negro';
  }

  if (game.in_checkmate()) {
    status = 'Juego acabado, ' + moveColor + ' gana.';
    playAgain();
  }

  else if (game.in_draw()) {
    status = 'Game over, drawn position';
    playAgain();
  }

  else {
    status = moveColor + ' mueve';

    if (game.in_check()) {
      status += ', ' + moveColor + ' is in check';
    }
  }

  $('#status').html(status);
  if (move) socket.emit('move', {move:move, chan:chan, player:player, board:game.fen()});
}