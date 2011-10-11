var express   = require('express');
var Mongolian = require('mongolian');
var mongo     = new Mongolian('91.227.40.36:8000');
var url       = require('url');

//////////  P O V I A T  //////////
exports.poviat = function ( req, res ) {
    var cols = mongo.db('racoon_db').collection('racoon_data');

    cols.find({ powiat: req.params.poviat }).toArray( function ( err, data ) {
        res.render( 'table.html', {
            title: 'Racoon',
            data: data,
            user: req.session.username,
            collection: 'Powiat ' + req.params.poviat
        });
    });
};

//////////  G E N E R A L  //////////
exports.general = function ( req, res ) {
    var params = url.parse( req.url, true );
    var what   = params.query.what || '';
    var where  = params.query.where || '';

    var cols = mongo.db('racoon_db').collection('racoon_data');
    var query  = {};

    var render = function ( query ) {
        cols.find( query ).toArray( function ( err, data ) {
            var collection;

            if( !!what && !where ) {
                collection = what;
            }
            if( !what && !!where ) {
                collection = where;
            }

            res.render( 'table.html', {
                title: 'Racoon',
                data: data,
                user: req.session.username,
                collection: collection
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

        cols.find( query ).toArray( function ( err, result ) {
            var data = result.filter( function ( e ) {
                var where_exp = new RegExp( where, 'i' );

                return !!where_exp.exec( e['wojewodztwo'] ) ||
                       !!where_exp.exec( e['powiat'] ) ||
                       !!where_exp.exec( e['gmina'] ) ||
                       !!where_exp.exec( e['miejscowosc'] );
            });

            res.render( 'table.html', {
                title: 'Racoon',
                data: data,
                user: req.session.username,
                collection: what + ' :: ' + where
            });
        });
    }
    else {
        render({});
    }
};

