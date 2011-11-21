(function () {
    var value;

    $(document).ready(function() {
        makezebra();
        $('table').fixedtableheader();
        set_clickable();

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

    function set_clickable(){
        $('.editable').dblclick( function( event ) {
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

    $('img').hover(
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
            $.ajax({
              url: '/comment/',
              type: 'POST',
              data: {
                id: $('textarea').attr('id'),
                 text: $('textarea').val()
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
        }
        else {
            tr.removeClass('unapproved');
            tr.addClass('approved');
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
