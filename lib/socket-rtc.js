module.exports = function socketRTC(io,config) {
  let {exchange} = config;
    io.on('connection', (socket) => {
      // socket.on('join', (data,fn) => {
      //   // we tell the client to execute 'new message'
      //   var roomId = data.roomId;
      //   var name = data.name;
      //
      //   socket.roomID = roomId;
      //   mapUserName[socket.id] = name;
      //   socket.join(roomId);
      //   console.log((new Date()).getTime() + 'join-id:'+socket.id)
      //   var socketIds = socketIdsInRoom(roomId);
      //   let friends = socketIds.map((socketId) => {
      //     return {
      //       socketId: socketId,
      //       name: mapUserName[socketId]
      //     }
      //   }).filter((friend) => friend.socketId != socket.id);
      //   console.log("friend LIST---:"+friends.length);
      //   for(var i = 0 ;i < friends.length;i++){
      //       console.log('SocketID:'+friends[i].socketId + "|name:"+friends[i].name);
      //   }
      //   fn(friends);
      //   //broadcast
      //   // friends.forEach((friend) => {
      //   //   io.sockets.connected[friend.socketId].emit("join", {
      //   //     socketId: socket.id, name
      //   //   });
      //   // });
      //   // socket.emit('join success',arr);
      // });

      socket.on('exchange', (data) => {
        // we tell the client to execute 'new message'
        exchange(socket,data);

        // socket.emit('join success',arr);
      });

      var addedUser = false;

      // when the user disconnects.. perform this
      socket.on('disconnect', () => {
        console.log('disconnect-id:'+socket.id);
        // if (addedUser) {
        //   --numUsers;

          // echo globally that this client has left
          socket.broadcast.emit('leave',socket.id);
        // }
      });
      
    });


}

//  WebRTC Signaling
// function socketIdsInRoom(roomId) {
//   var socketIds = io.nsps['/'].adapter.rooms[roomId];
//   if (socketIds) {
//     var sockets = socketIds.sockets
//     if(sockets){
//       var collection = [];
//       for (var key in sockets) {
//         collection.push(key);
//       }
//       return collection;
//     }
//   } else {
//     return [];
//   }
// }
