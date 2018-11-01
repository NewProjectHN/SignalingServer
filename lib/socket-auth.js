'use strict';
// Input param
//1.authenticate function: verify socket

module.exports = function socketIOAuth(io,config) {
  let {authenticate,disconnect} = config
  let timeout = 1000;// max time to validate token

  // Remove all socket in room that not authenticate
  forbidConnections(io.nsps);

  io.on('connection', function(socket) {
    console.log('on connection id:'+ socket.id);
    socket.auth = false;
    socket.on('authentication', function(data) {
      console.log('authentication:'+ socket.id);
      authenticate(data, function(err, success) {
        if (success) {
          console.log('Authenticated socket %s', socket.id);
          socket.auth = true;

          restoreConnection(io.nsps, socket);

          socket.emit('authenticated', success);
          return {socket: socket};
        } else if (err) {
          console.log('Authentication error socket %s: %s', socket.id, err.message);
          socket.emit('unauthorized', {message: err.message}, function() {
            socket.disconnect();
          });
        } else {
          console.log('Authentication failure socket %s', socket.id);
          socket.emit('unauthorized', {message: 'Authentication failure'}, function() {
            socket.disconnect();
          });
        }
        return null;
      });

    });

    socket.on('disconnect', function() {
      if(disconnect){
        return disconnect(socket);
      }
    });


    if (timeout !== 'none') {
      setTimeout(function() {
          // If the socket didn't authenticate after connection, disconnect it
          if (!socket.auth) {
            console.log('Disconnecting socket %s', socket.id);
            socket.disconnect('unauthorized');
          }else{

          }
        }, timeout);
    }

  });
};

/**
 * Set a listener so connections from unauthenticated sockets are not
 * considered when emitting to the namespace. The connections will be
 * restored after authentication succeeds.
 */
function forbidConnections(nsps) {
  for(let key in nsps){
      var nsp = nsps[key];
      nsp.on('connect', function(socket) {
        if (!socket.auth) {
          console.log('removing socket from %s', nsp.name);
          delete nsp.connected[socket.id];
        }
      });
  }
}

/**
 * If the socket attempted a connection before authentication, restore it.
 */
function restoreConnection(nsps, socket) {
  if(nsps){
      for(let key in nsps){
        let nsp = nsps[key];
        let {sockets} = nsp;
        for(let soketId in sockets){
            if(soketId == socket.id){
              console.log('restoring socket to %s', nsp.name);
              nsp.connected[socket.id] = socket;
            }
        }
      }
  }
}
