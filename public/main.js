
var app = angular.module('myApp', []);
var deviceId = Date.now();
var SERVER_URL = '';
let localStream = null;

window.onFriendCallback = (userId, stream) => {
  let thumbnailElement = document.createElement("div");
  thumbnailElement.className = "video-thumbnail";
  thumbnailElement.id = "friend-" + userId;

  let videoElement = document.createElement('video');
  videoElement.className = "video thumbnail";
  videoElement.autoplay = 'autoplay';
  // try{
  // videoElement.src = URL.createObjectURL(stream);
  // }catch(e){
    videoElement.srcObject = stream;
  // }
  thumbnailElement.appendChild(videoElement);

  let nameElement = document.createElement("div");
  nameElement.className = "name-user";
  nameElement.innerText = userId;
  thumbnailElement.appendChild(nameElement);

  document.getElementsByClassName("videos-container")[0].appendChild(thumbnailElement);
}

window.onFriendLeft = (user) => {
  var {userId} = user;
  var elementId = "friend-" + userId;
  var element = document.getElementById(elementId);
  if(element){
    element.parentNode.removeChild(element);
  }
}

app.controller('myCtrl', function($scope,$http) {
    $scope.isLogin = false;
    // $scope.name = "a";
    $scope.room = "ROOM_TEST";

    $scope.isVideo = true;
    $scope.isAudio = false;

    $scope.calling = false;
    $scope.makeCall = false;
    $scope.hasNewCall = false;

    $scope.friendAllList = [
      {userId:'d1',active:false,userType:0},
      {userId:'d2',active:false,userType:0},
      {userId:'d3',active:false,userType:0},
      {userId:'p1',active:false,userType:1},
      {userId:'p2',active:false,userType:1},
      {userId:'p3',active:false,userType:1},
    ];

    $scope.filterUser = function(user){
      return user.userId != $scope.userId && user.userType != $scope.userType;
    }

    $scope.getUserFriends = function(){
      var lst = [];
      $scope.friendAllList.forEach(friend=>{
        if(friend.userId != $scope.userId && friend.userType != $scope.userType){
          lst.push(friend);
        }
      });
      return lst;
    }

    $scope.isChat = false;
    $scope.currentChat = "";
    $scope.currentListMsg = [];
    $scope.mapAllMsg = {};
    $scope.textInput = "";

    $scope.userId = "";
    $scope.userType = "0";

    $scope.getDateDisplay = function(date){
      return date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    }

    $scope.addNewMessage = function(isMe,user,text){
      // message duoc gui tu toi
      var msg = {text:text,date:new Date(),isMe:isMe};
      var lstMsg = null;
      if($scope.mapAllMsg[user]){
        lstMsg = $scope.mapAllMsg[user];
      }else{
        lstMsg = [];
      }
      lstMsg.push(msg);
      $scope.mapAllMsg[user] = lstMsg;
      if(user == $scope.currentChat){
        $scope.currentListMsg.push(msg);
        var objDiv = document.getElementById("chat-msg-content");
        objDiv.scrollTop = objDiv.scrollHeight;
      }
    }

    $scope.sendMsg = function(){
      if($scope.currentChat != ""){
        if($scope.textInput == ""){
          alert('Input a meassage');
        }else{
          sendMsg({userId:$scope.userId,userType:$scope.userType},$scope.textInput);
          $scope.addNewMessage(true,$scope.userId,$scope.textInput);
          $scope.textInput = "";
        }
      }else{
        alert('Choose a user to chat');
      }
    }

    $scope.myFunct = function(keyEvent) {
      if (keyEvent.which === 13)
        $scope.sendMsg();
    }

    $scope.outRoom = function(){
      $scope.isLogin = false;
    }

    $scope.switchAudio = function(){
        $scope.isAudio = !$scope.isAudio;
        loadLocalStream(false,$scope.isAudio,$scope.isVideo);
    }

    $scope.switchVideo = function(){
        $scope.isVideo = !$scope.isVideo;
        loadLocalStream(false,$scope.isAudio,$scope.isVideo);
    }

    var peerConnections = {}; //map of {socketId: socket.io id, RTCPeerConnection}
    var remoteViewContainer = document.getElementById("remoteViewContainer");

    $scope.friends = []; //list of {socketId, name}
    let me = null; //{socketId, name}

    function receiveCallCB(stream){
      $scope.calling = true;
      $scope.hasNewCall = false;
      receiveCall($scope.friendCall)
    }
    $scope.receiveCall = function(){  
        loadLocalStream(false,$scope.isAudio,$scope.isVideo,receiveCallCB);
    }

    $scope.token = null;
    $scope.getFriendOnlineCB = function(data){
      let userFriends = $scope.getUserFriends();
      for(var i = 0;i < data.length;i++){
        for(var j = 0; j < userFriends.length;j++){
          if(userFriends[j].userId == data[i].userId &&
              userFriends[j].userType == data[i].userType){
              userFriends[j].active = true;
          }
        }
      }
      $scope.$apply();
    }

    $scope.newFriendOnlineCB = function(user){
      var isFound = false;
      for(var i = 0;i < $scope.friendAllList.length;i++){
        if($scope.friendAllList[i].userId == user.userId
         && $scope.friendAllList[i].userType == user.userType){
          isFound = true;
          $scope.friendAllList[i].active = true;
        }
      }
      if(!isFound){
        $scope.friendAllList.push({userId:user.userId,userType:user.userType,active:true});
      }
      $scope.$apply();
    }

    $scope.disconectFriend = function(user){
      alert('User diconnect',user);
      let {userId,userType} = user;

      if($scope.friendCall.userId == userId && $scope.friendCall.userType == userType){
        if($scope.calling === true){
          $scope.calling = false;
          leave(userId);
        }

        $scope.makeCall = false;
        $scope.hasNewCall = false;
      }

      for(var i = 0;i < $scope.friendAllList.length;i++){
        if($scope.friendAllList[i].userId == userId &&
            $scope.friendAllList[i].userType == userType){
          $scope.friendAllList[i].active = false;
        }
      }

      $scope.$apply();
    }

    $scope.startCallSuccessCB = function(user,stream){
      console.log('start call success');
      $scope.calling = true;
      $scope.makeCall = false;
      $scope.$apply();
      onFriendCallback(user.userId,stream);
    }

    $scope.endCallCB = function(user){
      endCallTo(user);
      $scope.$apply();
    }

    $scope.onNewMsgCB = function(user,msg){
      alert('onNewMsgCB',user,msg);
    }

    $scope.onNewCallCB = function(user){
      console.log('New Call From'+user);
      if($scope.calling === true || $scope.makeCall === true || $scope.hasNewCall === true){
          socket.emit('busy-now',user);
      }else{
        $scope.hasNewCall = true;
        $scope.friendCall = user;
        socket.emit('ringing',user);
        $scope.$apply();
      }
    }

    $scope.onBusyCallCB = function(user){
      $scope.calling = false;
      $scope.makeCall = false;
      $scope.friendCall = null;
      $scope.statusCall = '';
      setLocalStream(null);
      alert('User Busy Now');
      $scope.$apply();
    }

    $scope.join = function(roomId, name) {
      var isFound = false;
      for(var i = 0;i < $scope.friendAllList.length;i++){
        if($scope.friendAllList[i].userId == $scope.userId &&
              $scope.friendAllList[i].userType == $scope.userType){
              isFound = true;
        }
      }
      if(isFound){
        $scope.isLogin = true;
        let config = {'socketURL':'http://localhost:3000'};
        let userFriends = $scope.getUserFriends();
        let user = {userId:$scope.userId,userType:$scope.userType,userFriends:userFriends};
        let callback = {
          getFriendOnlineCB:$scope.getFriendOnlineCB,//Khi co danh sach ban online tra ve
          newFriendOnlineCB:$scope.newFriendOnlineCB,//khi co them 1 user online
          disconectFriend:$scope.disconectFriend,// khi co 1 user disconect
          startCallSuccessCB:$scope.startCallSuccessCB,// khi start call success
          endCallCB:$scope.endCallCB,// Khi yeu cau ket thuc cuoc goi
          onNewCallCB:$scope.onNewCallCB,// khi co cuoc goi moi
          onNewMsgCB:$scope.onNewMsgCB,// khi co tin nhan moi
          onBusyCallCB:$scope.onBusyCallCB
        };
        createSocketRTC(config,user,callback);
      }else{
        alert('Not found user!!!!');
      }
    }

    $scope.callFriend = function(friend){
      let {userId,active} = friend;
      if($scope.calling){
        alert('You are calling');
      }else if(active){
          $scope.isChat =false;
          $scope.calling = true;
          $scope.makeCall = true;
          $scope.friendCall = friend;
          $scope.statusCall = 'Connecting';
          // $scope.$apply();
          loadLocalStream(false,$scope.isAudio,$scope.isVideo,(localStream)=>{
              var user = {userId:friend.userId,userType:friend.userType};
              makeCall(user,localStream);
          });
      }
    }

    $scope.chatFriend = function(friend){
      let {userId,active} = friend;
      if(active){
          $scope.isChat =true;
          $scope.currentChat = userId;
          if($scope.mapAllMsg[userId]){
              $scope.currentListMsg = $scope.mapAllMsg[userId];
          }else{
            $scope.currentListMsg = [];
          }

      }else{
        alert('User not active');
      }
    }

    $scope.joinRoom = function(){
      if($scope.userId == ""){
          alert("Please insert userId!");
      }else{
          $scope.join($scope.room,$scope.name);
      }
    }

    $scope.finishCall = function(){
      finishCall($scope.friendCall);
      endCallTo($scope.friendCall);
    }

    function endCallTo(user){
      $scope.calling = false;
      $scope.makeCall = false;
      $scope.hasNewCall = false;
      setLocalStream(null);
      leave(user);
    }

    function loadLocalStream(muted,isAudio,isVideo,callback) {
      navigator.getUserMedia = (
          navigator.getUserMedia ||
          navigator.webkitGetUserMedia ||
          navigator.mozGetUserMedia ||
          navigator.msGetUserMedia
      );

      URL = URL || webkitURL;

      if(isAudio || isVideo){
        navigator.getUserMedia({ "audio": isAudio, "video": isVideo }, function (stream) {
          // console.log((new Date()).getTime() + 'loadLocalStream');
          setLocalStream(stream);
          if(callback){
              callback(stream);
          }
        }, function(error){
            alert(error);
        });
      }else{
          setLocalStream(null);
      }
    }
});

function setLocalStream(stream){
  changeLocalStream(stream);
  localStream = stream;
  var selfView = document.getElementById("selfView");
  selfView.srcObject = stream;
}

function leave(user) {
  console.log('leave', user);
  if(onFriendLeft != null) {
    onFriendLeft(user);
  }

}
