module.exports = function socketRTC(io,config) {
  let {exchange} = config;
    io.on('connection', (socket) => {

      socket.on('exchange', (data) => {
        // we tell the client to execute 'new message'
        exchange(socket,data);

        // socket.emit('join success',arr);
      });
    });
}
