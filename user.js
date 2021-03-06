var express      = require('express');
var url          = require('url');
var _            = require('underscore');
var crypto       = require('crypto');

var cur     = require('./db_cur');

var cookie_time = 8*3600000;


//////////  L O G I N  //////////
exports.login = function ( req, res ) {
    var user = req.body.user;
    var md5_pass = crypto.createHash('md5');
    md5_pass.update( req.body.pass );
    // clear session user-login data
    delete req.session.user;

    // get user data from db and check the login
    cur.users.findOne({ user: user }, authenticateUser );


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
            req.session.cookie.expires = new Date(Date.now() + cookie_time);
            req.session.cookie.maxAge = cookie_time;

            res.redirect( '/user/' + user );
            res.end();
        }
    }
};


//////////  L O G O U T  //////////
exports.logout = function ( req, res ) {
    var user = req.session.user;

    cur.state.remove({ 'user': user }, function () {
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
    cur.users.findOne({ user: user }, create_new_user );


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
            cur.users.insert({
                user: user,
                email: email,
                pass: md5_pass.digest('hex'),
                rows: []
            });

            // after successful creation, store user name in session
            req.session.user = user;
            req.session.cookie.expires = new Date(Date.now() + cookie_time);
            req.session.cookie.maxAge = cookie_time;
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
    var expert = user === 'trzewiczek' || user === 'ekspert';

    cur.users.findOne({ user: user }, function( err, db_user ) {
    	if( !db_user ) {
	   res.redirect('/');
	   res.end();
	}
        // turn _id hashes to ObjectIds
        var ObjectId = require('mongolian').ObjectId;
        var obj_list = db_user['rows'].map( function ( e ) {
            return { '_id': new ObjectId( e ) };
        });

        // get objects
        cur.data.find({ '$or': obj_list }).toArray( function ( err, data ) {
            // create a string list of monumnets
            var list = data.map( function ( e ) {
                return e['wojewodztwo'] + ' :: ' + e['gmina'] + ' :: ' + e['okr_ob'];
            });

            // how to make Mongo sort the utf-8 ?!
            cur.meta.find({}).sort({'name':1}).toArray( function ( err, meta_data ) {

                cur.data.find({ 'comments.user': user },
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
                                meta: meta_data,
                                expert: expert
                            });
                        });
            });
        });
    });
};


exports.user_on = function( req, res ) {
    var now = new Date();
    cur.state.update({ 'user': req.session.user }, { '$set': { 'ids': req.body.ids, 'timestamp': now }});

    res.writeHead( '200', {'Contetent-Type': 'plain/text'} );
    res.end();
};
