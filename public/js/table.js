(function () {
    var value;
    var socket = io.connect('http://localhost:3030');

    socket.on( 'update-comment', function ( data ) {
        var row = $('#'+data.id);
        var comment_count = row.find('.comment-count');
        var number = parseInt( comment_count.html(), 10 );

        comment_count.html( number + 1 ).css({ 'font-weight': 'bold' });

        row.find('img').removeClass('empty');
    });

    socket.on( 'update-cell', function ( data ) {
        $('#'+data.id).find('td[data-key='+data.key+']').html( data.value );
    });

    $(document).ready(function() {
        makezebra();
        $('table').fixedtableheader();
        setClickable();
    });


    function makezebra() {
        $('tbody>tr')
            .each( function ( i ) {
                    if( i % 2 === 0 ) {
                        $(this).addClass( 'even' );
            }
        });
    }

    function setClickable(){
        $('.editable')
            .dblclick( function( event ) {
                addEditEvent( event, $(this));
            });
    }

    function addEditEvent( event, TdCell) {
        if( $('#editing').length > 0 ) {
            confirmInput();
        }
        value = TdCell.html( );
        editInPlace( TdCell );
    }

    function editInPlace( TdCell ){

        var input_width = TdCell.width();
        var input = '<input type="text" id="editing" style="width: ' + input_width + 'px;" value="'+ value +'" />';
        var textinput= $(input);

        TdCell.empty();
        TdCell.html( textinput );
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
              TdCell.empty()
                  .html( value )
                  .dblclick( function ( ev ) {
                        addEditEvent( ev, TdCell);
                  });
            }

        });
    }

    function confirmInput() {
        var input = $('#editing');
        var new_value = input.val();
        var TdCell = input.parent();
        if( value !== new_value ) {
            socket.emit( 'update_cell', {
                id: TdCell.parent().attr('id'),
                key: TdCell.attr('data-key'),
                value: new_value,
            });
            value = new_value;
        }

        TdCell.empty();
        TdCell.html( value )
        TdCell.dblclick( function( event ){
            addEditEvent( event, TdCell);
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
            // socket code goes here
            console.log( "CLIK" );
            socket.emit( 'comment', {
                id: $('textarea').attr('id'),
                text: $('textarea').val()
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
