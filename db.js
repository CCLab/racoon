var url       = require('url');
var _         = require('underscore');

var history   = require('./history');

var ObjectId  = require('mongolian').ObjectId;
var cur  = require('./db_cur');

//////////  A P P R O V E D  //////////
exports.approved = function ( req, res ) {
    // check if the user is logged in
    var user = req.session.user;
    var row_id = req.body.id;
    var set    = JSON.parse( req.body.set );

    cur.users.findOne({ user: user }, update_user_account );

    history.save_approval( user, row_id, set );

    res.writeHead( '200', {'Contetent-Type': 'plain/text'} );
    res.end();

    // callbacks
    function update_user_account( err, db_user ) {
        // set --> boolean for approved the row
        if( set ) {
            // update collection db
            cur.data.update({ '_id': new ObjectId( row_id ) },
                           { '$set': { 'approved': user } });
            // push a new monument to user's list
            db_user['rows'].push( row_id );
        }
        else {
            // update collection db
            cur.data.update({ '_id': new ObjectId( row_id ) },
                           { '$unset': { 'approved': 1 } });
            // remove monument from the user's list
            db_user['rows'] = db_user['rows'].filter( function ( e ) {
                                                return e !== row_id;
                                            });
        }
        // update the user's list in db
        cur.users.update({ 'user': user },
                        { '$set': {'rows': db_user['rows'] } });
    }
};

//////////  V E R I F I E D  //////////
exports.verified = function ( req, res ) {
    // check if the user is logged in
    var user = req.session.user;
    var row_id = req.body.id;

    cur.users.findOne({ user: user }, update_user_account );
    cur.data.findOne({'_id': new ObjectId( row_id ) }, mark_verified_object );

    history.save_verification( user, row_id );

    res.writeHead( '200', {'Contetent-Type': 'plain/text'} );
    res.end();

    // callbacks
    function update_user_account( err, db_user ) {
        // update collection db
        cur.data.update({ '_id': new ObjectId( row_id ) },
                       { '$set': { 'verified': user } });
        // push a new monument to user's list
        try {
            db_user['verified_rows'].push( row_id );
        }
        catch ( err ) {
            db_user['verified_rows'] = [ row_id ];
        }

        // update the user's list in db
        cur.users.update({ 'user': user },
                        { '$set': {'verified_rows': db_user['verified_rows'] } });
    }

    function mark_verified_object( err, row ) {
        // get clicked names
        var woj = row['wojewodztwo'];
        var pow = row['powiat'];

        cur.meta.findOne({ 'name': woj }, update_metadata );

        // internal callback
        function update_metadata( err, woj_obj ) {
            // increment edited fileds
            woj_obj['edited'] += 1;
            woj_obj['powiats'] = woj_obj['powiats'].map( function ( e ) {
                                                if ( e['name'] === pow ) {
                                                    e['edited'] += 1;
                                                }
                                                return e;
                                            });
            // update db
            cur.meta.update({ 'name': woj }, woj_obj );
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
    cur.data.update({ '_id': new ObjectId( row_id ) }, { '$set': new_value });

    res.writeHead( '200', {'Contetent-Type': 'plain/text'} );
    res.end();
};


//////////  G E T   C O M M E N T S  //////////
exports.get_comments = function(req, res) {
    var params = url.parse( req.url, true );
    var id = params.query.id;

    cur.data.find({ '_id': new ObjectId(id) }).toArray( function ( err, data ) {
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

    cur.data.find({ 'comments.user': user }).count( function ( err, total ) {
        cur.data.find({ 'comments.user': user }, fields ).limit( limit ).sort({ 'last_commented': -1 }).toArray( function ( err, data ) {
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
    cur.data.find({ '$or': obj_list }, { 'comments': 1 }).toArray( function ( err, data ) {
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

    cur.data.findOne({ '_id': ObjectId( row_id ) }, function ( err, db_object ) {
        var comments = db_object['comments'];
        try {
            comments.push({ user: user, text: text });
        }
        catch( error ) {
            comments = [];
            comments.push({ user: user, text: text });
        }
        cur.data.update({ '_id': new ObjectId( row_id ) },
                       { '$set': {'comments': comments, 'last_commented': new Date()} });
    });

    cur.data.findOne({'_id': new ObjectId( row_id ) }, function ( err, row ) {
        var woj = row['wojewodztwo'],
            pow = row['powiat'];


        cur.meta.findOne({ 'name': woj }, function ( err, woj_obj ) {
            var pow_list = woj_obj['powiats'].map( function ( e ) {
                                                if ( e['name'] === pow ) {
                                                    e['comments'] += 1;
                                                }
                                                return e;
                                            });
            var woj_comments_count = woj_obj['comments'] + 1;

            cur.meta.update({ 'wojewodztwo': woj },
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
    cur.meta.find({}).sort({'name':1}).toArray( function ( err, meta_data ) {
        res.writeHead( '200', {'Contetent-Type': 'plain/text'} );
        res.end( JSON.stringify( meta_data ));
    });
};
