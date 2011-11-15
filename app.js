var express      = require('express');
var MongoDBStore = require('connect-mongodb');
var MemoryStore  = express.session.MemoryStore,
    sessionStore = new MemoryStore();

console.log( sessionStore );
var user   = require('./user');
var search = require('./search');
var db     = require('./db');
//var sock   = require('./sock');

var app = module.exports = express.createServer();

var connect = require('connect');
var sio = require('socket.io').listen( app );
var parseCookie = connect.utils.parseCookie;
var Session = connect.middleware.session.Session;

// Configuration
app.register( '.html', require('ejs') );
app.configure( function () {
    app.set( 'views', __dirname + '/views' );
    app.set( 'view engine', 'ejs' );
    app.use( express.bodyParser() );
    app.use( express.cookieParser() );
    app.use( express.methodOverride() );
    app.use( express.cookieParser() );
    app.use( express.session({
        secret: 'very-secret-key',
        store: sessionStore,
        key: 'express.sid'
    }));
    app.use( app.router );
    app.use( express.static( __dirname + '/public' ));
});

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
    app.use(express.errorHandler());
});

// initializing socket.io authentication mechanism
sio.set( 'authorization', function ( data, accept ) {
    if( data.headers.cookie ) {
        data.cookie = parseCookie( data.headers.cookie );
        data.sessionID = data.cookie['express.sid'];
        data.sessionStore = sessionStore;
        sessionStore.get( data.sessionID, function ( err, session ) {
            if ( err || !session ) {
                accept('Error', false);
            } else {
                data.session = new Session( data, session );
                accept( null, true );
            }
        });
    } else {
       return accept( 'No cookie transmitted.', false );
    }
});

sio.sockets.on( 'connection', function ( socket ) {

    socket.on( 'comment', function ( data ) {
        sessionStore.get( socket.handshake.sessionID, function ( err, session ) {
            db.comment( session.user, data.id, data.text );
        });

        socket.broadcast.emit( 'update-comment', { id: data.id } );
    });

    socket.on( 'update_cell', function ( data ) {
        db.update( data.key, data.value, data.id );

        socket.broadcast.emit( 'update-cell', { id: data.id, key: data.key, value: data.value } );
    });

});


// Routes
//////////////   H O M E   ///////////////
app.get( '/', function ( req, res ) {
  delete req.session.user;
  res.render( 'index.html', {
    title: 'Szop dano-pracz!'
  });
});

//////////////   U S E R   ///////////////
app.post('/login/', user.login );
app.get ('/logout/', user.logout );
app.get ('/error_login/', user.error_login );
app.get ('/new_user/', user.new_user );
app.post('/register/', user.register );
app.get ('/user/:name', is_login, user.page );


//////////////   S E A R C H   ///////////////
app.get ('/search/:poviat', is_login, search.poviat );
app.get ('/search/', is_login, search.general );


//////////////   D B   ///////////////
app.post('/approved/', db.approved );
app.post('/update/', db.update );
app.get ('/get_comments/', db.get_comments );
app.post('/comment/', db.comment );

//////////////   M I D D L E W A R E   //////////////
function is_login( req, res, next ) {
    if( !req.session.user ) {
        res.redirect( '/' );
    }
    else {
        next();
    }
}

app.listen( '3030' );
//app.listen( 10100, '91.227.40.36' );
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);


