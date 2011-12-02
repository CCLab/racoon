var Mongolian = require('mongolian');
var mongo     = new Mongolian('91.227.41.101:8000');
var db_rac    = mongo.db('racoon_db');
    db_rac.auth('racoon', 'szoppracz');

exports.users   = db_rac.collection('racoon_users');
exports.data    = db_rac.collection('racoon_data');
exports.meta    = db_rac.collection('racoon_meta');
exports.state   = db_rac.collection('racoon_state');
exports.expert  = db_rac.collection('racoon_expert');
exports.history = db_rac.collection('racoon_history');

