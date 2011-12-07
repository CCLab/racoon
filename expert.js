var express      = require('express');
var url          = require('url');
var _            = require('underscore');
var crypto       = require('crypto');

var cur  = require('./db_cur');

var ObjectId  = require('mongolian').ObjectId;


//////////  P A G E  //////////
exports.page = function ( req, res ) {
    cur.expert.find().sort({ 'timestamp': -1 }).toArray( function ( err, data ) {
        cur.users.findOne({ 'user': req.session.user }, function ( err, db_user ) {
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
                data: data,
                last_seen: db_user.last_seen
            });
        });
    });
};

exports.answer = function ( req, res ) {
    var ans = req.body.answer;
    var id  = ObjectId( req.body.id );

    cur.expert.update({ '_id': id }, { '$set': { 'a': ans }});

    res.writeHead( '200', {'Content-Type': 'text/plain'} );
    res.end();
};

exports.check_updates = function ( req, res ) {
    var ids;

    if( !req.body ) {
        res.writeHead( '200', { 'Content-Type': 'text/plain' });
        res.end();
    }
    else {
        ids = req.body.ids.map( function ( e ) {
            return { '_id': ObjectId( e ) };
        });

        cur.expert.find({ '$nor': ids }).sort({ 'timestamp': -1 }).toArray( function ( err, data ) {
            data.forEach( function ( e ) {
                var ts = e.timestamp;
                var mins = ts.getMinutes()+"";
                e.time = ts.getHours() + ":" + ( mins.length === 1 ? '0'+mins : mins );
                e.date = ts.getDate() + "-" + ts.getMonth() + "-" + ts.getFullYear();
            });

            res.writeHead( '200', {'Content-Type': 'text/plain'} );
            res.end( JSON.stringify( data ) );
        });
    }
};

exports.get_rows = function ( req, res ) {
    var id = req.body.id

    cur.expert.findOne({ '_id': ObjectId(id) }, { ids: 1 }, function ( err, data ) {
        var ids = data.ids.map( function ( e ) {
            return { '_id': ObjectId( e ) };
        });
        cur.data.find({ '$or': ids }).sort({ '_id': 1 }).toArray( function ( err, rows ) {
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

    cur.expert.insert( question );

    res.writeHead( '200', {'Content-Type': 'text/plain'} );
    res.end();
};

exports.get_answered = function ( req, res ) {
    var user = req.session.user;

    cur.expert.find({ user: user }).sort({ timestamp: -1 }).toArray( function ( err, data ) {
        res.writeHead( '200', {'Content-Type': 'text/plain'} );
        res.end( JSON.stringify( data ));
    });
};
