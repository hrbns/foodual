$(document).ready(function() {
  $('#addkey_form').on("submit", function(e) {
      e.preventDefault();
      $.post('/keys/add', $('#addkey_form').serialize(), function(data, status) {
        $('.keys').append('<a href="#" class="list-group-item">' + data.key + '</a>');
      });
  });
  $('.keys.input-group > a.list-group-item').click(function(e) {
      $( '.keys > a.list-group-item' ).removeClass('active');
      $( e.target ).addClass('active');
  });
  $('.keys.input-group > button.input-group-btn').click(function(e) {
      console.log($( e.target ).prev().val());
      $.post('/keys/delete', { key: $( e.target ).prev().val() }, function(data, status) {
      });
      $( e.target ).prev().addClass("hidden");
  });
});
