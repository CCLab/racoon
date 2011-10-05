(function () {
    var value;

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

    function confirmInput(){
        var input = $('#editing');
        var newValue = input.val();
        var TdCell = input.parent();
        if (value !== newValue){
            $.ajax({
                url : '/update/',
                type : 'POST',
                data : {
                    id: TdCell.parent().attr('id'),
                    key: TdCell.attr('data-key'),
                    value: newValue,
                },
            });
            value = newValue;
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
                url : '/comment/',
                type : 'POST',
                data : {
                    id: $(this).parent().parent().attr('id'),
                    text: 'To jest zahardkodowny komentarz!!!!!'
                }
            });
    });

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
