var
sio.sockets.on('connection', function (socket) {
    sessionStore.get( socket.handshake.sessionID, function ( err, session ) {
        // nothing to do
    });
});


app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

//io.sockets.on('connection', function ( socket ) {
//  console.log( socket );
//  socket.emit('news', { hello: 'world' });
//  socket.on('my other event', function (data) {
//    console.log(data);
//  });
//
//  socket.on( 'approved', function ( data ) {
//      console.log( data );
//      socket.broadcast.emit( 'update', data );
//  });
//});
