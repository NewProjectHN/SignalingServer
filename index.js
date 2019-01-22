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
var mapFriend = {}; //store all friend of user
var mapMissCall = {};// luu cac cuoc goi nho cua user
var mapMissMsg = {}; // luu cac tin nhan lo cua user
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
// Routing
app.use(express.static(path.join(__dirname, 'public')));


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

function getUserBySocketId(socketId){
  for(var i = 0;i < userOnlineList.length;i++){
    if(userOnlineList[i].socketId == socketId){
       return userOnlineList[i];
    }
  }

  return null;
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
    userOnlineList.push(newUser);
  }
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
  if(userFriends){
    for(var i = 0;i < userFriends.length;i++){
      for(var j= 0;j< userOnlineList.length;j++){
        if(userOnlineList[j].userId == userFriends[i].userId &&
              userOnlineList[j].userType == userFriends[i].userType){
          lstUserOnline.push(userOnlineList[j]);
        }
      }
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

/**
 * Lay ve danh sach cac user online co ban la user dau vao
 */
function getAllFriendOnlineOfUser(userId,userType){
  var userFriends = mapFriend[userId + '_' + userType];
  var userOnlineList = getListUserOnline(userFriends);
  var userFriendIdList = Object.keys(mapFriend);
  userFriendIdList.forEach(userTmpID => {
    userArr = userTmpID.split('_');
    var userSearch = {userId: userArr[0],userType: userArr[1]};
    if(userId != userSearch.userId && userType != userSearch.userType){
      var userFriendAllList = mapFriend[userTmpID];
      userFriendAllList.forEach(userFriend => {
        if(userFriend.userId == userId && userFriend.userType == userType){
          userSearch = getUserActiveByUser(userSearch);
          if(userSearch){
            userOnlineList.push(userSearch);
          }
        }
      })
    }
  
  })
  console.log('userId',userId);
  console.log('useronlinelist',userOnlineList);
  return userOnlineList;
}

io.on('connection', function(socket) {

  console.log('new socket connect');

  socket.on('join', function(data) {
    
    data.userFriends = [];
    var {userId,userType,userFriends} = data;
    addNewUser(data,socket.id);
    // Tra ve thua socket id
    mapFriend[userId + '_' + userType] = userFriends;
    // Kiem tra lai danh sach ban be online co user nay thi gui them vao
    var userOnlineList = getAllFriendOnlineOfUser(userId,userType);
 
    console.log('JOIN JOIN',userOnlineList);
    // Thong bao cho tat ca friend
    userOnlineList.forEach(friend => {
      if(friend && friend.socketId){
        if(friend.socketId){
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
    // io.to(socket.id).emit('init-data-friend',{friendOnlineList: userOnlineList,missCallList:missCallList,missMsgList:missMsgList});
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
      var userOnlineOfUserList = getAllFriendOnlineOfUser(user.userId,user.userType);
      if(userOnlineOfUserList){
          for(var i = 0 ;i < userOnlineOfUserList.length;i++){
            var friendUser = userOnlineOfUserList[i];
            if(friendUser.socketId){
              io.to(friendUser.socketId).emit("friend-disconnect",user);
            }
            
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

  console.log('addNewFriend - users',users);

  var userOnlineList = [];
  var socketUser = getUserBySocketId(socket.id);

  if(socketUser){
    console.log('addNewFriend - socketUser',socketUser);
    var id = socketUser.userId + '_' + socketUser.userType;
    for(var i = 0;i < users.length;i++){
      var user = users[i];
     
      // Trong truong hop ban moi add online thi gui phan hoi lai
      
      var friendAllList = mapFriend[id];
      var isFound = false;
      if(friendAllList){
        for(var j = 0; j < friendAllList.length;j++){
          var friend = friendAllList[j];
          if(friend.userId == user.userId && friend.userType == user.userType){
            isFound = true;
            friendAllList[j] = user;
          }
        }
      }else{
        friendAllList = [];
      }
      if(!isFound){
        friendAllList.push(user);
      }

      mapFriend[socketUser.userId + '_' + socketUser.userType] = friendAllList;

      let userActive = getUserActiveByUser(user);
      if(userActive){
        users[i].active = true;
      }else{
        users[i].active = false;
      }
      userOnlineList.push(users[i])
    }
  
    // Thong bao cho tat ca user la ban khi user online
    var allFriendOnlineList = getAllFriendOnlineOfUser(socketUser.userId,socketUser.userType);

    console.log('addNewFriend -all',allFriendOnlineList);
    if(allFriendOnlineList){
      allFriendOnlineList.forEach(friend => {
        if(friend.socketId){
          io.to(friend.socketId).emit('friend-online',socketUser);
        }   
      })
    }
  }

  console.log('addNewFriend - online',userOnlineList);
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
