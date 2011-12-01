(function () {
    var value;

    $(document).ready(function() {
        $('#tools-popup').hide();
        $('#tools-icon').click( function () {

            var get_answered = function () {
                $.ajax({
                    url: '/get_answered/',
                    type: 'GET',
                    dataType: 'json',
                    success: function ( received ) {
                        console.log( received );
                        var data = received;
                        var i, elem, html = [];

                        for( i = 0; i < data.length; ++i ) {
                            html.push( '<div class="qa" style="clear:both">' );
                            html.push( '<p style="padding: 10px; background-color: #aaa; border: 1px solid #bbb; float: left; width: 46%;">', data[i].q, '</p>' );
                            if( !!data[i].a ) {
                                html.push( '<p style="padding: 10px; background-color: #bbb; border: 1px solid #5b5b5b; float: right; width: 46%;">', data[i].a, '</p>' );
                            }
                            else {
                                html.push( '<p style="padding: 10px; background-color: #ccc; border: 1px solid #aaa; float: right; width: 46%;"><i>Jeszcze nie ma odpowiedzi</i></p>' );
                            }
                            html.push( '</div>' );
                        }

                        elem = $( html.join('') );
                        $('#tools-expert-qa').find('.qa').remove().end().append( elem );
                    }
                });
            };

            var get_comments = function () {
                $.ajax({
                    url: '/get_user_comments/',
                    type: 'GET',
                    dataType: 'json',
                    success: function ( received ) {
                        var comments, data = received;
                        var i, j, n = data.length > 5 ? 5 : data.length;
                        var elem, html = [];

                        for( i = 0; i < n; ++i ) {
                            html.push( '<div style="clear: both; overflow: auto; margin-bottom: 15px;" class="comments-container" >' );
                            html.push( '<div style="border-top: 1px solid #999; border-bottom: 1px solid #999; padding: 3px 5px;">' );
                            html.push( 'Województwo ', data[i].wojewodztwo, ', gmina ', data[i].gmina, ' :: ', data[i].okr_ob, '</div>' );
                            for( j = data[i].comments.length-1; j >= 0 ; --j ) {
                                comment = data[i].comments[j];
                                if( j % 2 === 0 ) {
                                    html.push( '<div style="padding: 5px; background-color: #eee; margin-left: 15px; float: left; width: 60%">', comment.text, '</div>' );
                                }
                                else {
                                    html.push( '<div style="padding: 5px; background-color: #ddd; margin-left: 15px; float: left; width: 60%">', comment.text, '</div>' );
                                }
                                html.push( '<div style="padding: 5px; margin: 0px; float: left; width: 29%">', comment.user, '</div>' );
                            }
                            html.push( '</div>' );
                        }

                        elem = $( html.join('') );
                        $('#tools-comments').empty().append( elem );
                    }
                });
            };

            var unselectable = function () {
                $('.selected').removeClass('selected');
                $('#data-table > tbody').find('tr').unbind('click');
            };

            unselectable();
            $('#tools-popup').toggle();
            $('h2[data-name="tools-browser"]').trigger('click');

            if( $('#tools-browser').find('tr').length !== 0 ) {
                if( $('#tools-popup').is(':visible') ) {
                    $('.poviats').hide();
                }
                return;
            }

            $('.tab').click( function () {
                var name = $(this).attr('data-name');

                unselectable();

                switch( name ) {
                    case "tools-expert":
                        $('#data-table > tbody').find('tr').click( function () {
                            $(this).toggleClass('selected');
                        });
                        get_answered();
                        break;
                    case "tools-comments":
                        get_comments();
                        break;
                }

                $('.tab').removeClass('active');
                $(this).addClass('active');
                $('.tools-panel').hide().removeClass('active');
                $('#'+name).show().addClass('active');
            });

            $('#tools-expert-send').click( function () {
                var question = $('#tools-expert-question').val();
                var ids = $.map( $('.selected'), function ( e ) {
                    return $(e).attr('id');
                });

                if( !question ) {
                    return;
                }
                $.post( '/ask_question/', { q: question, ids: ids } );
                unselectable();
                $('#tools-expert-question').val('');
                $('#tools-popup').hide();
            });

            $.ajax({
                url: '/get_metadata/',
                type: 'GET',
                dataType: 'json',
                success: function ( received ) {
                    var data = received;
                    var voivod, poviats;
                    var i, j;
                    var elem, html = [];

                    for( i = 0; i < data.length; ++i ) {
                        voivod = data[i];
                        poviats = voivod.powiats;

                        html.push( '<tr>' );
                        html.push( '<td><a id="', voivod._id, '" class="button voivodship">Województwo ', voivod.name, '</a></td>' );
                        html.push( '<td><span>Liczba: ', voivod.count, '</span></td>' );
                        html.push( '<td><span>Gotowych: ', voivod.edited, '</span></td>' );
                        html.push( '</tr>' );

                        for( j = 0; j < poviats.length; ++j ) {
                            html.push( '<tr style="margin-bottom: 10px;" class="poviats ', voivod._id, '">' );
                            html.push( '<td style="padding-left: 20px;"><a href="/page/1/search/', poviats[j].name, '" class="button">' );
                            html.push( 'Powiat ', poviats[j].name, ' <b>&gt;&gt;</b>' );
                            html.push( '</a></td>' );
                            html.push( '<td><span>Liczba: ', poviats[j].count, '</span></td>' );
                            html.push( '<td><span>Gotowych: ', poviats[j].edited, '</span></td>' );
                            html.push( '</tr>' );
                        }
                    }

                    elem = $( html.join('') );
                    $('#tools-browser').append( elem );
                    $('.poviats').hide();

                    $('.voivodship').click( function () {
                        var id = $(this).attr('id');
                        $('.'+id).toggle();
                    });
                }
            });
        });
        makezebra();
        $('table').fixedtableheader();
        set_clickable();

        setInterval( function () {
            var ids = $.map( $('#data-table').find('tbody > tr'), function ( e ) {
                    return e.id;
                });
            $.post( '/user_on/', { ids: ids } );
        }, 30000 );

        setInterval( function () {
            var ids = $.map( $('#data-table').find('tbody > tr'), function ( e ) {
                    return e.id;
                });

            $.post( '/check_new_comments/',
                    { 'ids': JSON.stringify( ids ) },
                    function ( received_data ) {
                        var data = JSON.parse( received_data );
                        data.forEach( function ( e ) {
                            var comment = $('#'+e.id).find('.comment-count');
                            var count = parseInt( comment.html() );

                            if( e.count !== count ) {
                                if( count === 0 ) {
                                    comment.css('font-weight', 'bold')
                                           .next().removeClass('empty');
                                }
                                comment.html( e.count );
                            }
                        });
                    }
            );
        }, 5000 );
    });

    function makezebra() {
        $('tbody > tr:even').each( function () {
            $(this).addClass( 'even' );
        });
    }

    function set_clickable() {
        $('tr').not('.blocked')
               .not('.approved')
               .find('.editable')
               .dblclick( function( event ) {
            addEditEvent( event, $(this) );
        });
    }

    function addEditEvent( event, td_cell) {
        if( $('#editing').length > 0 ) {
            confirmInput();
        }
        value = td_cell.html( );
        editInPlace( td_cell );
    }

    function editInPlace( td_cell ){

        var input_width = td_cell.width();
        var input = '<input type="text" id="editing" style="width: ' + input_width + 'px;" value="'+ value +'" />';
        var textinput= $(input);

        td_cell.empty();
        td_cell.html( textinput );
        $('#editing').focus();

        // detect enter confirmation
        $(document).keypress( function( event ) {
            if( event.keyCode === 13 ) {
                confirmInput();
            }
        });

        // detect esc cancel
        $(document).keyup( function( event ){
            if( event.keyCode === 27 ) {
              td_cell.empty()
                  .html( value )
                  .dblclick( function ( ev ) {
                        addEditEvent( ev, td_cell);
                  });
            }

        });
    }

    function confirmInput() {
        var input = $('#editing');
        var new_value = input.val();
        var td_cell = input.parent();
        if( value !== new_value ) {
            $.ajax({
                 url : '/update/',
                 type : 'POST',
                 data : {
                     id: td_cell.parent().attr('id'),
                     key: td_cell.attr('data-key'),
                     value: new_value,
                 }
            });
            value = new_value;
        }

        td_cell.empty();
        td_cell.html( value )
        td_cell.dblclick( function( event ){
            addEditEvent( event, td_cell);
        });
        $(document).unbind();
    }


    $('#tools-icon').hover(
        function () {
            $(this).attr('src', '/img/tools_icon_hover.png' );
        },
        function () {
            $(this).attr('src', '/img/tools_icon.png' );
        }
    );

    $('tbody').find('img').hover(
        function () {
            $(this).attr('src', '/img/comments_over.png' );
        },
        function () {
            $(this).attr('src', '/img/comments.png' );
        }
    ).click( function () {
       $.ajax({
                url : '/get_comments/',
                type : 'GET',
                data : {
                    id: $(this).parent().parent().attr('id')
                },
                success: comments_panel
            });
    });

    function comments_panel( received_data ) {
        var received = JSON.parse( received_data );
        var html = [];

        html.push( '<div id="comments-panel">' );
        if( received['data'].length !== 0 ) {
            received['data'].forEach( function ( e ) {
                html.push( '<p style="color: #8b8b8b; font-size: 14px;">' + e['user'] + '</p>' );
                html.push( '<p style="margin-left: 10px">' + e['text'] + '</p>' );
            });
        }
        else {
            html.push( '<h3>Brak komentarzy</h3>' );
        }
        html.push( '<hr />' );
        html.push( '<h3>Twój komentarz</h3>' );
        html.push( '<textarea id="'+ received['id'] +'" name="comment_text" style="height: 100px; width: 250px;">' );
        html.push( '</textarea>' );
        html.push( '<div id="add-comment" class="comment-button button">Dodaj</div>' );
        html.push( '<div id="cancel-comment" class="comment-button button">Anuluj</div>' );
        html.push( '</div>' );

        $('body').append( html.join('') );
        $('#add-comment').click( function () {
            var textarea = $(this).parent().find('textarea');

            $.ajax({
              url: '/comment/',
              type: 'POST',
              data: {
                id: textarea.attr('id'),
                 text: textarea.val()
              }
            });
            $('#comments-panel').remove();

            var row = $('#'+received.id);
            var comment_count = row.find('.comment-count');
            var number = parseInt( comment_count.html(), 10 );

            comment_count.html( number + 1 ).css({ 'font-weight': 'bold' });

            row.find('img').removeClass('empty');
        });

        $('#cancel-comment').click( function () {
            $('#comments-panel').remove();
        });
    }


    $('input[type="checkbox"]').click( function () {
        var tr = $(this).parent().parent();
        if( tr.hasClass('approved') ) {
            tr.removeClass('approved');
            tr.addClass('unapproved');
            $('.editable').unbind('dblclick');
            set_clickable();
        }
        else {
            tr.removeClass('unapproved');
            tr.addClass('approved');
            tr.find('.editable').unbind('dblclick');
        }

        $.ajax({
            url : '/approved/',
            type : 'POST',
            data : {
                id: $(this).parent().parent().attr('id'),
                set: tr.hasClass('approved')
            }
        });
    });
})();
