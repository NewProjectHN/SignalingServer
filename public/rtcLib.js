let IS_BROWSER = true;
try{
  IS_BROWSER = (module == null || module.exports == null);
}catch(err){
  IS_BROWSER = true;
}
// Dung cho mobile
// import {RTCSessionDescription, RTCPeerConnection, RTCIceCandidate} from "react-native-webrtc";

// Dung cho trinh duyet
RTCPeerConnection = window.RTCPeerConnection,
RTCSessionDescription = window.RTCSessionDescription,
RTCIceCandidate = window.RTCIceCandidate

let socket = null;
// let onFriendLeftCallback = null;
// let onFriendConnectedCallback = null;
// let onDataChannelMessageCallback = null;

let hasCall = false;

var configuration = {"iceServers": [
    {"url": "stun:stun.l.google.com:19302"},
    {
      "url": 'turn:35.187.252.124:2222?transport=tcp',
      "username": 'webrtc',
      "credential": 'WebRTC@123456'
    }
]};
var peerConnections = {}; //map of {socketId: socket.io id, RTCPeerConnection}
// let localStream = null;
let friends = null; //list of {socketId, name}

/*
  user: {userId, userType,userFriends} -> current User
  callback:
    - getFriendOnlineCB - lay thong tin danh sach ban online
    - newFriendOnlineCB - co them user online
    - disconnecFriendCB - mot user disconect
    - endCallCB - end current call
    - hasCallCB -
    - hasMsgCB
*/
let user = null;
let callback = null;
function createSocketRTC(config,_user,_callback){

  user = _user;
  callback = _callback;
  let {socketURL} = config;

  if(IS_BROWSER) {
    socket = io(socketURL);
  } else {
    const socketIOClient = require('socket.io-client');
    socket = socketIOClient(socketURL, {transports: ['websocket'], jsonp: false});
  }

  socket.on('exchange', function(data){
    exchange(data);
  });

  socket.on('connect', function(data) {
    console.log('socket ID connect:'+ socket.id);
    let {onConnectSocket} = callback;
    if(onConnectSocket){
      onConnectSocket();
    }
    console.log('user join:',user);
    socket.emit('join', user);
  });

  
  socket.on("disconnect", function(data) {
    console.log('socket ID disconnect:'+ socket.id);
    let {onDisconectSocket} = callback;
    if(onDisconectSocket){
      onDisconectSocket();
    }
  });

  socket.on('init-data-friend', function(data) {
    let {getFriendOnlineCB} = callback;
    if(getFriendOnlineCB){
      getFriendOnlineCB(data.friendOnlineList,data.missCallList,data.missMsgList);
    }

    // kiem tra xem trong danh sach ban be online da co
    if(data && data.friendOnlineList){
      data.friendOnlineList.forEach(friendOnline => {
        var friends = user.userFriends;
        var isFound = false;
        for(var i = 0 ;i < friends.length;i++){
          var friend = friends[i];
          if(friend.userId == friendOnline.userId && friend.userType == friendOnline.userType ){
            isFound = true;
            break;
          }
        }
        if(!isFound){
          friends.push(friendOnline);
        }
      })
    }
    
  });

  socket.on('authenticated', function(data) {

  });

  socket.on("friend-online", function(user) {
    let {newFriendOnlineCB} = callback;
    if(newFriendOnlineCB){
      newFriendOnlineCB(user);
    }
  });

  socket.on("friend-disconnect", function(user) {
    let {disconectFriend} = callback;
    if(disconectFriend){
      disconectFriend(user);
    }
  });

  socket.on("call-from", function(user) {
    let {onNewCallCB} = callback;
    if(hasCall){
        socket.emit('busy-now',user);
    }else{
      hasCall = true;
      socket.emit('ringing',user);
      if(onNewCallCB){
        onNewCallCB(user);
      }
    }
  });

  socket.on("busy-now", function(user) {
    let {onBusyCallCB} = callback;
    if(onBusyCallCB){
      onBusyCallCB(user);
    }
  });

  socket.on("ringing", function(user) {
    
  });

  socket.on("offline-call-now", function(user) {
    let {offlineCallNow} = callback;
    if(offlineCallNow){
      offlineCallNow(user);
    }
  });

  socket.on("start-call", function(user) {
    // Khoi tao RCT connection
    createPeerConnection(user, true);
  });

  socket.on("finish-call", function(user) {
    hasCall = false;
    localStream = null;
    let {userId} = user;
    var pc = peerConnections[userId];
    if(pc != null){
      pc.close();
    }
    if(pc){
      delete peerConnections[userId];
    }

    let {endCallCB} = callback;
    if(endCallCB){
      endCallCB(user);
    }
  });

  socket.on("send-msg", function(data) {
    let {onNewMsgCB} = callback;
    if(onNewMsgCB){
      onNewMsgCB(data.user,data.msg);
    }
  });
}

