// Manage room of user
module.exports = function socketIORoom(io,config) {
    var {callToUser,refuseCall,ringingCall,finishCall,startCall,busyNow} = config;
    io.on('connection', function(socket) {
      console.log('connnnnnnnnnnnnnnnnnn');

      socket.on('call-to',function(email){
          callToUser(socket,email);
      })

      socket.on('refuse-call-from',function(email){
          refuseCall(socket,email);
      })

      socket.on('ringing',function(email){
          ringingCall(socket,email);
      })

      socket.on('finish-call',function(email){
          finishCall(socket,email);
      })

      socket.on('start-call',function(email){
        startCall(socket,email);
      });

      socket.on('busy-now',function(email){
        busyNow(socket,email);
      });

    });

    // socket.on('call-to', function() {
    //   console.log('call to');
    // });

}
