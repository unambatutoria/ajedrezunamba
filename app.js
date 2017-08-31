var express = require('express');
var app = express();
var serv = require('http').Server(app);
var io = require('socket.io')(serv);
var port = process.env.PORT || 3000;

var roomList = [], channels = [];

serv.listen(port);

app.use(express.static(__dirname+'/app'));

app.get('*', function(req,res) {
	res.sendFile(__dirname + '/app/index.html');
});


io.on('connection', function(socket) {
	socket.on('newUser', function(data) {
		
		if (data.chan) {
			if (roomList[data.chan]) {
				if (roomList[data.chan].length <= 0) {
					socket.emit('reload');
				}
				else {
					channels[socket.id] = data.chan;
					roomList[data.chan].push(new User({id:socket.id, chan:data.chan, username:data.user, socket:this, color:roomList[data.chan][0].color=="white"?"black":"white"}));
					socket.emit('newBoard', {pos:roomList[data.chan][0].pos, game:roomList[data.chan][0].game, color:roomList[data.chan][0].color=="white"?"black":"white"});
					roomList[data.chan][0].socket.emit('newUser', {user:data.user});
				}
			}
			else {
				socket.emit('reload');
			}
		}
		else {
			var nChan = makeChan();
			roomList[nChan] = [];
			roomList[nChan].push(new User({id:socket.id, chan:nChan, username:data.user, socket:this, pos:data.pos, color:data.color}));
			channels[socket.id] = nChan;
			socket.emit('waiting', {chan:nChan});
		}
	});
	socket.on('move', function(data) {
		if (data.player == roomList[data.chan][1].color) roomList[data.chan][0].socket.emit('move', {move:data.move, pos:data.board});
		else roomList[data.chan][1].socket.emit('move', {move:data.move, pos:data.board});
		roomList[data.chan][0].pos = data.board;
	});
	socket.on('disconnect', function() {
		var chan = channels[socket.id];
		if (chan) {
			if (roomList[chan].length > 0) {
				if (roomList[chan][0].id == socket.id) {
					broadcastRoom('hostLeft', chan);
					roomList[chan] = [];
				}
				else {
					roomList[chan].splice(1,1);
					broadcastRoom('playerLeft', chan);
				}
			}
		}
	});
	socket.on('getUser', function(data) {
		if (roomList[channels[socket.id]] && roomList[channels[socket.id]].length > 0) {
			socket.emit('player1', {user:roomList[channels[socket.id]][0].username});
			roomList[channels[socket.id]][0].socket.emit('ready', {});
		}
	});
	socket.on('newGame', function(data) {
		broadcastRoom('newGame', data.chan);
	});
});

function broadcastRoom(msg, chan) {
	for (var i=0; i<roomList[chan].length; i++) {
		roomList[chan][i].socket.emit(msg, {});
	}
}

function User(params) {
	this.id = params.id;
	this.chan = params.chan;
	this.username= params.username;
	this.socket = params.socket;
	this.pos = params.pos;
	this.color = params.color;
}

function makeChan() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 5; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
}
