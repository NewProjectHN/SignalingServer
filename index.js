// Setup basic express server
var express = require('express');
var app = express();
var path = require('path');


var fs = require('fs');
var httpsOptions = {
 key: fs.readFileSync('./fake-keys/privateKey.key'),
 cert: fs.readFileSync('./fake-keys/certificate.crt')
};
// console.log(httpsOptions);
// var port = process.env.PORT || 3000;
// var server = require('https').createServer(app);
// var io = require('socket.io')(server);
// OPen C:\OpenSSL\bin\openssl
// Genkey with this command: req -x509 -sha256 -nodes -days 365 -newkey rsa:2048 -keyout privateKey.key -out certificate.crt
// app.enable('trust proxy');
var server = require('https').createServer(httpsOptions,app);
// var server = require('http').createServer(app);
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
var mapRoomName = {};

io.on('connection', (socket) => {

  // when the client emits 'new message', this listens and executes
  console.log((new Date()).getTime() + 'CONNECT-id:'+socket.id)
  socket.on('join', (data,fn) => {
    // we tell the client to execute 'new message'
    var roomId = data.roomId;
    var name = data.name;

    socket.roomID = roomId;
    mapRoomName[roomId] = name;
    socket.join(roomId);
    console.log((new Date()).getTime() + 'join-id:'+socket.id)
    var socketIds = socketIdsInRoom(roomId);
    let friends = socketIds.map((socketId) => {
      return {
        socketId: socketId,
        name: mapRoomName[socketId]
      }
    }).filter((friend) => friend.socketId != socket.id);
    console.log("friend:"+friends.length);
    fn(friends);
    //broadcast
    // friends.forEach((friend) => {
    //   io.sockets.connected[friend.socketId].emit("join", {
    //     socketId: socket.id, name
    //   });
    // });
    // socket.emit('join success',arr);
  });

  socket.on('exchange', (data) => {
    // we tell the client to execute 'new message'

    console.log((new Date()).getTime() + 'exchange-id'+socket.id);

    var to = io.sockets.connected[data.to];
    if(to != undefined){
      to.emit('exchange',{from:socket.id,sdp:data.sdp,candidate:data.candidate});
    }

    // socket.emit('join success',arr);
  });

  var addedUser = false;

  // when the user disconnects.. perform this
  socket.on('disconnect', () => {
    console.log('disconnect-id:'+socket.id);
    // if (addedUser) {
    //   --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('leave',socket.id);
    // }
  });
});

//  WebRTC Signaling
function socketIdsInRoom(roomId) {
  var socketIds = io.nsps['/'].adapter.rooms[roomId];
  if (socketIds) {
    var sockets = socketIds.sockets
    if(sockets){
      var collection = [];
      for (var key in sockets) {
        collection.push(key);
      }
      return collection;
    }
  } else {
    return [];
  }
}



// START THE SERVER
// =============================================================================

console.log('Magic happens on port ' + port);
