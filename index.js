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

// var socketioAuth = require('./lib/socket-auth.js');
// var userService = require('./lib/user-service.js');
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
//var server = require('https').createServer(httpsOptions,app);
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

var router = express.Router();

// Map of token to valid user for testing only
// var mapToken = {}
app.use('/api', router);
// Danh sach user online
var userOnlineList = [];//{userId:1,socketId:2,userType:0}.1:Benh nhan, 0:bacsy
// Chatroom
var mapFriendOnline = {}; //store all friend online of user
var mapMissCall = {};// luu cac cuoc goi nho cua user
var mapMissMsg = {}; // luu cac tin nhan lo cua user
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
// Routing
app.use(express.static(path.join(__dirname, 'public')));


// function getUserBySocketId(socketId){
//   var token = mapSocketIdToken[socketId];
//   var user = mapToken[token];
//   return getUserActiveByUser(user);
// }
//
function getUserActiveByUser(user){
  var userOnline = null;
  if(user){
    for(var i = 0 ;i < userOnlineList.length;i++){
      var userActive = userOnlineList[i];
       if(userActive.userId == user.userId && userActive.userType == user.userType){
         userOnline = userActive;
         break;
       }
    }
  }
  return userOnline;
}

router.post('/sendMsgToUser', function(req, res) {
    var fromUser = req.body.fromUser;
    var toUser = req.body.toUser;
    var msg = req.body.msg;
    var ok = sendMsgFromTo(fromUser,toUser,msg);
    if(ok){
      res.json({ status: 'success'});
    }else{
      res.json({ status: 'user_not_online'});
    }
});

server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

// Routing
//app.use(express.static(path.join(__dirname, 'public')));



function addNewUser(newUser,socketId){
  let {userId,userType} = newUser;
  var isFound = false;
  for(var i = 0;i < userOnlineList.length;i++){
    var user = userOnlineList[i];
    if((user.userId == userId && user.userType == userType) || user.socketId == socketId){
      isFound = true;
      user.userId = userId;
      user.userType = userType;
      user.socketId = socketId;
    }
  }
  if(!isFound){
    newUser.socketId = socketId;
    newUser.active = true;
    userOnlineList.push(newUser);
  }
}

function getUserBySocketId(socketId){
  for(var i = 0;i < userOnlineList.length;i++){
    if(userOnlineList[i].socketId == socketId){
       return userOnlineList[i];
    }
  }

  return null;
}

function removeUserBySocket(socketId){
  for(var i = 0;i < userOnlineList.length;i++){
    var user = userOnlineList[i];
    if(user.socketId == socketId){
      userOnlineList.splice(i,1);
      break;
    }
  }
}

function getListUserOnline(userFriends){
  var lstUserOnline = [];
  for(var i = 0;i < userFriends.length;i++){
    var isFound = false;
    for(var j= 0;j< userOnlineList.length;j++){
      if(userOnlineList[j].userId == userFriends[i].userId &&
            userOnlineList[j].userType == userFriends[i].userType){
        isFound = true;
        userOnlineList[j].active = true;
        lstUserOnline.push(userOnlineList[j]);
      }
    }
    if(!isFound){
      userFriends[i].active = false;
      lstUserOnline.push(userFriends[i]);
    }
  }
  return lstUserOnline;
}

function exchange(socket,data){
  console.log((new Date()).getTime() + 'exchange-id'+socket.id);
  let user = data.to;
  var userOnline = getUserActiveByUser(user);
  var fromUser = getUserBySocketId(socket.id)

  // var to = io.sockets.connected[data.to];
  if(userOnline && fromUser){
    // let name = mapUserName[socket.id];
    let name = "test";
    io.to(userOnline.socketId).emit('exchange',{from:fromUser,sdp:data.sdp,candidate:data.candidate,name:name});
  }
}

io.on('connection', function(socket) {

  console.log('new socket connect');

  socket.on('join', function(data) {
    var {userId,userFriends} = data;
    addNewUser(data,socket.id);
    console.log('userFriends',userFriends);
    var userOnlineList = getListUserOnline(userFriends);
    // Tra ve thua socket id
    mapFriendOnline[userId] = userOnlineList;
    console.log('useronlinelist',userOnlineList);
    // Thong bao cho tat ca friend
    userOnlineList.forEach(friend => {
      if(friend && friend.socketId){
        if(friend.active == true){
          io.to(friend.socketId).emit('friend-online',data);
        }
      }else{
        console.log('ERRROR FRIEND:'+userId);
      }
    });
    var missCallList = [];
    var missMsgList = [];
    if(mapMissCall[userId]){
      mapMissCall[userId].forEach(e=>{
        missCallList.push(e);
      })
    }
    if(mapMissMsg[userId]){
      mapMissMsg[userId].forEach(e=>{
        missMsgList.push(e);
      })
    }
    io.to(socket.id).emit('init-data-friend',{friendOnlineList: userOnlineList,missCallList:missCallList,missMsgList:missMsgList});
    mapMissCall[userId] = [];
    mapMissMsg[userId] = [];
    // if(fn){
    //   fn(userOnlineList,mapMissCall[userId],mapMissMsg[userId]);
    //   mapMissCall[userId] = [];
    //   mapMissMsg[userId] = [];
    // }
  });

  socket.on('disconnect', function() {
    var user = getUserBySocketId(socket.id);
    if(user){
      var friendOnline = mapFriendOnline[user.userId];
      if(friendOnline){
          for(var i = 0 ;i < friendOnline.length;i++){
            var friendOnline = friendOnline[i];
            io.to(friendOnline.socketId).emit("friend-disconnect",user);
          }
      }
    }
    removeUserBySocket(socket.id);
  });

});

