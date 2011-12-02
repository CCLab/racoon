var _          = require('underscore');

var Mongolian  = require('mongolian');
var ObjectId   = require('mongolian').ObjectId;
var mongo      = new Mongolian('91.227.40.36:8000');
var db_history = mongo.db('racoon_db').collection('racoon_history');
var db_data    = mongo.db('racoon_db').collection('racoon_data');

exports.save_edit = function ( user, id, key, value ) {
    var timestamp = new Date();
    var fields = {};
    fields[key] = 1;

    db_data.findOne({ '_id': ObjectId(id) }, fields, function ( err, data ) {
        var revision = {
            timestamp: timestamp,
            user: user,
            row: id,
            key: key,
            new_value: value,
            old_value: data[key]
        };

        db_history.insert( revision );
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

    db_history.insert( revision );
};

exports.save_verification = function ( user, id ) {
    var timestamp = new Date();
    var revision = {
        timestamp: timestamp,
        user: user,
        row: id,
        verification: true
    };

    db_history.insert( revision );
};


exports.get_user_edits = function ( user ) {
    db_history.find({ 'user': user }).sort({'timestamp': 1}).toArray( function ( err, data ) {
        return data;
    });
};

exports.get_last_minute = function ( period ) {
    var now = new Date();

    db_history.find({ 'timestamp': { '$gte': new Date( now - period ) }})
              .sort({'timestamp': 1})
              .toArray( function ( err, data ) {
                    return data;
                });
};




