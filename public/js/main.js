$(document).ready(function() {
  $("#addKey").click(function() {
    $.post('/keys/add', $('#addkey_form').serialize())
  });
});
