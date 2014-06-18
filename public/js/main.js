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
                    '(' + data.daily + ') ' + data.key + '</a>' +
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
      var key = $(listItemId).text();
      key = key.substring(key.indexOf(' ')+1);
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

  function updateProgressBar(val) {
      //if (val <= 50) {
        //$('.progress-bar').addClass('progress-bar-success');
      //} else if (val <= 75) {
        //$('.progress-bar').addClass('progress-bar-warning');
      //} else {
        //$('.progress-bar').addClass('progress-bar-danger');
      //}
      $('.progress-bar').css('width', val.toString() + "%");
      $('.progress-bar').attr('aria-valuenow', val.toString());
      $('.progress-bar').text(val.toString() + "%");
  }

  function initJob() {
    var ne = mapRect.getBounds().getNorthEast();
    var sw = mapRect.getBounds().getSouthWest();
    
    var bounds = { 
      nw: { lat: sw.lat(), lon: ne.lon() },
      se: { lat: ne.lat(), lon: sw.lon() }
    }
    var key = $('.input-group > a.active').text();
    key = key.substring(key.indexOf(' ')+1);
    var queryLimit = $('.queryLimit > label > active').text();
    $.post('/job/run', { bounds: bounds, key: key, queryLimit: queryLimit} , function(data) {
      console.log("JOB finished!");
    });
    
  }

  function initialize() {
    var mapOptions = {
      zoom: 11,
      center: new google.maps.LatLng(56.9489, 24.1064),
      mapTypeId: google.maps.MapTypeId.SATELLITE
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
