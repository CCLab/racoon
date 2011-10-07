/**
 * Module dependencies.
 */
require.paths.push('/usr/local/lib/node_modules');
var express   = require('express');
var Mongolian = require('mongolian');
var url       = require('url');
var _         = require('underscore');
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
  req.session.username = '';
  res.render( 'index.html', {
    title: 'Racoon wypierze twoje dane!'
  });
});

//////////////   L O G I N   ///////////////
app.post( '/login/', function ( req, res ) {
    var user = req.body.user;
    var pass = req.body.pass;
    var db_users = (new Mongolian).db('victor_db').collection('victor_users');

    // clear session user-login data
    delete req.session.username;

    // get user data from db and check the login
    db_users.findOne({ user: user }, function( err, db_user ) {
        if( !db_user ) {
            req.session.error = 'user';
            res.writeHead( 302, {
                'Location': '/error_login/',
            });
            res.end();
        }
        else if( pass !== db_user['pass'] ) {
            req.session.error = 'pass';
            res.writeHead( 302, {
                'Location': '/error_login/'
            });
            res.end();
        }
        else {
            // on successful login store user name in session
            req.session.username = user;
            res.writeHead( 302, {
                'Location': '/user/' + user
            });
            res.end();
        }
    });
});

//////////////  E R R O R   L O G I N   ///////////////
app.get( '/error_login/', function ( req, res ) {
    // cache the error and clear the session data
    var error = req.session.error;
    delete req.session.error;

    res.render( 'error_login.html', {
        title: 'Błąd logowania',
        error: error
    });
});

//////////////  N E W   U S E R   ///////////////
app.get( '/new_user/', function ( req, res ) {
    res.render( 'new_user.html', {
        title: 'Dodawanie nowego użytkownika',
        error: ''
    });
});


//////////////  R E G I S T E R   ///////////////
app.post( '/register/', function ( req, res ) {
    // form data
    var user = req.body.user;
    var pass = req.body.pass;

    // connect to db
    var db_users = (new Mongolian).db('victor_db').collection('victor_users');

    db_users.findOne({ user: user }, function( err, db_user ) {
        // user already in db --> ask for a new login
        if( !!db_user ) {
            res.render( 'new_user.html', {
                title: 'Dodawanie nowego użytkownika',
                error: 'login_taken'
            });
        }
        else {
            // add user to db
            db_users.insert({
                user: user,
                pass: pass,
                rows: []
            });

            // after successful creation, store user name in session
            req.session.username = user
            // move to user page
            res.writeHead( 302, {
                'Location': '/user/' + user
            });
            res.end();
        }
    });
});


//////////////  U S E R   P A G E   ///////////////
app.get( '/user/:name', function ( req, res ) {
    // if the user is not logged in --> move back to login page
    if ( !req.session.username ) {
        res.writeHead( 302, {
            'Location': '/'
        })
        res.end();
    }

    var user = req.params.name;
    var db_users = (new Mongolian).db('victor_db').collection('victor_users');
    var db_cols = (new Mongolian).db('victor_db').collection('victor_data');
    var db_meta = (new Mongolian).db('victor_db').collection('victor_meta');

    db_users.findOne({ user: user }, function( err, db_user ) {
        // turn _id hashes to ObjectIds
        var ObjectId = require('mongolian').ObjectId;
        var obj_list = db_user['rows'].map( function ( e ) {
            return { '_id': new ObjectId( e ) };
        });

        // get objects
        db_cols.find({ '$or': obj_list }).toArray( function ( err, data ) {
            // create a string list of monumnets
            var list = data.map( function ( e ) {
                return e['wojewodztwo'] + ' :: ' + e['gmina'] + ' :: ' + e['okr_ob'];
            });

            db_meta.find({}).toArray( function ( err, meta_data ) {

                db_cols.find({ 'comments.user': user }).toArray( function ( err, comments_list ) {
                    comments_list = _.flatten( comments_list.map( function ( e ) {
                        var comments = e['comments'].map( function ( c ) {
                            return {
                                user: c['user'],
                                text: c['text'],
                                id: e['_id']+'',
                                parish: e['gmina'],
                                name: e['okr_ob']
                            };
                        }).filter( function ( e ) {
                            return e['user'] === user;
                        });
                        return comments;
                    })).reverse();

                    res.render( 'user.html', {
                        title: 'Strona użytkownika: ' + user,
                        user: user,
                        rows_count: !!obj_list.length ? list.length : 0,
                        rows_list: !!obj_list.length ? list : [],
                        comments_count: comments_list.length,
                        comments_list: comments_list,
                        meta: meta_data
                    });
                });
            });
        });
    });
});


