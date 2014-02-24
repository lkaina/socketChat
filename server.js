var http = require('http');
var fs = require('fs');
var io = require('socket.io');

var server = http.createServer(function(req, res){
  var fileName;
  if (req.url === '/') {
    req.url = '/index.html';
  }
  fs.readFile(__dirname + req.url, function (err, data) {
    if (err) {
      res.writeHead(500);
      console.log('error loading file '+req.url);
      return res.end('Error loading file');
    }
    res.writeHead(200);
    res.end(data);
  });
});

var app = server.listen(8000, '127.0.0.1');
var io = require('socket.io').listen(app);

//Initialize lists to keep track of users/rooms and set default to lobby
var roomList = {
  'lobby': {},
};
var userList = {};
var socketList = {};

//Establish socket connection and handle events
io.sockets.on('connection', function (socket) {
  socket.on('checkUser', function (data, fn) {
    if (Object.keys(userList).indexOf(data.user) === -1) {
      fn({valid:true});
    } else {
      fn({valid:false});
    }
  });
  socket.on('checkRoom', function (data, fn) {
    if (Object.keys(roomList).indexOf(data.room) === -1) {
      fn({valid:true});
    } else {
      fn({valid:false});
    }
  });
  socket.on('newUser', function (data) {
    socket.join(data.room);
    socket.emit('currentUsers', {users: Object.keys(roomList[data.room])});
    socket.emit('currentRooms', {rooms: Object.keys(roomList)});
    roomList[data.room][data.user] = socket.id;
    userList[data.user] = data.room;
    socketList[socket.id] = data.user;
    socket.broadcast.to(data.room).emit('addUser', {user: data.user});
  });
  socket.on('newRoom', function (data, fn) {
    roomList[data.room] = {};
    io.sockets.emit("addRoom", data);
    fn(data);
  });
  socket.on('newMsg', function(data) {
    io.sockets.in(data.room).emit("addMsg", data)
  });
  socket.on('changeRoom', function(data) {
    socket.broadcast.to(data.oldRoom).emit('removeUser', {user: data.user});
    socket.leave(data.oldRoom);
    delete roomList[data.oldRoom][data.user];
    if (!(Object.keys(roomList[data.oldRoom]).length) && data.oldRoom !== 'lobby') {
      delete roomList[data.oldRoom];
    }
    socket.join(data.room);
    socket.emit('currentUsers', {users: Object.keys(roomList[data.room])});
    socket.emit('currentRooms', {rooms: Object.keys(roomList)});
    roomList[data.room][data.user] = socket.id;
    userList[data.user] = data.room;
    socket.broadcast.to(data.room).emit('addUser', {user: data.user})
  });
  socket.on('disconnect', function() {
    var dcUser = socketList[socket.id];
    var dcRoom = userList[dcUser];
    delete userList[dcUser];
    delete roomList[dcRoom][dcUser];
    delete socketList[socket.id];
    socket.broadcast.to(dcRoom).emit('removeUser', {user: dcUser});
  });
});