function callToUser(socket,user){
  var userOnline = getUserActiveByUser(user);
  var fromUser = getUserBySocketId(socket.id);
  if(fromUser){
    if(userOnline){
      // Truong hop user online
      io.to(userOnline.socketId).emit("call-from",fromUser);
    }else{
      // Truong hop user offline
      var missCallLst = mapMissCall[user.userId];
      if(!missCallLst){
        missCallLst = [];
      }
      missCallLst.push(fromUser);
      io.to(socket.id).emit("offline-call-now",user);
    }
  }
  
}

// inform to start call is ringing in end call
function ringingCall(socket,user){
    var user = getUserActiveByUser(user);
    var socketUser = getUserBySocketId(socket.id);
    if(user && socketUser){
        io.to(user.socketId).emit("ringing",socketUser);
    }
}

// function endCallTo(socket,user){
//   var user = getUserActiveByUser(user);
//   var socketUser = getUserBySocketId(socket.id);
//   if(user && socketUser){
//       io.to(user.socketId).emit("end-call-from",socketUser);
//   }
// }

function finishCall(socket,user){
  var user = getUserActiveByUser(user);
  var socketUser = getUserBySocketId(socket.id);
  if(user && socketUser){
    io.to(user.socketId).emit("finish-call",socketUser);
  }
}

function startCall(socket,user){
  var user = getUserActiveByUser(user);
  var socketUser = getUserBySocketId(socket.id);
  if(user && socketUser){
      io.to(user.socketId).emit("start-call",socketUser);
  }
}

function busyNow(socket,user){
  var user = getUserActiveByUser(user);
  var socketUser = getUserBySocketId(socket.id);
  if(user && socketUser){
      io.to(user.socketId).emit("busy-now",socketUser);
  }
}

function sendMsg(socket,data){
  var user = getUserActiveByUser(data.user);
  var socketUser = getUserBySocketId(socket.id);
  sendMsgFromTo(socketUser,user,data.msg);
}

function sendMsgFromTo(fromUser,toUser,msg){
  var userOnline = getUserActiveByUser(toUser);
  if(userOnline){
    io.to(userOnline.socketId).emit("send-msg",{user:fromUser,msg:msg});
    return true;
  }else{
    var lstMsg = mapMissMsg[toUser.userId];
    if(!lstMsg){
      lstMsg = [];
    }
    lstMsg.push({user:fromUser,msg:msg});
    mapMissMsg[toUser.userId] = lstMsg;
    return false;
  }
}

function addNewFriend(socket,users){

  var userOnlineList = [];
  for(var i = 0;i < users.length;i++){
    var user = users[i];
    user = getUserActiveByUser(user);
    var socketUser = getUserBySocketId(socket.id);
    // Trong truong hop ban moi add online thi gui phan hoi lai
    if(user && socketUser){
      //add them vao danh sach ban be
      var tmpListOnline = mapFriendOnline[user.userId];
      tmpListOnline.push(socketUser);
      mapFriendOnline[user.userId] = tmpListOnline;

      tmpListOnline = mapFriendOnline[socketUser.userId];
      tmpListOnline.push(user);
      mapFriendOnline[socketUser.usreId] = mapFriendOnline;

      io.to(user.socketId).emit('friend-online',socketUser);
      user.active = true;
      userOnlineList.push(user)
    }else{
      users[i].active = false;
      userOnlineList.push(users[i]);
    }
  }

  io.to(socket.id).emit('init-data-friend',{friendOnlineList: userOnlineList});
}

// var configAuth = {authenticate:validToken,disconnect:disconnect};
// // Filter user
// socketioAuth(io,configAuth);

var configRoom = {
  callToUser:callToUser,
  ringingCall:ringingCall,
  startCall: startCall,
  finishCall: finishCall,
  busyNow:busyNow,
  sendMsg:sendMsg,
  addNewFriend: addNewFriend
};
socketIORoom(io,configRoom);

var configRTC = {exchange:exchange};
socketRTC(io,configRTC);


// START THE SERVER
// =============================================================================

console.log('Magic happens on port ' + port);
