var url       = require('url');
var _         = require('underscore');

var history   = require('./history');

var Mongolian = require('mongolian');
var ObjectId  = require('mongolian').ObjectId;
var mongo     = new Mongolian('91.227.40.36:8000');
var db_rows   = mongo.db('racoon_db').collection('racoon_data');
var db_meta  = mongo.db('racoon_db').collection('racoon_meta');
var db_users  = mongo.db('racoon_db').collection('racoon_users');

//////////  A P P R O V E D  //////////
exports.approved = function ( req, res ) {
    // check if the user is logged in
    var user = req.session.user;
    var row_id = req.body.id;
    var set    = JSON.parse( req.body.set );

    db_users.findOne({ user: user }, update_user_account );
    db_rows.findOne({'_id': new ObjectId( row_id ) }, mark_approved_object );

    history.save_approval( user, row_id, set );

    res.writeHead( '200', {'Contetent-Type': 'plain/text'} );
    res.end();

    // callbacks
    function update_user_account( err, db_user ) {
        // set --> boolean for approved the row
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
    }

    function mark_approved_object( err, row ) {
        // get clicked names
        var woj = row['wojewodztwo'];
        var pow = row['powiat'];

        db_meta.findOne({ 'name': woj }, update_metadata );

        // internal callback
        function update_metadata( err, woj_obj ) {
            // increment edited fileds
            woj_obj['edited'] += set ? 1 : -1;
            woj_obj['powiats'] = woj_obj['powiats'].map( function ( e ) {
                                                if ( e['name'] === pow ) {
                                                    e['edited'] += set ? 1 : -1;
                                                }
                                                return e;
                                            });
            // update db
            db_meta.update({ 'name': woj }, woj_obj );
        }
    }
};


//////////  U P D A T E  //////////
exports.update = function( req, res ) {
    var key = req.body.key;
    var val = req.body.value;
    var row_id = req.body.id;

    var new_value = {};
    new_value[key] = val;

    history.save_edit( req.session.user, row_id, key, val );
    db_rows.update({ '_id': new ObjectId( row_id ) }, { '$set': new_value });

    res.writeHead( '200', {'Contetent-Type': 'plain/text'} );
    res.end();
};


//////////  G E T   C O M M E N T S  //////////
exports.get_comments = function(req, res) {
    var params = url.parse( req.url, true );
    var id = params.query.id;

    db_rows.find({ '_id': new ObjectId(id) }).toArray( function ( err, data ) {
        data = _.flatten( data.map( function ( e ) {
                                    return e['comments'];
                        }))
                        .filter( function ( e ) {
                                    return !!e;
                        });

        res.writeHead( '200', {'Content-Type': 'text/plain'} );
        res.end( JSON.stringify({ id: id, data: data }));
    });
};

//////////  G E T   C O M M E N T S  //////////
exports.get_user_comments = function(req, res) {
    var user = req.session.user;
    var fields = {
        'comments': 1,
        'wojewodztwo': 1,
        'powiat': 1,
        'gmina': 1,
        'okr_ob': 1
    };
    var limit = req.param( 'limit', undefined );
    if( !!limit ) {
        limit = parseInt( limit, 10 );
    }

    console.log( limit );
    db_rows.find({ 'comments.user': user }).count( function ( err, total ) {
        db_rows.find({ 'comments.user': user }, fields ).limit( limit ).sort({ 'last_commented': -1 }).toArray( function ( err, data ) {
            var result = {
                data: data,
                total: total
            };
            res.writeHead( '200', {'Content-Type': 'text/plain'} );
            res.end( JSON.stringify( result ));
        });
    });
};


//////////  C H E C K   N E W   C O M M E N T S  //////////
exports.check_new_comments = function( req, res ) {
    var ids = JSON.parse( req.body.ids );
    var obj_list = ids.map( function ( e ) {
        return { '_id': new ObjectId( e ) };
    });

    // get objects
    db_rows.find({ '$or': obj_list }, { 'comments': 1 }).toArray( function ( err, data ) {
        var comments = data.map( function ( e ) {
            return {
                id: e._id,
                count: !!e.comments ? e.comments.length : 0
            };
        });

        res.writeHead( '200', {'Content-Type': 'text/plain'} );
        res.end( JSON.stringify( comments ));
    });
};


//////////  C O M M E N T  //////////
exports.comment = function( req, res ) {
    var user = req.session.user;
    var row_id = req.body.id;
    var text = req.body.text;

    var new_comment = { 'user': user, 'text': text, 'timestamp': new Date() };

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
                       { '$set': {'comments': comments, 'last_commented': new Date()} });
    });

    db_rows.findOne({'_id': new ObjectId( row_id ) }, function ( err, row ) {
        var woj = row['wojewodztwo'],
            pow = row['powiat'];


        db_meta.findOne({ 'name': woj }, function ( err, woj_obj ) {
            var pow_list = woj_obj['powiats'].map( function ( e ) {
                                                if ( e['name'] === pow ) {
                                                    e['comments'] += 1;
                                                }
                                                return e;
                                            });
            var woj_comments_count = woj_obj['comments'] + 1;

            db_meta.update({ 'wojewodztwo': woj },
                            { '$set':
                                { 'comments': woj_comments_count,
                                  'powiats': pow_list }
                            });
        });
    });

    res.writeHead( '200', {'Contetent-Type': 'plain/text'} );
    res.end();
};


exports.get_metadata = function ( req, res ) {
    db_meta.find({}).sort({'name':1}).toArray( function ( err, meta_data ) {
        res.writeHead( '200', {'Contetent-Type': 'plain/text'} );
        res.end( JSON.stringify( meta_data ));
    });
};
