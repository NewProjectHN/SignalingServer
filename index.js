// Setup basic express server
// var sslRedirect = require('heroku-ssl-redirect');
var express = require('express');
var app = express();
// app.use(sslRedirect());
var path = require('path');

var bodyParser = require('body-parser');
var cors = require('cors');

app.use(cors());
app.options('*', cors());

var socketioAuth = require('./lib/socket-auth.js');
var userService = require('./lib/user-service.js');
var socketIORoom = require('./lib/socket-room.js');
var socketRTC = require('./lib/socket-rtc.js');

var fs = require('fs');
var httpsOptions = {
 key: fs.readFileSync('./fake-keys/privateKey.key'),
 cert: fs.readFileSync('./fake-keys/certificate.crt')
};

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// console.log(httpsOptions);
// var port = process.env.PORT || 3000;
// var server = require('https').createServer(app);
// var io = require('socket.io')(server);
// OPen C:\OpenSSL\bin\openssl
// Genkey with this command: req -x509 -sha256 -nodes -days 365 -newkey rsa:2048 -keyout privateKey.key -out certificate.crt
// app.enable('trust proxy');
// var server = require('https').createServer(httpsOptions,app);
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

var router = express.Router();

// Map of token to valid user for testing only
var mapToken = {}
app.use('/api', router);
// app.use(function(req, res, next) {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//   next();
// });
// Routing
app.use(express.static(path.join(__dirname, 'public')));


function getUserBySocketId(socketId){
  var token = mapSocketIdToken[socketId];
  var user = mapToken[token];
  return getUserActiveByUser(user);
}

function getUserActiveByUser(user){
  var userOnline = null;
  if(user){
    for(var i = 0 ;i < userActiveList.length;i++){
      var userActive = userActiveList[i];
       if(userService.compareUser(userActive,user)){
         userOnline = userActive;

         break;
       }
    }
  }
  return userOnline;
}

router.post('/checkLogin', function(req, res) {
    var username = req.body.username;
    var password = req.body.password;
    var token = userService.doCheckLogin(username,password);
    var user = {email:username};

    var userActive = getUserActiveByUser({email:username});
    if(userActive != null){
        res.json({ status: 'connected',token: token });
    }else{
        mapToken[token] = user;
        res.json({ status: 'OK',token: token });
    }

});
//


server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

// Routing
//app.use(express.static(path.join(__dirname, 'public')));

// Chatroom
var numUsers = 0;
var mapSocketIdToken = {};
var socketList = [];

var userActiveList = [];// List of user after login success: socketID:,email,devideid,

function validToken(data,callback){
    console.log('data token',data);
    if(mapToken[data.token]){
        var user = mapToken[data.token]
        var rs = callback(false,true);
        var friends = userService.getFriendByUser(user);
        user.socket = rs.socket;
        user.token = data.token;
        user.friends = friends;
        userActiveList.push(user);
        mapSocketIdToken[rs.socket.id] = data.token;

        // Check friends active.
        var friendRSList = [];
        for(var i = 0; i < friends.length;i++){
            var friend = friends[i];
            friend.active = false;
            for(var j = 0; j < userActiveList.length;j++){
                var friendActive = userActiveList[j];
                if(userService.compareUser(friendActive,friend)){
                    friend.active = true;
                    // socketRoom(rs.socket,null);
                    // emit login event to all friends
                    friendActive.socket.emit('friend-online',user.email);
                }
            }
            friendRSList.push(friend);
        }

        // Return list of user online
        rs.socket.emit('getallfriend',friendRSList);


    }else{
        callback(true,false);
    }

}

function disconnect(socket){
  console.log('dissssssssss');
  // var userOnline = getUserBySocketId(socket.id);

  var token = mapSocketIdToken[socket.id];
  var user = mapToken[token];

  // TODO: dang bi lap code doan nay
  var userOnline = null;
  if(user){
    for(var i = 0 ;i < userActiveList.length;i++){
      var userActive = userActiveList[i];
       if(userService.compareUser(userActive,user)){
         userOnline = userActive;
         userActiveList.splice (i,1);
         break;
       }
    }
  }
  // return userOnline;

    // inform to all friends
    if(userOnline){
      var friends = userOnline.friends;
      friends.forEach(function(friend){
         userActiveList.forEach(function(activeUser){
           if(activeUser.email == friend.email){
             io.to(activeUser.socket.id).emit("friend-disconnect",userOnline.email)
           }
         })
      })
    }
}


function callToUser(socket,email){
  var userOnline = getUserActiveByUser({email:email});
  var fromUser = getUserBySocketId(socket.id);
  io.to(userOnline.socket.id).emit("call-from",fromUser.email);
}

// inform to start call is ringing in end call
function ringingCall(socket,email){
    var user = getUserActiveByUser({email:email});
    var socketUser = getUserBySocketId(socket.id);
    io.to(user.socket.id).emit("ringing",socketUser.email);
}

function refuseCall(socket,email){
  var user = getUserActiveByUser({email:email});
  var socketUser = getUserBySocketId(socket.id);
  io.to(user.socket.id).emit("refuse-call-from",socketUser.email);
}

function endCallTo(socket,email){
  var user = getUserActiveByUser({email:email});
  var socketUser = getUserBySocketId(socket.id);
  io.to(user.socket.id).emit("end-call-from",socketUser.email);
}

function finishCall(socket,email){
  var user = getUserActiveByUser({email:email});
  var socketUser = getUserBySocketId(socket.id);
  if(user && socketUser){
    io.to(user.socket.id).emit("finish-calling",socketUser.email);
  }
}

function startCall(socket,email){
  var user = getUserActiveByUser({email:email});
  var socketUser = getUserBySocketId(socket.id);
  io.to(user.socket.id).emit("start-calling",socketUser.email);
}

function busyNow(socket,email){
  var user = getUserActiveByUser({email:email});
  var socketUser = getUserBySocketId(socket.id);
  io.to(user.socket.id).emit("busy-now",socketUser.email);
}

function sendMsg(socket,data){
  var user = getUserActiveByUser({email:data.email});
  var socketUser = getUserBySocketId(socket.id);
  io.to(user.socket.id).emit("send-msg",{email:socketUser.email,msg:data.msg});
}

var configAuth = {authenticate:validToken,disconnect:disconnect};
// Filter user
socketioAuth(io,configAuth);

var configRoom = {
  callToUser:callToUser,
  refuseCall:refuseCall,
  ringingCall:ringingCall,
  startCall: startCall,
  finishCall: finishCall,
  busyNow:busyNow,
  sendMsg:sendMsg
};
socketIORoom(io,configRoom);

function exchange(socket,data){
  console.log((new Date()).getTime() + 'exchange-id'+socket.id);
  let email = data.to;
  var user = getUserActiveByUser({email:email});
  var socketUser = getUserBySocketId(socket.id);
  // var to = io.sockets.connected[data.to];
  if(user != null){
    // let name = mapUserName[socket.id];
    let name = "test";
    user.socket.emit('exchange',{from:socketUser.email,sdp:data.sdp,candidate:data.candidate,name:name});
  }
}

var configRTC = {exchange:exchange};
socketRTC(io,configRTC);


// START THE SERVER
// =============================================================================

console.log('Magic happens on port ' + port);
