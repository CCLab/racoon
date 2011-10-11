var express   = require('express');
var url       = require('url');
var _         = require('underscore');

var Mongolian = require('mongolian');
var mongo     = new Mongolian('91.227.40.36:8000');
var db_users  = mongo.db('racoon_db').collection('racoon_users');
var db_cols   = mongo.db('racoon_db').collection('racoon_data');
var db_meta   = mongo.db('racoon_db').collection('racoon_meta');


//////////  L O G I N  //////////
exports.login = function ( req, res ) {
    var user = req.body.user;
    var pass = req.body.pass;
    // clear session user-login data
    delete req.session.username;

    // get user data from db and check the login
    db_users.findOne({ user: user }, authenticateUser );


    // callback
    function authenticateUser( err, db_user ) {
        // do the auth magic
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
    }
};


//////////  E R R O R   L O G I N  //////////
exports.error_login = function ( req, res ) {
    // cache the error and clear the session data
    var error = req.session.error;
    delete req.session.error;

    res.render( 'error_login.html', {
        title: 'Błąd logowania',
        error: error
    });
};


//////////  N E W   U S E R  //////////
exports.new_user = function ( req, res ) {
    res.render( 'new_user.html', {
        title: 'Dodawanie nowego użytkownika',
        error: ''
    });
};


//////////  R E G I S T E R  //////////
exports.register = function ( req, res ) {
    // form data
    var user = req.body.user;
    var pass = req.body.pass;

    // check if the user doesn't exist before creating a new one
    db_users.findOne({ user: user }, create_new_user );


    // callback
    function create_new_user( err, db_user ) {
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
    };
};


//////////  P A G E  //////////
exports.page = function ( req, res ) {
    // if the user is not logged in --> move back to login page
    if ( !req.session.username ) {
        res.writeHead( 302, {
            'Location': '/'
        })
        res.end();
    }
    var user = req.params.name;

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
};
