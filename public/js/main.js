$(document).ready(function() {
  $('#addkey_form').on("submit", function(e) {
      e.preventDefault();
      $.post('/keys/add', $('#addkey_form').serialize(), function(data, status) {
        console.log(data);
        var id;
        var activeClass = '';
        if ($('.input-group').not('.hidden').length === 0) {
          id = 0;
          activeClass = 'active';
        } else {
          id = parseInt($('.input-group').last().attr("id").replace("inputGroup", ""));
          id++;
        }
        var inputGroupId = "inputGroup" + id;
        var listItemId = "listItem" + id;
        var buttonItemId = "buttonItem" + id;
        var inputGroupHTML = '<div id="' + inputGroupId + '" class="input-group col-sm-2">' +
                   '<a href="#" id="' + listItemId + '" class="list-group-item ' + activeClass + '">' + data.key + '</a>' +
                   '<span class="input-group-btn">' +
                   '<button type="button" id="' + buttonItemId + '" class="btn btn-danger">-</button>' +
                   '</span>' +
                   '</div>';
        $('.keys').append(inputGroupHTML); 
        if (id === 0) {
          $('.keys > .input-group > a').addClass('active');
        }
        //$('.keys').append('<a href="#" class="list-group-item">' + data.key + '</a>');
      });
  });

  $('.keys').on('click', '.input-group > a', function(e) {
      $( '.keys > .input-group > a' ).removeClass('active');
      $( e.target ).addClass('active');
  });

  $('.keys').on('click', '.input-group > span > button', function(e) {
      var listItemId = "#listItem" + $(e.target).attr("id").replace("buttonItem", "");
      var inputGroupId = "#inputGroup" + $(e.target).attr("id").replace("buttonItem", "");
      $.ajax({
        type: "GET",
        url: "/keys/remove/" + $(listItemId).text(),
        success: function(msg){

        }
      });
      $(inputGroupId).addClass("hidden");
      if ($('.input-group').not('.hidden').length === 1) {
        $('.input-group').not('.hidden').addClass('active');
      }
  });
});
