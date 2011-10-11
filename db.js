var express   = require('express');
var Mongolian = require('mongolian');
var mongo     = new Mongolian('91.227.40.36:8000');
var url       = require('url');
var _         = require('underscore');


//////////  A P P R O V E D  //////////
exports.approved = function ( req, res ) {
    // check if the user is logged in
    var user = req.session.username;
    if( !user ) {
        res.writeHead( 302, {
            'Location': '/'
        });
        res.end();
    }

    var ObjectId = require('mongolian').ObjectId;
    var db_rows  = mongo.db('racoon_db').collection('racoon_data');
    var meta_col = mongo.db('racoon_db').collection('racoon_meta');
    var db_users = mongo.db('racoon_db').collection('racoon_users');

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
};


//////////  U P D A T E  //////////
exports.update = function(req, res) {
    var ObjectId = require('mongolian').ObjectId;
    var key = req.body.key,
        val = req.body.value,
        row_id = req.body.id;
    var db_rows = mongo.db('racoon_db').collection('racoon_data');

    var new_value = {};
    new_value[key] = val;

    db_rows.update({ '_id': new ObjectId( row_id ) }, { '$set': new_value });

    res.writeHead( '200', {'Contetent-Type': 'plain/text'} );
    res.end();
};


//////////  G E T   C O M M E N T S  //////////
exports.get_comments = function(req, res) {
    var ObjectId = require('mongolian').ObjectId;
    var db_rows  = mongo.db('racoon_db').collection('racoon_data');

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
};


//////////  C O M M E N T  //////////
exports.comment = function(req, res) {
    var user = req.session.username;
    var row_id = req.body.id;
    var text = req.body.text;

    var ObjectId = require('mongolian').ObjectId;
    var db_rows  = mongo.db('racoon_db').collection('racoon_data');
    var meta_col = mongo.db('racoon_db').collection('racoon_meta');

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
};



