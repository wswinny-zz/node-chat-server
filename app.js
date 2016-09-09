//import all the stuff
var express = require('express');
var app = express();

var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var randomcolor = require('randomcolor');

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
	console.log('New client ' + client.address + ' connected.');

	socket.join('default'); //join the default chat room automaticlly

	//when a client dissconnects from the server
	socket.on('disconnect', function()
	{
		
	});

	//when a chat message is received from the client
	socket.on('chat message', function(msg)
	{
		var color = randomcolor.randomColor({luminosity: 'light',count: 1});
		var newMessage = "<li style='color:" + color + ";'>" + msg + "</li>";

		io.emit('chat message', newMessage);
	});

	socket.on('change room', function(room)
	{
		socket.emit('clear chat', {}); //sends the clear chat event to the client
		
		console.log(socket.rooms);

		//joins and leaves a room
		socket.leave();
		socket.join(room);

		//allows you to send a message to a certian room
		io.to('some room').emit('message');
	});

	
});

http.listen(3000, function()
{
	console.log('listening on *:3000');
});
