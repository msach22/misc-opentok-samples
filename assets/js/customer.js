var dateDiff = 0;
var DAYSTRING = "dddMMMDDYYYY";

function setDateString(){
  var datestr = moment().add(dateDiff, 'days').format('ddd MMM DD, YYYY');
  var daystring = moment().add(dateDiff, 'days').format(DAYSTRING);
  $("#dateHeader").text(datestr);
  $.get("/index.php/availability/"+daystring, function(res){
    var bookings = JSON.parse(res);
    $(".time").addClass('selectableTime');
    for(var i=0;i<bookings.length;i++){
      var hour = moment(parseInt(bookings[i])).format('H');
      $(".selectableTime.time[data-hour="+hour+"]").removeClass('selectableTime');
    }
  });
}
function getUTCAppointment(hour){
  var utc = moment().hour(parseInt(hour)).add(dateDiff, 'days')
  utc.set('minute', 0);
  utc.set('second', 0);
  utc.set('millisecond', 0);
  return parseInt(utc.format('X'));
}
function getUTCString(utc, format){
  return moment(utc).format(format)
}

$(".dateNavigate").click(function(){
  var currentUTC = parseInt(moment().hour(0).format('X'));
  dateDiff = $(this).data('dir') === "left" ? dateDiff - 1 : dateDiff + 1;
  if(getUTCAppointment(0) < currentUTC) dateDiff = dateDiff + 1;
  setDateString();
});

$(".time").click(function(){
  if(!$(this).hasClass("selectableTime")) return;
  var utc = getUTCAppointment($(this).data('hour'))*1000;
  var timestring = getUTCString(utc, "ddd MMM DD, YYYY") + " at " + getUTCString(utc, "hA");
  $("#appointmentTime").text(timestring);

  // set input fields hidden
  $("input[name=timestamp]").val(utc);
  $("input[name=daystring]").val(getUTCString(utc, DAYSTRING));
  $("input[name=timestring]").val(timestring);
  $('#myModal').modal('show');
});

setDateString();
