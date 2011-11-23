var express   = require('express');
var _         = require('underscore');
var Mongolian = require('mongolian');
var mongo     = new Mongolian('91.227.40.36:8000');
var url       = require('url');
var limit     = 20;
//var state     = require('./state3');

//////////  P O V I A T  //////////
exports.poviat = function ( req, res ) {
    var cols     = mongo.db('racoon_db').collection('racoon_data');
    var db_state = mongo.db('racoon_db').collection('racoon_state');
    var poviat   = req.params.poviat;
    var page     = parseInt( req.params.page, 10 );
    var user     = req.session.user;

    cols.find({ powiat: req.params.poviat }).count( function ( err, count ) {
        cols.find({ powiat: req.params.poviat }).skip( limit * ( page-1 )).limit( limit ).toArray( function ( err, data ) {
            // manage blocked rows
            db_state.remove({ 'user': user }, function () {
                // gather all blocked ids
                db_state.find({}, {'ids': 1}).toArray( function( err, blocked_ids ) {
                    var ids = data.map( function ( e ) {
                        return e._id+'';
                    });
                    var all_blocked = _.uniq( _.flatten( _.pluck( blocked_ids, 'ids' ) ) );
                    var blocked = _.intersection( ids, all_blocked );

                    console.log( blocked );
                    // save new blocked ids in db
                    db_state.insert({
                        'user': user,
                        'ids': _.difference( ids, all_blocked )
                    });

                    var prev_page = !!( page-1 ) && !!data.length ?
                                    "/page/" + ( page - 1 ) + "/search/" + poviat : undefined;
                    var next_page = ( page-1 ) * limit >= count || data.length < limit ?
                                    undefined : "/page/" + ( page + 1 ) + "/search/" + poviat;

                    var collection_name = !!data.length ?
                                          "Województwo " + data[0]['wojewodztwo'] + " &rarr; Powiat " + poviat :
                                          "Brak danych";
                    var i, pagination = [];
                    for( i = 1; i <= Math.ceil( count / limit ); i++ ) {
                        pagination.push( "/page/" + i + "/search/" + poviat );
                    }

                    data.forEach( function ( e ) {
                        blocked.forEach( function ( b ) {
                            if( e._id+'' === b ) {
                                e.blocked = true;
                            }
                        });
                    });

                    data = data.map( function ( e ) {
                                    e['comments_count'] = !!e['comments'] ? e['comments'].length : undefined;
                                    return e;
                                })
                                .sort( function ( a, b ) {
                                   var a_id = a['_id']+'';
                                   var b_id = b['_id']+'';

                                   if( a_id > b_id ) return 1;
                                   if( a_id < b_id ) return -1;

                                   return 0;
                               });

                    res.render( 'table.html', {
                        title: 'Racoon',
                        data: data,
                        user: req.session.user,
                        collection: collection_name,
                        count: count,
                        prev_page: prev_page,
                        next_page: next_page,
                        pagination: pagination,
                        page: page
                    });
                });
            });
        });
    });
};

