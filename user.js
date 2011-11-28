var express      = require('express');
var url          = require('url');
var _            = require('underscore');
var crypto       = require('crypto');

var Mongolian = require('mongolian');
var mongo     = new Mongolian('91.227.40.36:8000');
var db_users  = mongo.db('racoon_db').collection('racoon_users');
var db_cols   = mongo.db('racoon_db').collection('racoon_data');
var db_meta   = mongo.db('racoon_db').collection('racoon_meta');
var db_state  = mongo.db('racoon_db').collection('racoon_state');



//////////  L O G I N  //////////
exports.login = function ( req, res ) {
    var user = req.body.user;
    var md5_pass = crypto.createHash('md5');
    md5_pass.update( req.body.pass );
    // clear session user-login data
    delete req.session.user;

    // get user data from db and check the login
    db_users.findOne({ user: user }, authenticateUser );


    // callback
    function authenticateUser( err, db_user ) {
        // do the auth magic
        if( !db_user ) {
            req.session.error = 'user';
            res.redirect( '/error_login/' );
            res.end();
        }
        else if( md5_pass.digest('hex') !== db_user['pass'] ) {
            req.session.error = 'pass';
            res.redirect( '/error_login/' );
            res.end();
        }
        else {
            // on successful login store user name in session
            req.session.user = user;
            res.redirect( '/user/' + user );
            res.end();
        }
    }
};


//////////  L O G O U T  //////////
exports.logout = function ( req, res ) {
    var user = req.session.user;

    db_state.remove({ 'user': user }, function () {
        delete user;
        res.redirect('/');
    });
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
    var user  = req.body.user;
    var email = req.body.email;
    var md5_pass = crypto.createHash('md5');
    md5_pass.update( req.body.pass );

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
                email: email,
                pass: md5_pass.digest('hex'),
                rows: []
            });

            // after successful creation, store user name in session
            req.session.user = user;
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

            // how to make Mongo sort the utf-8 ?!
            db_meta.find({}).sort({'name':1}).toArray( function ( err, meta_data ) {

                db_cols.find({ 'comments.user': user },
                             { 'okr_ob': 1, 'comments': 1, 'wojewodztwo': 1, 'powiat': 1, 'miejscowosc': 1 })
                       .toArray( function ( err, comments_list ) {
                            comments_list.reverse();

                            var comments_count = comments_list.map( function ( e ) {
                                return e.comments.length;
                            });

                            res.render( 'user.html', {
                                title: 'Strona użytkownika: ' + user,
                                user: user,
                                last_seen: db_user.last_seen,
                                rows_count: !!obj_list.length ? list.length : 0,
                                rows_list: !!obj_list.length ? list : [],
                                comments_total: comments_list.length,
                                comments_count: comments_count,
                                comments_list: comments_list,
                                meta: meta_data
                            });
                        });
            });
        });
    });
};


exports.user_on = function( req, res ) {
    var now = new Date();
    db_state.update({ 'user': req.session.user }, { '$set': { 'ids': req.body.ids, 'timestamp': now }});

    // do the db trick!
    res.writeHead( '200', {'Contetent-Type': 'plain/text'} );
    res.end();
};
