var _      = require('underscore');
var assert = require('assert');

var users = {};

exports.remove_user = function ( user ) {
    assert.ok( !!users[user], "No such user" );
    delete users[user];
};

exports.add_blocked = function ( user, ids ) {
    // make users ids empty to let overwrite the rows
    users[user] = [];
    var all_blocked = get_all_blocked();

    // assign to user a new set of not previously blocked ids
    users[user] = _.difference( ids, all_blocked );

    // return previously blocked ids
    return _.intersection( ids, all_blocked );
};

exports.clear_blocked = function ( user ) {
    users[user] = [];
};

exports.get_all_blocked = get_all_blocked = function () {
    var user;
    var ids = [];

    for( user in users ) {
        if( users.hasOwnProperty( user ) ) {
            ids = ids.concat( users[user] );
        }
    }
    return _.uniq( ids );
};

