
var app = angular.module('myApp', []);
var deviceId = Date.now();
var SERVER_URL = '';
let localStream = null;

window.onFriendCallback = (userId, stream) => {
  onFriendLeft({userId:userId});
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
      {userId:'d1',active:false,userType:0,userName:'doctor 1',urlAvatar:'https://www.flaticon.com/premium-icon/icons/svg/1155/1155238.svg',friends:['p1','p2','p3']},
      {userId:'d2',active:false,userType:0,userName:'doctor 2',urlAvatar:'https://image.flaticon.com/icons/svg/387/387561.svg',friends:['p1','p2','p3']},
      {userId:'d3',active:false,userType:0,userName:'doctor 3',urlAvatar:'https://image.flaticon.com/icons/svg/122/122452.svg',friends:['p1','p2','p3']},
      {userId:'p1',active:false,userType:1,userName:'Benh nhan 1',urlAvatar:'https://image.flaticon.com/icons/svg/145/145867.svg',friends:['d1','d2','d3']},
      {userId:'p2',active:false,userType:1,userName:'Benh nhan 2',urlAvatar:'https://image.flaticon.com/icons/svg/145/145843.svg',friends:['d1','d2','d3']},
      {userId:'p3',active:false,userType:1,userName:'Benh nhan 3',urlAvatar:'https://www.flaticon.com/premium-icon/icons/svg/145/145863.svg',friends:['d1','d2','d3']},
    ];

    $scope.filterUser = function(user){
      for(var i = 0 ;i < $scope.friendAllList.length;i++){
        var friend = $scope.friendAllList[i];
        if(friend.userId == $scope.userId && friend.userType == $scope.userType){
          if(friend.friends){
            for(var j = 0 ;j < friend.friends.length;j++){
              var f = friend.friends[j];
              if(user.userId == f){
                return true;
              }
            }
          }
        }
      }

      return false;
    }

    $scope.getUserFriends = function(){
      var lst = [];
      $scope.friendAllList.forEach(friend=>{
        if(friend.userId == $scope.userId && friend.userType == $scope.userType){
          if(friend.friends){
            friend.friends.forEach(f=>{

              $scope.friendAllList.forEach(ff =>{
                if(ff.userId == f){
                  lst.push(ff);
                }
              })
              

          })
          }
          
        }  
      });
      return lst;
    }

    $scope.isChat = false;
    $scope.currentChat = null; //User dang chat
    $scope.currentListMsg = [];
    $scope.mapAllMsg = {};
    $scope.textInput = "";

    $scope.userId = "";
    $scope.userType = "0";

    $scope.newFriend = null;
    $scope.addNewFriend = function(){
      if($scope.newFriend.userId == null){
        alert('Insert new friend user id');
      }else{
        var userIdArr = $scope.newFriend.userId.split(",");
        var newFriendUsers = [];
        userIdArr.forEach(uId =>{
          var newUser = {userId:uId,userType:$scope.newFriend.userType,active:false,friends:[]};
          $scope.friendAllList.push(newUser);
          newFriendUsers.push(newUser);
        });
        
        $scope.friendAllList.forEach(friend =>{
          if(friend.userId == $scope.userId && friend.userType == $scope.userType){
            userIdArr.forEach(uid =>{
              friend.friends.push(uid);
            });
          }
        })
        addNewFriend(newFriendUsers);
        $scope.newFriend = null;
      }
    }
    $scope.getDateDisplay = function(date){
      return date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    }

    $scope.addNewMessage = function(isMe,user,text){
      // message duoc gui tu toi
      var msg = {text:text,date:new Date(),isMe:isMe};
      var {userId,userType} = user;
      var lstMsg = null;
      if($scope.mapAllMsg[userId]){
        lstMsg = $scope.mapAllMsg[userId];
      }else{
        lstMsg = [];
      }
      lstMsg.push(msg);
      $scope.mapAllMsg[userId] = lstMsg;
      if($scope.currentChat && userId == $scope.currentChat.userId && userType == $scope.currentChat.userType){
        $scope.currentListMsg = lstMsg;
        var objDiv = document.getElementById("chat-msg-content");
        objDiv.scrollTop = objDiv.scrollHeight;
      }
    }

    $scope.sendMsg = function(){
      if($scope.currentChat != null){
        if($scope.textInput == ""){
          alert('Input a meassage');
        }else{
          sendMsg({userId:$scope.currentChat.userId,userType:$scope.currentChat.userType},$scope.textInput);
          $scope.addNewMessage(true,{userId:$scope.currentChat.userId,userType:$scope.currentChat.userType},$scope.textInput);
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
    $scope.getFriendOnlineCB = function(friendOnlineList,missCallList,missMsgList){
      let userFriends = $scope.getUserFriends();
      for(var i = 0;i < friendOnlineList.length;i++){
        for(var j = 0; j < userFriends.length;j++){
          if(userFriends[j].userId == friendOnlineList[i].userId &&
              userFriends[j].userType == friendOnlineList[i].userType){
                if( friendOnlineList[i].active == true){
                  userFriends[j].active = true;
                }
          }
        }
      }
      $scope.$apply();

      if(missCallList && missCallList.length > 0){
        alert('You have miss call:'+missCallList.length);
      }

      if(missMsgList && missMsgList.length > 0){
        missMsgList.forEach(missMsg =>{
          console.log('from:' + missMsg.user.userId + '|MSG:' + missMsg.msg );
        })
        alert('You have miss msg:'+missMsgList.length);
      }
    }

    $scope.newFriendOnlineCB = function(user){
      console.log('New Friend Online:'+user.teststring);
      var isFound = false;
      for(var i = 0;i < $scope.friendAllList.length;i++){
        if($scope.friendAllList[i].userId == user.userId
         && $scope.friendAllList[i].userType == user.userType){

          isFound = true;
          $scope.friendAllList[i].active = true;
        }

        if($scope.friendAllList[i].userId == $scope.userId
          && $scope.friendAllList[i].userType == $scope.userType){
 
           var friendList= $scope.friendAllList[i].friends;
           var foundFriend = false;
           for(var j = 0 ;j < friendList.length;j++){
             if(friendList[j] == user.userId){
              foundFriend = true;
             }
           }
           if(!foundFriend){
            friendList.push(user.userId);
           }
         }
      }
      if(!isFound){
        $scope.friendAllList.push({userId:user.userId,userType:user.userType,active:true});
      }


      $scope.$apply();
    }

    $scope.disconectFriend = function(user){
      let {userId,userType} = user;

      if($scope.friendCall && $scope.friendCall.userId == userId && $scope.friendCall.userType == userType){
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
      $scope.addNewMessage(false,user,msg);
      $scope.$apply();
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

    $scope.offlineCallNow = function(user){
      $scope.calling = false;
      $scope.makeCall = false;
      $scope.friendCall = null;
      $scope.statusCall = '';
      setLocalStream(null);
      alert('User Not Online Now');
      $scope.$apply();
    }

    $scope.onDisconectSocket = function(){
      alert('discon');
    }

    $scope.onConnectSocket = function(){
      alert('connect');
    }

    $scope.join = function() {
      var isFound = false;
      for(var i = 0;i < $scope.friendAllList.length;i++){
        if($scope.friendAllList[i].userId == $scope.userId &&
              $scope.friendAllList[i].userType == $scope.userType){
              isFound = true;
        }
      }
      let userFriends = $scope.getUserFriends();
      if(!isFound){
        var newUser = {userId: $scope.userId,userType: $scope.userType,friends:[]};
        $scope.friendAllList.push(newUser);
      }

      $scope.isLogin = true;
      
      let config = {'socketURL':SERVER_URL};
        let user = {userId:$scope.userId,userType:$scope.userType,userFriends:userFriends};
        user.teststring = '1234123'+$scope.userId;
        let callback = {
          getFriendOnlineCB:$scope.getFriendOnlineCB,//Khi co danh sach ban online tra ve
          newFriendOnlineCB:$scope.newFriendOnlineCB,//khi co them 1 user online
          disconectFriend:$scope.disconectFriend,// khi co 1 user disconect
          startCallSuccessCB:$scope.startCallSuccessCB,// khi start call success
          endCallCB:$scope.endCallCB,// Khi yeu cau ket thuc cuoc goi
          onNewCallCB:$scope.onNewCallCB,// khi co cuoc goi moi
          onNewMsgCB:$scope.onNewMsgCB,// khi co tin nhan moi
          onBusyCallCB:$scope.onBusyCallCB,
          offlineCallNow: $scope.offlineCallNow,
          onDisconectSocket: $scope.onDisconectSocket,
          onConnectSocket: $scope.onConnectSocket,
        };
        createSocketRTC(config,user,callback);

        let friendTest = [{"speciality":{"id":"3","name":"Sản phụ khoa, Nam khoa"},"education":"Thạc Sĩ","name":"Nguyễn Văn B","age":11,"isonline":false,"description":"Đây là mô tả","avata":"/temp/upload_19377a5d0fcd439ce2cee3964abd5995.jpg","email":"doctortest2@gmail.com","phone":"12345","password":"doctor2","birthday":1543622400000,"training_process":"Null","working_process":"Null","degree_name":"Tiến Sĩ","department_name":"Phòng khám tự nguyện","day_off":"Null","position_name":"Trưởng khoa","certificate":"Null","experience":"Null","academic_rank_name":"Phó giáo sư","home_town":"Null","birthplace":"Null","organization":"Null","research_work":"Null","place":"Phòng A1","disease_name":"tiêu hóa, gan mật","language_name":"Null","doctor_id":"wjbFmWYBOMOzM1zlQthy","userId":"wjbFmWYBOMOzM1zlQthy","userType":0}];
        addNewFriend(friendTest);
    }

    $scope.callFriend = function(friend){
      let {userId,active} = friend;
      if($scope.calling){
        alert('You are calling');
      }else{
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
      $scope.isChat =true;
      $scope.currentChat = friend;
      if($scope.mapAllMsg[userId]){
          $scope.currentListMsg = $scope.mapAllMsg[userId];
      }else{
        $scope.currentListMsg = [];
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
