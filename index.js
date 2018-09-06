// Setup basic express server
var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

// var router = express.Router();
//
// router.get('/', function(req, res) {
//     res.json({ message: 'hooray! welcome to our api!' });
// });
//
// app.use('/api', router);

server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));

// Chatroom

var numUsers = 0;
var socketList = [];

io.on('connection', (socket) => {

  // when the client emits 'new message', this listens and executes
  socket.on('join', (roomID,fn) => {
    // we tell the client to execute 'new message'
    console.log(fn);
    console.log('room id:'+roomID)
    socket.roomID = roomID;
    socketList.push(roomID);
    fn(socketList);

    socket.emit('connect');
    // socket.emit('join success',arr);
  });

  socket.on('exchange', (data) => {
    // we tell the client to execute 'new message'
    console.log(data.to);
    console.log(data.candidate);
    console.log()

    var to = io.sockets.connected[data.to];
    socket.emit('exchange',{from:socket.roomID,sdp:data.sdp});
    // socket.emit('join success',arr);
  });

  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', (data) => {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add_user', (username,fn) => {
    console.log(fn);
    if (addedUser) return;
    // fn('1234');
    // we store the username in the socket session for this client
    socket.username = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', () => {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', () => {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', () => {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});



// START THE SERVER
// =============================================================================

console.log('Magic happens on port ' + port);
