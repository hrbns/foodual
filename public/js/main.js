$(document).ready(function() {
  var map;
  var mapRect;
  if ($('.input-group').not('.hidden').length === 1) {
    $('.input-group').not('.hidden').find('a').addClass('active');
  }
  $('#addkey_form').on("submit", function(e) {
      e.preventDefault();
      var id;
      var activeClass = '';
      var inputGroupId = "inputGroup" + id;
      var listItemId = "listItem" + id;
      var buttonItemId = "buttonItem" + id;
      $('#addKey').button('loading');
      if ($('.input-group').last().length !== 0) {
        id = parseInt($('.input-group').last().attr("id").replace("inputGroup", ""));
        id++;
      } else {
        id = 0;
        activeClass = 'active';
      }
      if ($('.input-group').not('.hidden').length === 0) {
        activeClass = 'active';
      } 
      $.post('/keys/add', $('#addkey_form').serialize(), function(data, status) {
        var inputGroupHTML = '<div id="' + inputGroupId + '" class="input-group col-sm-2">' +
                   '<a href="#" id="' + listItemId + '" class="list-group-item ' + activeClass + '">' + 
                    '<span>(' + data.daily + ') </span>' + data.key + '</a>' +
                   '<span class="input-group-btn">' +
                   '<button type="button" id="' + buttonItemId + '" class="btn btn-danger">-</button>' +
                   '</span>' +
                   '</div>';
        $('.keys').append(inputGroupHTML); 
        $('#addKey').button('reset'); 
        if (id === 0) {
          $('.keys > .input-group > a').addClass('active');
        }
        var dailyPercentVal = parseInt(data.daily.replace("%", ""));
        updateProgressBar(dailyPercentVal);
        console.log(data.responseText); 
        //$('.keys').append('<a href="#" class="list-group-item">' + data.key + '</a>');
      }).fail(function(data) {
        //var errorFlashHTML = '<div class="alert alert-danger fade in">' +
                             //'<button class="close" type="button" data-dismiss="alert">x</button>' +
                             //'<div>' + data.responseText + '</div>';
        var flashHTML = JSON.parse(data.responseText).flash;
        console.log(data.resposneText);
        $('body > .container').prepend(flashHTML);
      });
  });

  $('.keys').on('click', '.input-group > a', function(e) {
      $( '.keys > .input-group > a' ).removeClass('active');
      $( e.target ).addClass('active');
  });

  $('.keys').on('click', '.input-group > span > button', function(e) {
      var listItemId = "#listItem" + $(e.target).attr("id").replace("buttonItem", "");
      var inputGroupId = "#inputGroup" + $(e.target).attr("id").replace("buttonItem", "");
      var key = $('.input-group > a.active').clone().children().remove().end().text();
      $.ajax({
        type: "GET",
        url: "/keys/remove/" + key,
        success: function(msg){

        }
      });
      $(listItemId).removeClass("active");
      $(inputGroupId).addClass("hidden");
      if ($('.input-group').not('.hidden').length === 1) {
        $('.input-group').not('.hidden').find('a').addClass('active');
      }
  });

  $('#initJob').click(function() {
    $('#initJob').button('loading');
    initJob();
    pollJob();
    $('#initJob').button('reset');
  }); 

  function updateProgressBar(val) {
    $('.progress-bar').css('width', val.toString() + "%");
    $('.progress-bar').attr('aria-valuenow', val.toString());
    $('.progress-bar').text(val.toString() + "%");
  }

  function initJob() {
    if (mapRect.getMap() != null) {
      var ne = mapRect.getBounds().getNorthEast();
      var sw = mapRect.getBounds().getSouthWest();
      
      var bounds = { 
        se: { lat: sw.lat(), lon: ne.lng() },
        nw: { lat: ne.lat(), lon: sw.lng() }
      }
    }
    var key = $('.input-group > a.active').clone().children().remove().end().text();
    var queryLimit = $('.queryLimit > label.active').text();
    var _csrf = $('meta[name=csrf-token]').attr('content');
    $.post('/job/run', { bounds: bounds, key: key, queryLimit: queryLimit, _csrf: _csrf } , function(data) {
      console.log("JOB finished!");
    }).fail(function(data) {
      var flashHTML = JSON.parse(data.responseText).flash;
      console.log(data.resposneText);
      $('body > .container').prepend(flashHTML);
    });
  }

  function pollJob() {
    var _csrf = $('meta[name=csrf-token]').attr('content');
    var key = $('.input-group > a.active').clone().children().remove().end().text();
    $.post('/job/progress', {key: key, _csrf: _csrf }, function(data) {
        updateProgressBar(data.progress);
        $('.input-group > a.active > span').text(data.daily);
        setTimeout(function() {
          if (data.progress >= 100) {
            return;
          }
          pollJob();
        }, 5000);
    });
  }

  function initialize() {
    var mapOptions = {
      zoom: 11,
      center: new google.maps.LatLng(40.7127, -74.0059),
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
    mapRect = new google.maps.Rectangle();
    google.maps.event.addListener(map, 'dblclick', function() {
      if (mapRect.getMap() === undefined) {
        // Get the current bounds, which reflect the bounds before the zoom.
        var rectOptions = {
          strokeColor: '#C0C0C0',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#FF0000',
          fillOpacity: 0.25,
          editable: true,
          draggable: true,
          map: map,
          bounds: map.getBounds()
        };
        mapRect.setOptions(rectOptions);
      } else {
        mapRect.setMap(null);
        mapRect = null;
      }
    });
    google.maps.event.trigger(map, 'resize');
  }
  google.maps.event.addDomListener(window, 'load', initialize);
});
