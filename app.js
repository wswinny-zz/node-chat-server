//import all the stuff
var express = require('express');
var app = express();

var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var randomcolor = require('randomcolor');
var fs = require('fs');
var dateFormat = require('dateformat');

String.prototype.replaceAll = function(search, replacement)
{
    return this.replace(new RegExp(search, 'g'), replacement);
};

function out(message)
{
	console.log(dateFormat(new Date(), "isoDateTime") + ': ' + message);
}

function parseForImage(text)
{
	var message = text;

	var fileExtRegex = /[^\\]*\.(\w+)$/;
	var pageLinkRegex = /http[s]{0,1}:\/\/[^\s]*\.[a-zA-Z]+/g;
	var linksInPage = message.match(pageLinkRegex);

	if(linksInPage == null)
		return message;

	linksInPage.forEach(function(entry)
	{
		var fileParts = entry.match(fileExtRegex);
		var fileExt = '';

		if(fileParts != null && fileParts.length == 2)
			fileExt = fileParts[1];

		if(fileExt != undefined 	&& 
			fileExt != '' 			&& 
			fileExt != '.html'  	&& 
			fileExt != '.php' 		&& 
			fileExt != '.asp')
		{
			message = message.replaceAll(entry, "<img src='" + entry + "'/>");
		}
	});

	return message;
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

	out('New client ' + client.address + ' connected.');

	fs.readdirSync('public/rooms/').forEach(
		function(room)
		{
			io.sockets.connected[socket.id].emit('room update', room);
		});

	fs.readdirSync('public/characters/').forEach(
		function(characterJSON)
		{
			var characterData = fs.readFileSync('public/characters/' + characterJSON, 'utf8');
			var character = JSON.parse(characterData);

			io.sockets.connected[socket.id].emit('character update', character);
		});

	fs.readFileSync('public/rooms/default', 'utf8').split('\n').forEach(
		function(msg)
		{
			io.sockets.connected[socket.id].emit('chat message', msg);
		});

	io.sockets.connected[socket.id].emit('init', {});

	//when a client dissconnects from the server
	socket.on('disconnect', function()
	{
		out('Client ' + client.address + ' disconnected.');
	});

	//when a chat message is received from the client
	socket.on('chat message', function(msg)
	{
		var color = randomcolor.randomColor({luminosity: 'light',count: 1});

		var newMessage = parseForImage(msg);
		newMessage = "<li style='color:" + color + ";'>" + newMessage + "</li>";

		fs.appendFileSync('public/rooms/' + client.room, newMessage + '\n');

		io.to(client.room).emit('chat message', newMessage);
	});

	socket.on('change room', function(room)
	{
		socket.emit('clear chat', {}); //sends the clear chat event to the client

		socket.leave(client.room);

		client.room = room;

		fs.readFileSync('public/rooms/' + room, 'utf8').split('\n').forEach(
			function(msg)
			{
				io.sockets.connected[socket.id].emit('chat message', msg);
			});

		socket.join(client.room);
	});

	socket.on('new room', function(room)
	{
		var color = randomcolor.randomColor({luminosity: 'light',count: 1});
		fs.appendFileSync('public/rooms/' + room, "<li style='color:" + color + ";'>Welcome to the " + room + " room</li>\n");

		io.sockets.connected[socket.id].emit('room update', room);

		out("A new room with the name '" + room + "' was added");
	});

	socket.on('save character', function(character)
	{
		var characterJSON = JSON.stringify(character);
		var filename = 'public/characters/' + character.name + '.json';


		if (!fs.existsSync(filename))
		{
			console.log('New character created:');
			io.sockets.emit('character update', character);
		}

		fs.writeFileSync(filename, characterJSON);
	});

	socket.on('get character data', function(characterName)
	{
		var filename = 'public/characters/' + characterName + '.json';
		var characterData = fs.readFileSync(filename, 'utf8');
		var character = JSON.parse(characterData);

		io.sockets.connected[socket.id].emit('receive character data', character);
	});
});

http.listen(3000, function()
{
	out('listening on *:3000');
});
