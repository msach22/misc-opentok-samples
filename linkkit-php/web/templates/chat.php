<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title></title>
</head>
<body>
  <div id="informationContainer">
    <div class="userValue">
      <span class="header">ShareLink: </span>
      <span id="customerName">
        <?php
          $pageURL = 'http';
          $pageURL .= "://".$_SERVER["SERVER_NAME"];
          if ($_SERVER["SERVER_PORT"] != "80") {
            $pageURL .= ":".$_SERVER["SERVER_PORT"];
          }
          echo $pageURL."/index.php/".$this->data['roomname']; ?>
      </span>
    </div>
  </div>
  <div id="subscriberContainer"></div>
  <div id="publisherContainer"></div>

<!-- FRAMEWORKS -->
<!-- ********** -->
<!-- ********** -->
<!-- JQuery -->
<script src="https://code.jquery.com/jquery-1.11.0.min.js"></script>
<!-- OpenTok -->
<script src="https://static.opentok.com/v2/js/opentok.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/handlebars.js/2.0.0-alpha.4/handlebars.js"></script>
<!-- Moment: date lib -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.8.2/moment-with-locales.min.js"></script>
<!-- Bootstrap 3.2.0 -->
<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.2.0/css/bootstrap.min.css">
<!-- Optional theme for Bootstrap -->
<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.2.0/css/bootstrap-theme.min.css">
<!-- Latest compiled and minified JavaScript for Bootstrap-->
<script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.2.0/js/bootstrap.min.js"></script>
<script>
var ping=function(pid){$.ajax({type:'POST',url:'https://hlg.tokbox.com/prod/logging/ClientEvent',
data:JSON.stringify({action:'sk_init',partner_id: pid,payload:{id:'link',l:'php',v:'1.0.0'}}),
processData:false, contentType: 'application/json'});};
</script>
<!-- end -->
<!-- ********** -->
<!-- ********** -->


<!-- JS and CSS -->
<!-- ********** -->
<!-- ********** -->
<link rel="stylesheet" href="/assets/css/chat.css">
<script src="/assets/js/chat.js"></script>
<!-- ********** -->
<!-- ********** -->

<script>
  var apiKey = "<?php echo($this->data['apiKey']); ?>",
      session_id = "<?php echo($this->data['Sessionid']); ?>",
      token = "<?php echo($this->data['token']); ?>",
      property = { width: "100%", height: "100%", insertMode: "append" },
      publisher = OT.initPublisher("publisherContainer", property),
      session = OT.initSession(apiKey, session_id),
      userType;

  session.connect( token, function(err) {
    if(!err) { session.publish(publisher); }
    userType = session.connection.data;
  });
  session.on("streamCreated", function(event) {
    session.subscribe(event.stream, 'subscriberContainer',  property);
  });
  session.connect(token, function(err) {
    if(!err){ session.publish(publisher); }
  });

  function sendHeartbeat() {
    $.post("/index.php/"+session_id, {userType: userType}, function(res) {
      heartBeatTimeout();
    });
  }

  function heartBeatTimeout() {
    window.setTimeout(function() {
      sendHeartbeat();
    }, 1000);
  }
  heartBeatTimeout();

  ping(apiKey);
</script>
</body>
</html>
