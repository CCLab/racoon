var express   = require('express');

var user      = require('./user');
var search    = require('./search');
var db        = require('./db');

var app       = module.exports = express.createServer();


// Configuration
app.register('.html', require('ejs'));
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ secret: "staszek i janek" }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
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
  delete req.session.username;
  res.render( 'index.html', {
    title: 'Szop dano-pracz!'
  });
});

//////////////   U S E R   ///////////////
app.post('/login/', user.login );
app.get ('/error_login/', user.error_login );
app.get ('/new_user/', user.new_user );
app.post('/register/', user.register );
app.get ('/user/:name', user.page );


//////////////   S E A R C H   ///////////////
app.get ('/search/:poviat', search.poviat );
app.get ('/search/', search.general );


//////////////   D B   ///////////////
app.post('/approved/', db.approved );
app.post('/update/', db.update );
app.get ('/get_comments/', db.get_comments );
app.post('/comment/', db.comment );


app.listen( '3030' );
//app.listen( 10100, '91.227.40.36' );
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);


