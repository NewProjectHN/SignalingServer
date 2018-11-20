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
  let {getFriendOnlineCB} = callback;

  if(IS_BROWSER) {
    socket = io(socketURL);
  } else {
    const socketIOClient = require('socket.io-client');
    socket = socketIOClient(socketURL, {transports: ['websocket'], jsonp: false});
  }

  socket.on('exchange', function(data){
    console.log((new Date()).getTime() + " - exchange-from-server:", data);
    exchange(data);
  });

  socket.on('connect', function(data) {
    console.log('connect');
    socket.emit('join', user);
  });

  socket.on('init-data-friend', function(data) {
    console.log('connect');
    let {getFriendOnlineCB} = callback;
    getFriendOnlineCB(data.friendOnlineList,data.missCallList,data.missMsgList);
  });

  socket.on('authenticated', function(data) {
    console.log('authenticated');
  });

  socket.on("friend-online", function(user) {
    //new friend:

    console.log("New friend joint conversation: ", user);
    let {newFriendOnlineCB} = callback;
    if(newFriendOnlineCB){
      newFriendOnlineCB(user);
    }
  });

  socket.on("friend-disconnect", function(user) {
    // alert(1)
    //new friend:
    let {disconectFriend} = callback;
    if(disconectFriend){
      disconectFriend(user);
    }
  });

  socket.on("call-from", function(user) {
    // alert(1)
    //new friend:
    let {onNewCallCB} = callback;
    if(hasCall){
        socket.emit('busy-now',user);
    }else{
      hasCall = true;
      socket.emit('ringing',user);
      onNewCallCB(user);
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

  socket.on("disconect", function(data) {
    disconect();
  });
}

function createPeerConnection(user, isOffer) {
  var retVal = new RTCPeerConnection(configuration);
  var {userId} = user;
  peerConnections[userId] = retVal;

  retVal.onicecandidate = function (event) {
    console.log('onicecandidate');
    if (event.candidate) {
      socket.emit('exchange', {'to': user, 'candidate': event.candidate});
    }
  };

  function createOffer() {
    retVal.createOffer(function(desc) {
      console.log('createOffer', desc);
      retVal.setLocalDescription(desc, function () {
        console.log('setLocalDescription', retVal.localDescription);
        socket.emit('exchange', {'to': user, 'sdp': retVal.localDescription });
      }, logError);
    }, logError);
  }

  retVal.onnegotiationneeded = function () {
    console.log('onnegotiationneeded');
    if (isOffer) {
      createOffer();
    }
  }

  retVal.oniceconnectionstatechange = function(event) {
    // console.log('oniceconnectionstatechange');
    // if (event.target.iceConnectionState === 'connected') {
    //   createDataChannel();
    // }
  };

  retVal.onsignalingstatechange = function(event) {
    console.log('onsignalingstatechange');
  };

  retVal.onaddstream = function (event) {

    console.log('nvTien - onaddstream success...');
    //var element = document.createElement('video');
    //element.id = "remoteView" + socketId;
    //element.autoplay = 'autoplay';
    //element.src = URL.createObjectURL(event.stream);
    //remoteViewContainer.appendChild(element);
    let startCallSuccessCB = null;
    if(callback){
      console.log('nvTien - onaddstream return callback success...');
      startCallSuccessCB = callback.startCallSuccessCB;
    }else{
      console.log('nvTien - onaddstream return parent.callback success...');
      startCallSuccessCB = parent.callback.startCallSuccessCB;
    }
    
    if(startCallSuccessCB) {
      startCallSuccessCB(user, event.stream);
    }
  }
  if(localStream != null){
    console.log(`nvTien - rtcLib onaddStream data stream ${JSON.stringify(localStream)}`);
    retVal.addStream(localStream);
  }

  return retVal;
}

function exchange(data) {
  var user = data.from;
  var fromId = user.userId;
  var pc;
  if (fromId in peerConnections) {
    console.log((new Date()).getTime() + 'id in peer');
    pc = peerConnections[fromId];
  } else {
    console.log((new Date()).getTime() + 'id not in peer');
    pc = createPeerConnection(user, false);
    peerConnections[fromId] = pc;
  }

  if (data.sdp) {
    // console.log((new Date()).getTime() + 'exchange sdp', data);
    pc.setRemoteDescription(new RTCSessionDescription(data.sdp), function () {
      if (pc.remoteDescription.type == "offer")
      pc.createAnswer(function(desc) {
        // console.log((new Date()).getTime() + 'createAnswer', desc);
        pc.setLocalDescription(desc, function () {
          // console.log((new Date()).getTime() + 'data.sdp - setLocalDescription', pc.localDescription);
          socket.emit('exchange', {'to': user, 'sdp': pc.localDescription });
        }, logError);
      }, logError);
    }, logError);
  } else {
    // console.log((new Date()).getTime() + 'exchange----candidate', data.candidate);
    pc.addIceCandidate(new RTCIceCandidate(data.candidate));
  }
}

function leave(socketId) {
  console.log('leave', socketId);
  var pc = peerConnections[socketId];
  if(pc != null){
    pc.close();
  }
  if(pc != undefined){
    delete peerConnections[socketId];
  }
}

function logError(error) {
  console.log("logError", error);
}

function disconect(){
  // socket.emit("disconnect",user);
}

function makeCall(user,_localStream){
  console.log(`nvTien - rtcLib makeCall dataUser: ${JSON.stringify(user)} data localStream: ${JSON.stringify(_localStream)}`);
  localStream = _localStream;
  socket.emit("call-to",user);
}

function sendMsg(user,msg){
  socket.emit("send-msg",{user,msg});

}

function changeLocalStream(_localStream){
  localStream = _localStream;
}

function receiveCall(user){
  socket.emit('start-call',user);
}

function finishCall(user){
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
    disconect,
    addNewFriend,
    changeLocalStream
  }
}