//////////  G E N E R A L  //////////
exports.general = function ( req, res ) {
    var page   = parseInt( req.params.page, 10 );
    var params = url.parse( req.url, true );
    var what   = params.query.what || '';
    var where  = params.query.where || '';
    var search = params.search;
    var user   = req.session.user;

    var query    = {};
    var cols     = mongo.db('racoon_db').collection('racoon_data');
    var db_state = mongo.db('racoon_db').collection('racoon_state');

    var render = function ( query ) {
        cols.find( query ).count( function ( err, count ) {
            cols.find( query ).skip( limit * ( page-1 )).limit( limit ).toArray( function ( err, data ) {
                // manage blocked rows
                db_state.remove({ 'user': user }, function () {
                    // gather all blocked ids
                    db_state.find({}, {'ids': 1}).toArray( function( err, blocked_ids ) {
                        var ids = data.map( function ( e ) {
                            return e._id+'';
                        });
                        var all_blocked = _.uniq( _.flatten( _.pluck( blocked_ids, 'ids' ) ) );
                        var blocked = _.intersection( ids, all_blocked );

                        console.log( blocked );
                        // save new blocked ids in db
                        db_state.insert({
                            'user': user,
                            'ids': _.difference( ids, all_blocked )
                        });

                        var collection_name = "Brak danych";
                        var prev_page = !!( page-1 ) && !!data.length ?
                                        "/page/" + ( page - 1 ) + "/search/" + search : undefined;
                        var next_page = ( page-1 ) * limit >= count || data.length < limit ?
                                        undefined : "/page/" + ( page + 1 ) + "/search/" + search;

                        var i, pagination = [];
                        for( i = 1; i <= Math.ceil( count / limit ); i++ ) {
                            pagination.push( "/page/" + i + "/search/" + search );
                        }


                        if( !!what && !where ) {
                            collection_name = what;
                        }
                        if( !what && !!where ) {
                            collection_name = where;
                        }

                        data.forEach( function ( e ) {
                            blocked.forEach( function ( b ) {
                                if( e._id+'' === b ) {
                                    e.blocked = true;
                                }
                            });
                        });

                        data = data.map( function ( e ) {
                                        e['comments_count'] = !!e['comments'] ? e['comments'].length : undefined;
                                        return e;
                                    })
                                    .sort( function ( a, b ) {
                                       var a_id = a['_id']+'';
                                       var b_id = b['_id']+'';

                                       if( a_id > b_id ) return 1;
                                       if( a_id < b_id ) return -1;

                                       return 0;
                                   });

                        res.render( 'table.html', {
                            title: 'Racoon',
                            data: data,
                            user: req.session.user,
                            collection: collection_name,
                            count: count,
                            prev_page: prev_page,
                            next_page: next_page,
                            pagination: pagination,
                            page: page
                        });
                    });
                });
            });
        });
    };

    if( !!what && !where ) {
        query = {'$or': [
                    { 'okr_ob': new RegExp( what, 'i' ) },
                    { 'okr_zes': new RegExp( what, 'i' ) }
                ]};

        render( query );
    }
    else if( !what && !!where ) {
        query = {'$or': [
                    { 'wojewodztwo': new RegExp( where, 'i' ) },
                    { 'powiat': new RegExp( where, 'i' ) },
                    { 'gmina': new RegExp( where, 'i' ) },
                    { 'miejscowosc': new RegExp( where, 'i' ) }
                ]};

        render( query );
    }
    else if( !!what && !!where ) {
        query = {'$or': [
                    { 'okr_ob': new RegExp( what, 'i' ) },
                    { 'okr_zes': new RegExp( what, 'i' ) }
                ]};

//        cols.find( query ).count( function ( err, count ) {
            cols.find( query ).toArray( function ( err, result ) {
                // manage blocked rows
                db_state.remove({ 'user': user }, function () {
                    // gather all blocked ids
                    db_state.find({}, {'ids': 1}).toArray( function( err, blocked_ids ) {

                        var data = result.filter( function ( e ) {
                            var where_exp = new RegExp( where, 'i' );

                            return !!where_exp.exec( e['wojewodztwo'] ) ||
                                   !!where_exp.exec( e['powiat'] ) ||
                                   !!where_exp.exec( e['gmina'] ) ||
                                   !!where_exp.exec( e['miejscowosc'] );
                        });

                        var ids = data.map( function ( e ) {
                            return e._id+'';
                        });
                        var all_blocked = _.uniq( _.flatten( _.pluck( blocked_ids, 'ids' ) ) );
                        var blocked = _.intersection( ids, all_blocked );

                        console.log( blocked );
                        // save new blocked ids in db
                        db_state.insert({
                            'user': user,
                            'ids': _.difference( ids, all_blocked )
                        });

                        var count = data.length;
                        var collection_name = where + " :: " + what;
                        var prev_page = !!( page-1 ) && !!data.length ?
                                        "/page/" + ( page - 1 ) + "/search/" + search : undefined;
                        var next_page = ( page-1 ) * limit >= count || data.length < limit ?
                                        undefined : "/page/" + ( page + 1 ) + "/search/" + search;

                        var i, pagination = [];
                        for( i = 1; i <= Math.ceil( count / limit ); i++ ) {
                            pagination.push( "/page/" + i + "/search/" + search );
                        }

                        data = data.slice( (page-1) * limit, page*limit );
                        data.forEach( function ( e ) {
                            blocked.forEach( function ( b ) {
                                if( e._id+'' === b ) {
                                    e.blocked = true;
                                }
                            });
                        });

                        data = data.map( function ( e ) {
                                        e['comments_count'] = !!e['comments'] ? e['comments'].length : undefined;
                                        return e;
                                    })
                                    .sort( function ( a, b ) {
                                       var a_id = a['_id']+'';
                                       var b_id = b['_id']+'';

                                       if( a_id > b_id ) return 1;
                                       if( a_id < b_id ) return -1;

                                       return 0;
                                   });

                        res.render( 'table.html', {
                            title: 'Racoon',
                            data: data,
                            user: req.session.user,
                            collection: collection_name,
                            count: count,
                            prev_page: prev_page,
                            next_page: next_page,
                            pagination: pagination,
                            page: page
                        });
                    });
                });
            });
    }
    else {
        render({});
    }
};

