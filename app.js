//import all the stuff
var express = require('express');
var app = express();

var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var randomcolor = require('randomcolor');
var fs = require('fs');
var dateFormat = require('dateformat');

function out(message)
{
	console.log(dateFormat(new Date(), "isoDateTime") + ': ' + message);
}

//set static path so css and images can be used
app.use(express.static(path.join(__dirname, 'public')));

//this returns the index.html when you hit the server
app.get('/', function(req, res)
{
	res.sendFile(__dirname + '/views/index.html');
});

//when a client calles io()
io.on('connection', function(socket)
{
	var client = new Object();
	client.address = socket.request.connection.remoteAddress;
	client.room = 'default';

	socket.join('default'); //join the default chat room automaticlly

	out('New client ' + client.address + ' connected.');

	fs.readdirSync('public/rooms/').forEach(
		function(room)
		{
			io.sockets.connected[socket.id].emit('room update', room);
		});

	fs.readFileSync('public/rooms/default', 'utf8').split('\n').forEach(
		function(msg)
		{
			io.sockets.connected[socket.id].emit('chat message', msg);
		});

	//when a client dissconnects from the server
	socket.on('disconnect', function()
	{
		out('Client ' + client.address + ' disconnected.');
	});

	//when a chat message is received from the client
	socket.on('chat message', function(msg)
	{
		var color = randomcolor.randomColor({luminosity: 'light',count: 1});
		var newMessage = "<li style='color:" + color + ";'>" + msg + "</li>";

		fs.appendFileSync('public/rooms/' + client.room, newMessage + '\n');

		io.to(client.room).emit('chat message', newMessage);
	});

	socket.on('change room', function(room)
	{
		socket.emit('clear chat', {}); //sends the clear chat event to the client

		client.room = room;

		socket.leave(client.room);

		fs.readFileSync('public/rooms/' + room, 'utf8').split('\n').forEach(
			function(msg)
			{
				io.sockets.connected[socket.id].emit('chat message', msg);
			});

		socket.join(room);
	});

	socket.on('new room', function(room)
	{
		var color = randomcolor.randomColor({luminosity: 'light',count: 1});
		fs.appendFileSync('public/rooms/' + room, "<li style='color:" + color + ";'>Welcome to the " + room + " room</li>\n");

		io.sockets.connected[socket.id].emit('room update', room);

		out("A new room with the name '" + room + "' was added");
	});
});

http.listen(3000, function()
{
	out('listening on *:3000');
});