//////////////   S E A R C H  : P O V I A T  ///////////////
app.get( '/search/:poviat', function ( req, res ) {
    var cols = (new Mongolian).db('victor_db').collection('victor_data');

    cols.find({ powiat: req.params.poviat }).toArray( function ( err, data ) {
        res.render( 'table.html', {
            title: 'Racoon',
            data: data,
            user: req.session.username,
            collection: 'Powiat ' + req.params.poviat
        });
    });
});


//////////////   S E A R C H   ///////////////
app.get( '/search/', function ( req, res ) {
    var params = url.parse( req.url, true );
    var what   = params.query.what || '';
    var where  = params.query.where || '';

    var cols = (new Mongolian).db('victor_db').collection('victor_data');
    var query  = {};

    var render = function ( query ) {
        cols.find( query ).toArray( function ( err, data ) {
            var collection;

            if( !!what && !where ) {
                collection = what;
            }
            if( !what && !!where ) {
                collection = where;
            }

            res.render( 'table.html', {
                title: 'Racoon',
                data: data,
                user: req.session.username,
                collection: collection
            });
        });
    };

    if( !!what && !where ) {
        query = {'$or': [
                    { 'okr_ob': new RegExp( what, 'i' ) },
                    { 'okr_zes': new RegExp( what, 'i' ) }
                ]};

        render( query );
    }
    else if( !what && !!where ) {
        query = {'$or': [
                    { 'wojewodztwo': new RegExp( where, 'i' ) },
                    { 'powiat': new RegExp( where, 'i' ) },
                    { 'gmina': new RegExp( where, 'i' ) },
                    { 'miejscowosc': new RegExp( where, 'i' ) }
                ]};

        render( query );
    }
    else if( !!what && !!where ) {
        query = {'$or': [
                    { 'okr_ob': new RegExp( what, 'i' ) },
                    { 'okr_zes': new RegExp( what, 'i' ) }
                ]};

        cols.find( query ).toArray( function ( err, result ) {
            var data = result.filter( function ( e ) {
                var where_exp = new RegExp( where, 'i' );

                return !!where_exp.exec( e['wojewodztwo'] ) ||
                       !!where_exp.exec( e['powiat'] ) ||
                       !!where_exp.exec( e['gmina'] ) ||
                       !!where_exp.exec( e['miejscowosc'] );
            });

            res.render( 'table.html', {
                title: 'Racoon',
                data: data,
                user: req.session.username,
                collection: what + ' :: ' + where
            });
        });
    }
    else {
        render({});
    }
});


