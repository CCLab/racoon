var express      = require('express');
var MongoDBStore = require('connect-mongodb');
var MemoryStore  = express.session.MemoryStore,
    sessionStore = new MemoryStore();

var user   = require('./user');
var search = require('./search');
var db     = require('./db');
var expert = require('./expert');

var app = module.exports = express.createServer();


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

// Routes
//////////////   H O M E   ///////////////
app.get( '/', function ( req, res ) {
  delete req.session.user;
  res.render( 'index.html', {
    title: 'Witaj w Racoonie!'
  });
});

//////////////   U S E R   ///////////////
app.post('/login/', user.login );
app.get ('/logout/', user.logout );
app.get ('/error_login/', user.error_login );
app.get ('/new_user/', user.new_user );
app.post('/register/', user.register );
app.get ('/user/:name', is_login, user.page );
app.post('/user_on/', is_login, user.user_on );

//////////////   S E A R C H   ///////////////
app.get ('/page/:page/search/:poviat', is_login, search.poviat );
app.get ('/page/:page/search/', is_login, search.general );


//////////////   D B   ///////////////
app.post('/approved/', db.approved );
app.post('/update/', db.update );
app.get ('/get_comments/', db.get_comments );
app.post('/comment/', db.comment );
app.post('/check_new_comments/', db.check_new_comments );

//////////////   E X P E R T  ///////////////
app.get ('/expert/', is_expert, expert.page );
app.post('/expert/answer/', is_expert, expert.answer );
app.post('/expert/check_updates/', is_expert, expert.check_updates );
app.post('/expert/get_rows/', is_expert, expert.get_rows );

//////////////   M I D D L E W A R E   //////////////
function is_login( req, res, next ) {
    if( !req.session.user ) {
        res.redirect( '/' );
    }
    else {
        next();
    }
}

function is_expert( req, res, next ) {
    if( !req.session.user || req.session.user !== 'trzewiczek' ) {
        res.redirect( '/' );
    }
    else {
        next();
    }
}

app.listen( '3030' );
//app.listen( 10100, '91.227.40.36' );
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);


