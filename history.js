var _    = require('underscore');
var cur  = require('./db_cur');

var ObjectId = require('mongolian').ObjectId;

exports.save_edit = function ( user, id, key, value ) {
    var timestamp = new Date();
    var fields = {};
    fields[key] = 1;

    cur.data.findOne({ '_id': ObjectId(id) }, fields, function ( err, data ) {
        var revision = {
            timestamp: timestamp,
            user: user,
            row: id,
            key: key,
            new_value: value,
            old_value: data[key]
        };

        cur.history.insert( revision );
    });

};

exports.save_approval = function ( user, id, approval ) {
    var timestamp = new Date();
    var revision = {
        timestamp: timestamp,
        user: user,
        row: id,
        approval: approval
    };

    cur.history.insert( revision );
};

exports.save_verification = function ( user, id ) {
    var timestamp = new Date();
    var revision = {
        timestamp: timestamp,
        user: user,
        row: id,
        verification: true
    };

    cur.history.insert( revision );
};


exports.get_user_edits = function ( user ) {
    cur.history.find({ 'user': user }).sort({'timestamp': 1}).toArray( function ( err, data ) {
        return data;
    });
};

exports.get_last_minute = function ( period ) {
    var now = new Date();

    cur.history.find({ 'timestamp': { '$gte': new Date( now - period ) }})
              .sort({'timestamp': 1})
              .toArray( function ( err, data ) {
                    return data;
                });
};




