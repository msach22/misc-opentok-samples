window.appHelper = {};
function setDateString(){
  var datestr = moment().add(dateDiff, 'days').format('ddd MMM DD, YYYY');
  var daystring = moment().add(dateDiff, 'days').format(DAYSTRING);
  $("#dateHeader").text(datestr);
  $.get("/index.php/availability/"+daystring, function(res){
    var bookings = JSON.parse(res);
    $(".time").removeClass('bookedTime');
    for(var i=0;i<bookings.length;i++){
      var hour = moment(parseInt(bookings[i])).format('H');
      $(".selectableTime.time[data-hour="+hour+"]").addClass('bookedTime');
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

