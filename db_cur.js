var Mongolian = require('mongolian');
var mongo     = new Mongolian(/* IP */);
var db_rac    = mongo.db(/* DB NAME */);
    db_rac.auth(/* DB USER AND PASS */);

exports.users   = db_rac.collection('racoon_users');
exports.data    = db_rac.collection('racoon_data');
exports.meta    = db_rac.collection('racoon_meta');
exports.state   = db_rac.collection('racoon_state');
exports.expert  = db_rac.collection('racoon_expert');
exports.history = db_rac.collection('racoon_history');