app.post( '/approved/', function( req, res ) {
    // check if the user is logged in
    var user = req.session.username;
    if( !user ) {
        res.writeHead( 302, {
            'Location': '/'
        });
        res.end();
    }

    var ObjectId = require('mongolian').ObjectId;
    var db_rows  = (new Mongolian).db('victor_db').collection('victor_data');
    var meta_col = (new Mongolian).db('victor_db').collection('victor_meta');
    var db_users = (new Mongolian).db('victor_db').collection('victor_users');

    var row_id = req.body.id;
    var set    = JSON.parse( req.body.set );

    db_users.findOne({ user: user }, function ( err, db_user ) {

        if( set ) {
            // update collection db
            db_rows.update({ '_id': new ObjectId( row_id ) },
                           { '$set': { 'approved': user } });
            // push a new monument to user's list
            db_user['rows'].push( row_id );
        }
        else {
            // update collection db
            db_rows.update({ '_id': new ObjectId( row_id ) },
                           { '$unset': { 'approved': 1 } });
            // remove monument from the user's list
            db_user['rows'] = db_user['rows'].filter( function ( e ) {
                                                return e !== row_id;
                                            });
        }
        // update the user's list in db
        db_users.update({ 'user': user },
                        { '$set': {'rows': db_user['rows'] } });
    });

    db_rows.findOne({'_id': new ObjectId( row_id ) }, function ( err, row ) {
        // get clicked names
        var woj = row['wojewodztwo'];
        var pow = row['powiat'];

        meta_col.findOne({ 'name': woj }, function ( err, woj_obj ) {
            // increment edited fileds
            woj_obj['edited'] += set ? 1 : -1;
            woj_obj['powiats'] = woj_obj['powiats'].map( function ( e ) {
                                                if ( e['name'] === pow ) {
                                                    e['edited'] += set ? 1 : -1;
                                                }
                                                return e;
                                            });
            // update db
            meta_col.update({ 'name': woj }, woj_obj );
        });
    });

    res.writeHead( '200', {'Contetent-Type': 'plain/text'} );
    res.end();
});

app.post( '/update/', function(req, res) {
    var ObjectId = require('mongolian').ObjectId;
    var key = req.body.key,
        val = req.body.value,
        row_id = req.body.id;
    var db_rows = (new Mongolian).db('victor_db').collection('victor_data');

    var new_value = {};
    new_value[key] = val;

    db_rows.update({ '_id': new ObjectId( row_id ) }, { '$set': new_value });

    res.writeHead( '200', {'Contetent-Type': 'plain/text'} );
    res.end();
});

app.get( '/get_comments/', function(req, res) {
    var ObjectId = require('mongolian').ObjectId;
    var db_rows  = (new Mongolian).db('victor_db').collection('victor_data');

    var params = url.parse( req.url, true );
    var id = params.query.id;

    db_rows.find({ '_id': new ObjectId(id) }).toArray( function ( err, data ) {
        data = _.flatten( data.map( function ( e ) {
            return e['comments'];
        })).filter( function ( e ) {
            return !!e;
        });

        res.writeHead( '200', {'Content-Type': 'text/plain'} );
        res.end( JSON.stringify({ id: id, data: data }));
    });
});

app.post( '/comment/', function(req, res) {
    var user = req.session.username;
    var row_id = req.body.id;
    var text = req.body.text;

    var ObjectId = require('mongolian').ObjectId;
    var db_rows  = (new Mongolian).db('victor_db').collection('victor_data');
    var meta_col = (new Mongolian).db('victor_db').collection('victor_meta');

    var new_comment = { 'user': user, 'text': text };

    db_rows.findOne({ '_id': ObjectId( row_id ) }, function ( err, db_object ) {
        var comments = db_object['comments'];
        try {
            comments.push({ user: user, text: text });
        }
        catch( error ) {
            comments = [];
            comments.push({ user: user, text: text });
        }
        db_rows.update({ '_id': new ObjectId( row_id ) },
                       { '$set': {'comments': comments} });
    });

    db_rows.findOne({'_id': new ObjectId( row_id ) }, function ( err, row ) {
        var woj = row['wojewodztwo'],
            pow = row['powiat'];


        meta_col.findOne({ 'name': woj }, function ( err, woj_obj ) {
            var pow_list = woj_obj['powiats'].map( function ( e ) {
                                                if ( e['name'] === pow ) {
                                                    e['comments'] += 1;
                                                }
                                                return e;
                                            });
            var woj_comments_count = woj_obj['comments'] + 1;

            meta_col.update({ 'wojewodztwo': woj },
                            { '$set':
                                { 'comments': woj_comments_count,
                                  'powiats': pow_list }
                            });
        });
    });
    res.writeHead( '200', {'Contetent-Type': 'plain/text'} );
    res.end();
});


app.listen( 3030 );
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);


