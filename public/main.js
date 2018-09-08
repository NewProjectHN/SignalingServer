
var app = angular.module('myApp', []);
app.controller('myCtrl', function($scope) {
    $scope.join = false;
    $scope.name = "";
    $scope.joinRoom = function(){
    	if($scope.name == ""){
          alert("Please insert name");
      }else{

          join('ROOM_TEST',$scope.name,afterJoin);
      }
    }

    loadLocalStream(false);
    var socket = io();

    var configuration = {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]};

    var peerConnections = {}; //map of {socketId: socket.io id, RTCPeerConnection}
    var remoteViewContainer = document.getElementById("remoteViewContainer");
    let localStream = null;
    $scope.friends = []; //list of {socketId, name}
    let me = null; //{socketId, name}

    function afterJoin(){
      $scope.join = true;
    }

    function join(roomId, name, callback) {
      socket.emit('join', {roomId:roomId, name:name}, function(result){
        $scope.friends = result;
        $scope.friends.forEach((friend) => {
          createPeerConnection(friend, true);
        });

        me = {
          socketId: socket.id,
          name: name
        }
        if(callback != null) {
          callback();
        }
      });
    }

    function createPeerConnection(friend, isOffer) {
      let socketId = friend.socketId;
      var retVal = new RTCPeerConnection(configuration);

      peerConnections[socketId] = retVal;

      retVal.onicecandidate = function (event) {
        console.log((new Date()).getTime() + 'onicecandidate', event);
        if (event.candidate) {
          socket.emit('exchange', {'to': socketId, 'candidate': event.candidate });
        }
      };

      function createOffer() {
        retVal.createOffer(function(desc) {
          console.log((new Date()).getTime() + 'createOffer', desc);
          retVal.setLocalDescription(desc, function () {
            console.log((new Date()).getTime() + 'setLocalDescription', retVal.localDescription);
            socket.emit('exchange', {'to': socketId, 'sdp': retVal.localDescription });
          }, logError);
        }, logError);
      }

      retVal.onnegotiationneeded = function () {
        console.log((new Date()).getTime() + 'onnegotiationneeded');
        if (isOffer) {
          createOffer();
        }
      }

      retVal.oniceconnectionstatechange = function(event) {
        console.log((new Date()).getTime() + 'oniceconnectionstatechange', event);
        if (event.target.iceConnectionState === 'connected') {
          createDataChannel();
        }
      };

      retVal.onsignalingstatechange = function(event) {
        console.log((new Date()).getTime() + 'onsignalingstatechange', event);
      };

      retVal.onaddstream = function (event) {
        console.log((new Date()).getTime() + 'onaddstream', event);
        //var element = document.createElement('video');
        //element.id = "remoteView" + socketId;
        //element.autoplay = 'autoplay';
        //element.src = URL.createObjectURL(event.stream);
        //remoteViewContainer.appendChild(element);
        if(window.onFriendCallback != null) {
          window.onFriendCallback(socketId, event.stream);
        }
      };

      retVal.addStream(localStream);

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
        pc = peerConnections[fromId];
      } else {
        let friend = $scope.friends.filter((friend) => friend.socketId == fromId)[0];
        if(friend == null) {
          friend = {
            socketId: fromId,
            name: ""
          }
        }
        pc = createPeerConnection(friend, false);
      }

      if (data.sdp) {
        console.log((new Date()).getTime() + 'exchange sdp', data);
        pc.setRemoteDescription(new RTCSessionDescription(data.sdp), function () {
          if (pc.remoteDescription.type == "offer")
          pc.createAnswer(function(desc) {
            console.log((new Date()).getTime() + 'createAnswer', desc);
            pc.setLocalDescription(desc, function () {
              console.log((new Date()).getTime() + 'setLocalDescription', pc.localDescription);
              socket.emit('exchange', {'to': fromId, 'sdp': pc.localDescription });
            }, logError);
          }, logError);
        }, logError);
      } else {
        console.log((new Date()).getTime() + 'exchange----candidate', data.candidate);
        pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    }

    function leave(socketId) {
      console.log((new Date()).getTime() + 'leave', socketId);
      var pc = peerConnections[socketId];
      pc.close();
      delete peerConnections[socketId];
      if(window.onFriendLeft) {
        window.onFriendLeft(socketId);
      }
    }

    socket.on('exchange', function(data){
      console.log((new Date()).getTime() + " - exchange-from-server:", data);
      exchange(data);
    });

    socket.on('leave', function(socketId){
      leave(socketId);
    });

    socket.on('connect', function(data) {
      console.log('connect');
    });

    socket.on("join", function(friend) {
      //new friend:
      $scope.friends.push(friend);
      console.log("New friend joint conversation: ", friend);
    });

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

    function loadLocalStream(muted) {
      navigator.getUserMedia({ "audio": true, "video": false }, function (stream) {
        console.log((new Date()).getTime() + 'loadLocalStream');
        localStream = stream;
        var selfView = document.getElementById("selfView");
        selfView.src = URL.createObjectURL(stream);
        selfView.muted = muted;
      }, function(error){
          alert(error);
      });
    }

    function broadcastMessage(message) {
      for (var key in peerConnections) {
        var pc = peerConnections[key];
        pc.textDataChannel.send(JSON.stringify(message));
      }
    }
});
