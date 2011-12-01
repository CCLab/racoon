var express      = require('express');
var url          = require('url');
var _            = require('underscore');
var crypto       = require('crypto');

var Mongolian = require('mongolian');
var mongo     = new Mongolian('91.227.40.36:8000');
var ObjectId  = require('mongolian').ObjectId;
var db_data   = mongo.db('racoon_db').collection('racoon_data');
var db_expert = mongo.db('racoon_db').collection('racoon_expert');


//////////  P A G E  //////////
exports.page = function ( req, res ) {
    db_expert.find().sort({ 'timestamp': -1 }).toArray( function ( err, data ) {
        data.forEach( function ( e ) {
            var ts = e.timestamp;
            var mins = ts.getMinutes()+"";
            e.time = ts.getHours() + ":" + ( mins.length === 1 ? '0'+mins : mins );
            e.date = ts.getDate() + "-" + ts.getMonth() + "-" + ts.getFullYear();
        });
        res.render( 'expert2.html', {
            user: req.session.user,
            title: "Panel eksperta",
            count: data.length,
            data: data
        });
    });
};

exports.answer = function ( req, res ) {
    var ans = req.body.answer;
    var id  = ObjectId( req.body.id );

    db_expert.update({ '_id': id }, { '$set': { 'a': ans }});

    res.writeHead( '200', {'Content-Type': 'text/plain'} );
    res.end();
};

exports.check_updates = function ( req, res ) {
    var ids = req.body.ids.map( function ( e ) {
        return { '_id': ObjectId( e ) };
    });

    db_expert.find({ '$nor': ids }).sort({ 'timestamp': -1 }).toArray( function ( err, data ) {
        data.forEach( function ( e ) {
            var ts = e.timestamp;
            var mins = ts.getMinutes()+"";
            e.time = ts.getHours() + ":" + ( mins.length === 1 ? '0'+mins : mins );
            e.date = ts.getDate() + "-" + ts.getMonth() + "-" + ts.getFullYear();
        });

        res.writeHead( '200', {'Content-Type': 'text/plain'} );
        res.end( JSON.stringify( data ) );
    });
};

exports.get_rows = function ( req, res ) {
    var id = req.body.id

    db_expert.findOne({ '_id': ObjectId(id) }, { ids: 1 }, function ( err, data ) {
        var ids = data.ids.map( function ( e ) {
            return { '_id': ObjectId( e ) };
        });
        db_data.find({ '$or': ids }).sort({ '_id': 1 }).toArray( function ( err, rows ) {
            var result = {
                rows: rows,
                id: id
            };

            res.writeHead( '200', {'Content-Type': 'text/plain'} );
            res.end( JSON.stringify( result ) );
        });
    });
};

exports.ask_question = function ( req, res ) {
    var question = {
        user: req.session.user,
        timestamp: new Date(),
        ids: req.body.ids,
        q: req.body.q
    };

    db_expert.insert( question );

    res.writeHead( '200', {'Content-Type': 'text/plain'} );
    res.end();
};

exports.get_answered = function ( req, res ) {
    var user = req.session.user;

    db_expert.find({ user: user }).sort({ timestamp: -1 }).toArray( function ( err, data ) {
        res.writeHead( '200', {'Content-Type': 'text/plain'} );
        res.end( JSON.stringify( data ));
    });
};

//////////  L O G I N  //////////
//exports.login = function ( req, res ) {
//    var user = req.body.user;
//    var md5_pass = crypto.createHash('md5');
//    md5_pass.update( req.body.pass );
//    // clear session user-login data
//    delete req.session.user;
//
//    // get user data from db and check the login
//    db_users.findOne({ user: user }, authenticateUser );
//
//
//    // callback
//    function authenticateUser( err, db_user ) {
//        // do the auth magic
//        if( !db_user ) {
//            req.session.error = 'user';
//            res.redirect( '/error_login/' );
//            res.end();
//        }
//        else if( md5_pass.digest('hex') !== db_user['pass'] ) {
//            req.session.error = 'pass';
//            res.redirect( '/error_login/' );
//            res.end();
//        }
//        else {
//            // on successful login store user name in session
//            req.session.user = user;
//            res.redirect( '/user/' + user );
//            res.end();
//        }
//    }
//};


//////////  L O G O U T  //////////
//exports.logout = function ( req, res ) {
//    var user = req.session.user;
//
//    db_state.remove({ 'user': user }, function () {
//        delete user;
//        res.redirect('/');
//    });
//};


//////////  E R R O R   L O G I N  //////////
//exports.error_login = function ( req, res ) {
//    // cache the error and clear the session data
//    var error = req.session.error;
//    delete req.session.error;
//
//    res.render( 'error_login.html', {
//        title: 'Błąd logowania',
//        error: error
//    });
//};



