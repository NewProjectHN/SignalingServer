
var app = angular.module('myApp', []);
var deviceId = Date.now();
var SERVER_URL = '';
let localStream = null;

window.onFriendCallback = (email, stream, name) => {
  // let friend = friends.filter(friend => friend.socketId == socketId)[0];
  // console.log("OnFriendCallback: ", friends);
  let thumbnailElement = document.createElement("div");
  thumbnailElement.className = "video-thumbnail";
  thumbnailElement.id = "friend-" + email;

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
  nameElement.innerText = name;
  thumbnailElement.appendChild(nameElement);

  document.getElementsByClassName("videos-container")[0].appendChild(thumbnailElement);
}

window.onFriendLeft = (email) => {
  var elementId = "friend-" + email;
  var element = document.getElementById(elementId);
  if(element){
    element.parentNode.removeChild(element);
  }
}

app.controller('myCtrl', function($scope,$http) {
    $scope.isLogin = false;
    $scope.name = "a";
    $scope.room = "ROOM_TEST";

    $scope.isVideo = true;
    $scope.isAudio = false;

    $scope.calling = false;
    $scope.makeCall = false;
    $scope.hasNewCall = false;

    $scope.friendAllList = null;

    $scope.outRoom = function(){
      socket.close();
      $scope.isLogin = false;
    }

    //

    $scope.switchAudio = function(){
        $scope.isAudio = !$scope.isAudio;
        loadLocalStream(false,$scope.isAudio,$scope.isVideo);
    }

    $scope.switchVideo = function(){
        $scope.isVideo = !$scope.isVideo;
        loadLocalStream(false,$scope.isAudio,$scope.isVideo);
    }
// {"url": "stun:stun.l.google.com:19302"},
    var configuration = {"iceServers": [
        {"url": "stun:stun.l.google.com:19302"},
        {
        	"url": 'turn:35.187.252.124:2222?transport=tcp',
        	"credential": 'WebRTC@123456',
        	"username": 'webrtc'
        }
    ]};

    var peerConnections = {}; //map of {socketId: socket.io id, RTCPeerConnection}
    var remoteViewContainer = document.getElementById("remoteViewContainer");

    $scope.friends = []; //list of {socketId, name}
    let me = null; //{socketId, name}

    var socket = null;

    $scope.afterJoin = function(){

      socket = io(SERVER_URL);

      socket.on('exchange', function(data){
        console.log((new Date()).getTime() + " - exchange-from-server:", data);
        exchange(data);
      });

      socket.on('leave', function(email){
        leave(email);
      });

      // socket.on('connect', function(data) {
      //   console.log('connect');
      //
      // });

      socket.on('connect', function(data) {
        console.log('connect');
        socket.emit('authentication', {token: $scope.token});
      });

      socket.on('authenticated', function(data) {
        console.log('authenticated');
        // $scope.afterJoin();
      });

      // socket.on("join", function(friend) {
      //   //new friend:
      //   $scope.friends.push(friend);
      //   console.log("New friend joint conversation: ", friend);
      // });

      socket.on("friend-online", function(email) {
        //new friend:
        console.log("New friend joint conversation: ", email);
        var isFound = false;
        for(var i = 0;i < $scope.friendAllList.length;i++){
          if($scope.friendAllList[i].email == email){
            isFound = true;
            $scope.friendAllList[i].active = true;
          }
        }
        if(!isFound){
          $scope.friendAllList.push({email:email,active:true});
        }
        $scope.$apply();

      });

      socket.on("getallfriend", function(friends) {
        // alert(1)
        //new friend:
        $scope.friendAllList = [];
        $scope.friendAllList.push(...friends);
        console.log("List Of All Friends: ", $scope.friendAllList);
        $scope.$apply();
      });

      socket.on("friend-disconnect", function(email) {
        // alert(1)
        //new friend:
        console.log("Friend disconnect:"+email);
        if($scope.friendCall == email){
          if($scope.calling === true){
            $scope.calling = false;
            leave(email);
          }

          $scope.makeCall = false;
          $scope.hasNewCall = false;
        }

        for(var i = 0;i < $scope.friendAllList.length;i++){
          if($scope.friendAllList[i].email == email){
            $scope.friendAllList[i].active = false;
          }
        }

        $scope.$apply();
      });

      socket.on("call-from", function(email) {
        // alert(1)
        //new friend:
        console.log('New Call From'+email);
        if($scope.calling === true || $scope.makeCall === true || $scope.hasNewCall === true){
            socket.emit('busy-now',email);
        }else{
          $scope.hasNewCall = true;
          $scope.friendCall = email;
          socket.emit('ringing',email);
          $scope.$apply();
        }

      });

      socket.on("busy-now", function(email) {
        $scope.calling = false;
        $scope.makeCall = false;
        $scope.friendCall = null;
        $scope.statusCall = '';
        // $scope.$apply();
        loadLocalStream(null);
        $scope.$apply();
        alert(email + ' busy now!!!');
      });

      socket.on("ringing", function(email) {
        // alert(1)
        //new friend:
        if(email == $scope.friendCall){
          $scope.statusCall = 'Ringing';
        }
        $scope.$apply();
      });

      socket.on("end-call-from", function(email) {
        // alert(1)
        //new friend:
        if(email == $scope.friendCall){
          $scope.statusCall = '';
          $scope.hasNewCall = false;
          $scope.friendCall = null;
          alert('Cancel call from:'+email);
        }
        $scope.$apply();
      });

      socket.on("refuse-call-from", function(email) {
        // alert(email +' refuse your call!');
        console.log(email + ':Refuse Call From:'+$scope.friendCall);
        $scope.makeCall = false;
        $scope.calling = false;
        // $scope.callFrom = friendEmail;
        $scope.$apply();
      });

      socket.on("start-calling", function(email) {
        // Khoi tao RCT connection
        $scope.calling = true;
        $scope.makeCall = false;
        createPeerConnection(email, true);
        // $scope.callFrom = friendEmail;
        $scope.$apply();
      });

      socket.on("finish-calling", function(email) {
        setLocalStream(null);
        // alert('finish call with:'+email);
        $scope.makeCall = false;
        $scope.calling = false;
        $scope.hasNewCall = false;
        leave($scope.friendCall);
        // $scope.callFrom = friendEmail;
        $scope.$apply();
      });

      $scope.isLogin = true;
      // $scope.$apply();
    };

    function callbackReceive(){
      socket.emit('start-call',$scope.friendCall);
      // alert('Start call width:'+$scope.friendCall);
    }

    $scope.receiveCall = function(){
        $scope.calling = true;
        $scope.hasNewCall = false;
        loadLocalStream(false,$scope.isAudio,$scope.isVideo,callbackReceive);
    }



    $scope.refuseCall = function(){
        $scope.hasNewCall = false;
        socket.emit('refuse-call-from',$scope.friendCall);
    }

    $scope.token = null;
    $scope.join = function(roomId, name, callback) {

      $http({
        method:'POST',
        url: SERVER_URL + '/api/checkLogin',
        data:{"username":$scope.name,"password":'test'},
        headers : {'Content-Type': 'application/json'}
      }).then(function(res,status){
          console.log(res.data.token);
          if(res.data.status == 'connected'){
            alert('You are connected. Please choose another user');
          }else if(res.data.token != null){
            $scope.token = res.data.token;
            callback();
          }else{
            alert('Not correct user name!!!');
          }
      });


      // if(socket.disconnected){
      //   socket = io();
      // }

      // socket.emit('join', {roomId:roomId, name:name}, function(result){
      //   console.log(result);
      //   $scope.friends = result;
      //   $scope.friends.forEach((friend) => {
      //     createPeerConnection(friend, true);
      //   });
      //
      //   me = {
      //     socketId: socket.id,
      //     name: name
      //   }
      //   if(callback != null) {
      //     callback();
      //   }
      // });
    }

    $scope.callFriend = function(email,active){
      if($scope.calling){
        alert('You are calling');
      }else if(active){
          $scope.calling = true;
          $scope.makeCall = true;
          $scope.friendCall = email;
          $scope.statusCall = 'Connecting';
          // $scope.$apply();
          loadLocalStream(false,$scope.isAudio,$scope.isVideo);
          socket.emit("call-to",email);
      }
    }

    $scope.endCall = function(){
      endCallTo();
    }

    $scope.joinRoom = function(){
      if($scope.name == ""){
          alert("Please insert name!");
      }else if($scope.room == ""){
          alert("Please insert a room to join!");
      }else{
          $scope.join($scope.room,$scope.name,$scope.afterJoin);
      }
    }

    $scope.finishCall = function(){
      endCallTo();
    }

    function endCallTo(){
      $scope.calling = false;
      $scope.makeCall = false;
      setLocalStream(null);
      leave($scope.friendCall);
      socket.emit("finish-call",$scope.friendCall);
    }

    // $scope.joinRoom();
    function createPeerConnection(email, isOffer) {
      // let socketId = friend.socketId;
      // let userName = friend.name;
      console.log(email);
      var retVal = new RTCPeerConnection(configuration);

      peerConnections[email] = retVal;

      retVal.onicecandidate = function (event) {
        // console.log((new Date()).getTime() + 'onicecandidate', event);
        if (event.candidate) {
          socket.emit('exchange', {'to': email, 'candidate': event.candidate });
        }
      };

      function createOffer() {
        retVal.createOffer(function(desc) {
          console.log((new Date()).getTime() + 'createOffer', desc);
          retVal.setLocalDescription(desc, function () {
            console.log((new Date()).getTime() + 'createOffer-setLocalDescription', retVal.localDescription);
            socket.emit('exchange', {'to': email, 'sdp': retVal.localDescription });
          }, logError);
        }, logError);
      }

      retVal.onnegotiationneeded = function () {
        // console.log((new Date()).getTime() + 'onnegotiationneeded' + ' - isOffer|'+isOffer);
        if (isOffer) {
          createOffer();
        }
      }

      retVal.oniceconnectionstatechange = function(event) {
        // console.log((new Date()).getTime() + 'oniceconnectionstatechange', event);
        if (event.target.iceConnectionState === 'connected') {
          createDataChannel();
        }
      };

      retVal.onsignalingstatechange = function(event) {
        // console.log((new Date()).getTime() + 'onsignalingstatechange', event);
      };

      retVal.onaddstream = function (event) {
        console.log((new Date()).getTime() + 'onaddstream', event);
        //var element = document.createElement('video');
        //element.id = "remoteView" + email;
        //element.autoplay = 'autoplay';
        //element.src = URL.createObjectURL(event.stream);
        //remoteViewContainer.appendChild(element);
        if(window.onFriendCallback != null) {
          window.onFriendCallback(email, event.stream,"");
        }
      };

      if(localStream != null){
        console.log('locastreammmmmmmmmm',localStream);
        try{
          retVal.addStream(localStream);
            // window.onFriendCallback(email, localStream,"");
        }catch(e){
          alert('Error get device!!!');
        }
      }else{
        alert('You don\'t have device to call');
      }

      function createDataChannel() {
        if (retVal.textDataChannel) {
          return;
        }
        var dataChannel = retVal.createDataChannel("text");

        dataChannel.onerror = function (error) {
          console.log((new Date()).getTime() + "dataChannel.onerror", error);
        };

        dataChannel.onmessage = function (event) {
          console.log((new Date()).getTime() + "dataChannel.onmessage:", event.data);
          if(window.onDataChannelMessage != null) {
            window.onDataChannelMessage(JSON.parse(event.data));
          }
        };

        dataChannel.onopen = function () {
          console.log((new Date()).getTime() + 'dataChannel.onopen');
        };

        dataChannel.onclose = function () {
          console.log((new Date()).getTime() + "dataChannel.onclose");
        };

        retVal.textDataChannel = dataChannel;
      }

      return retVal;
    }

    function exchange(data) {
      var fromId = data.from;
      var pc;
      if (fromId in peerConnections) {
        console.log((new Date()).getTime() + 'id in peer');
        pc = peerConnections[fromId];
      } else {
        console.log((new Date()).getTime() + 'id not in peer');
        // let friend = $scope.friends.filter((friend) => friend.email == fromId)[0];
        // if(friend == null) {
        //   friend = {
        //     socketId: fromId,
        //     name: data.name
        //   }
        // }
        pc = createPeerConnection(fromId, false);
      }

      if (data.sdp) {
        // console.log((new Date()).getTime() + 'exchange sdp', data);
        pc.setRemoteDescription(new RTCSessionDescription(data.sdp), function () {
          if (pc.remoteDescription.type == "offer")
          pc.createAnswer(function(desc) {
            // console.log((new Date()).getTime() + 'createAnswer', desc);
            pc.setLocalDescription(desc, function () {
              // console.log((new Date()).getTime() + 'data.sdp - setLocalDescription', pc.localDescription);
              socket.emit('exchange', {'to': fromId, 'sdp': pc.localDescription });
            }, logError);
          }, logError);
        }, logError);
      } else {
        // console.log((new Date()).getTime() + 'exchange----candidate', data.candidate);
        pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    }

    function leave(email) {
      // console.log((new Date()).getTime() + 'leave', email);
      var pc = peerConnections[email];
      if(pc){
        pc.close();
        delete peerConnections[email];
      }
      if(window.onFriendLeft) {
        window.onFriendLeft(email);
      }
    }

    function logError(error) {
      console.log("logError", error);
    }


    //------------------------------------------------------------------------------
    // Services
    function countFriends(roomId, callback) {
      socket.emit("count", roomId, (count) => {
        console.log("Count friends result: ", count);
        callback(count);
      });
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
          localStream = stream;
          if(callback){
              callback();
          }
        }, function(error){
            alert(error);
        });
      }else{
          setLocalStream(null);
      }
    }

    function broadcastMessage(message) {
      for (var key in peerConnections) {
        var pc = peerConnections[key];
        pc.textDataChannel.send(JSON.stringify(message));
      }
    }
});

function setLocalStream(stream){
  localStream = stream;
  var selfView = document.getElementById("selfView");
  selfView.srcObject = stream;
}