function createPeerConnection(user, isOffer) {
  var retVal = new RTCPeerConnection(configuration);
  var {userId} = user;
  peerConnections[userId] = retVal;

  retVal.onicecandidate = function (event) {
    if (event.candidate) {
      socket.emit('exchange', {'to': user, 'candidate': event.candidate});
    }
  };

  function createOffer() {
    retVal.createOffer(function(desc) {
      retVal.setLocalDescription(desc, function () {
        socket.emit('exchange', {'to': user, 'sdp': retVal.localDescription });
      }, logError);
    }, logError);
  }

  retVal.onnegotiationneeded = function (event) {
    console.log('onnegotiationneeded:',event.candidate);
    // Bo doan nay de khi co thay doi ve camera duoc tao lai offer
    // Check lai ve hieu nang
    // if (isOffer) {
      createOffer();
    // }

  }

  retVal.oniceconnectionstatechange = function(event) {

  };

  retVal.onsignalingstatechange = function(event) {

  };

  retVal.onaddstream = function (event) {
    console.log('on add stream');
    let startCallSuccessCB = null;
    if(callback){
      startCallSuccessCB = callback.startCallSuccessCB;
    }else{
      startCallSuccessCB = parent.callback.startCallSuccessCB;
    }
    
    if(startCallSuccessCB) {
      startCallSuccessCB(user, event.stream);
    }
  }
  if(localStream != null){
    retVal.addStream(localStream);
  }

  return retVal;
}

function exchange(data) {
  var user = data.from;
  var fromId = user.userId;
  var pc;
  if (fromId in peerConnections) {
    pc = peerConnections[fromId];
  } else {
    pc = createPeerConnection(user, false);
    peerConnections[fromId] = pc;
  }

  if (data.sdp) {
    pc.setRemoteDescription(new RTCSessionDescription(data.sdp), function () {
      if (pc.remoteDescription.type == "offer")
      pc.createAnswer(function(desc) {
        pc.setLocalDescription(desc, function () {
          socket.emit('exchange', {'to': user, 'sdp': pc.localDescription });
        }, logError);
      }, logError);
    }, logError);
  } else {
    pc.addIceCandidate(new RTCIceCandidate(data.candidate));
  }
}

function logError(error) {
}

function makeCall(user,_localStream){
  if (socket.connected === false &&
    socket.connecting === false) {
    console.log('NDLONG reconnect');
    socket.connect()
  }
  localStream = _localStream;
  socket.emit("call-to",user);
}

function sendMsg(user,msg){
  socket.emit("send-msg",{user,msg});

}

function removeLocalStream(){
  if (localStream) {
    for (const id in peerConnections) {
      const pc = peerConnections[id];
      pc && pc.removeStream(localStream);
    }
    localStream.getTracks().forEach((t) => {
      localStream.removeTrack(t);
    });
    // localStream.removeStream();
  }
}

function changeLocalStream(_localStream){
  removeLocalStream();
  localStream = _localStream;
  for (const id in peerConnections) {
    console.log('id peer',id);
    const pc = peerConnections[id];
    pc && pc.addStream(localStream);
  }
}

function receiveCall(user){
  socket.emit('start-call',user);
}

function finishCall(user){
  removeLocalStream();
  hasCall = false;
  localStream = null;
  let {userId} = user;
  var pc = peerConnections[userId];
  if(pc != null){
    pc.close();
  }
  if(pc){
    delete peerConnections[userId];
  }
  socket.emit("finish-call",user);
}

function addNewFriend(users){
  if(user){
    var friends = user.userFriends;
    users.forEach((user =>{
      var isFound = false;
      for(var i = 0;i < friends.length;i++){
        var friend = friends[i];
        if(friend.userId == user.userId && friend.userType == user.userType){
          isFound = true;
          break;  
        }
      }
      if(!isFound){
        friends.push(user);
      }
    }))
  }
  socket.emit("add-new-friend",users);
}
//------------------------------------------------------------------------------
// Exports
if(!IS_BROWSER) {
  module.exports = {
    createSocketRTC,
    makeCall,
    finishCall,
    receiveCall,
    sendMsg,
    addNewFriend,
    changeLocalStream
  }
}
