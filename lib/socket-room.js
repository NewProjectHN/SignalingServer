// Manage room of user
module.exports = function socketIORoom(io,config) {
    var {callToUser,ringingCall,finishCall,startCall,busyNow,sendMsg,addNewFriend} = config;
    io.on('connection', function(socket) {
      console.log('connnnnnnnnnnnnnnnnnn');

      socket.on('call-to',function(user){
          callToUser(socket,user);
      })

      // socket.on('refuse-call-from',function(user){
      //     refuseCall(socket,user);
      // })

      socket.on('ringing',function(user){
          ringingCall(socket,user);
      })

      socket.on('finish-call',function(user){
          finishCall(socket,user);
      })

      socket.on('start-call',function(user){
        startCall(socket,user);
      });

      socket.on('busy-now',function(user){
        busyNow(socket,user);
      });

      socket.on('send-msg',function(data){
        sendMsg(socket,data);
      });

      socket.on('add-new-friend',function(users){
        addNewFriend(socket,users);
      });


    });

    // socket.on('call-to', function() {
    //   console.log('call to');
    // });

}
