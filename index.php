<?php
// make sure these settings are set in php.ini
// display_errors = On
//phpinfo() 

require 'vendor/autoload.php';
use OpenTok\OpenTok;
use OpenTok\Session;
use OpenTok\Role;

// mysql - replace user/pw and database name
// Set env vars in /Applications/MAMP/Library/bin/envvars if you are using MAMP
// MYSQL env: export CLEARDB_DATABASE_URL="mysql://root:root@localhost/tb_schedule
// MYSQL formate: username:pw@url/database
$mysql_url = parse_url(getenv("MYSQL_URL"));
$dbname = substr($mysql_url['path'],1);
$con = mysqli_connect($mysql_url['host'], $mysql_url['user'], $mysql_url['pass']);

// Check connection
if (mysqli_connect_errno()) {
  echo "Failed to connect to MySQL: " . mysqli_connect_error();
}

// Create database - only do once if db does not exist
// Use our database and create table
$sql="CREATE DATABASE IF NOT EXISTS $dbname";
if (!mysqli_query($con,$sql)) {
  echo "Error creating database: " . mysqli_error($con);
}
mysqli_select_db($con, $dbname);
$sql="CREATE TABLE IF NOT EXISTS `Schedules` (
  `Name` CHAR(255),
  `Email` CHAR(255),
  `Comment` TEXT,
  `Timestamp` BIGINT,
  `Daystring` CHAR(255),
  `Sessionid` CHAR(255),
  `Timestring` CHAR(255))";
if (!mysqli_query($con,$sql)) {
  echo "Error creating table: " . mysqli_error($con);
}
function sendQuery($query){
  global $con;
  $result = mysqli_query($con, $query);
  if (!$result) {
    die('Error: ' . mysqli_error($con));
  }
  return $result;
}

// Email setup
$mail = new PHPMailer();
$mail -> IsSMTP();
$mail -> Host       = "demo.tokbox.com"; // SMTP server
$mail->SMTPDebug  = 0;                     // enables SMTP debug information (for testing)
                                           // 1 = errors and messages
                                           // 2 = messages only
$mail->SMTPAuth   = true;                  // enable SMTP authentication
$mail->SMTPSecure = "tls";
$mail->Host       = "smtp.sendgrid.net"; // sets the SMTP server
$mail->Port       = 587;                    // set the SMTP port for the GMAIL server
$mail->Username   = getenv('SENDGRID_USER'); // SMTP account username
$mail->Password   = getenv('SENDGRID_PW');        // SMTP account password

function sendEmail($fromName, $fromEmail, $toName, $toEmail, $subject, $body){
  global $mail;
  $mail->SetFrom($fromEmail, $fromName);
  $mail->Subject  = $subject;
  $mail->MsgHTML($body);
  $mail->AddAddress($toEmail,$toName);

  if(!$mail -> Send()) {
    echo "Mailer Error: " . $mail -> ErrorInfo;
  }    
  return;
}
// end of email setup

function getBaseURL(){
  $pageURL = 'http';
  $pageURL .= "://".$_SERVER["SERVER_NAME"];
  if ($_SERVER["SERVER_PORT"] != "80") {
    $pageURL .= ":".$_SERVER["SERVER_PORT"];
  }
  return $pageURL;
}


// opentok
$apiKey = getenv('OPENTOK_KEY');
$apiSecret = getenv('OPENTOK_SECRET');
$opentok = new OpenTok($apiKey, $apiSecret);

// setup slim framework
$app = new \Slim\Slim(array(
  'templates.path' => './templates'
));

// routes
$app->get('/', function () use ($app) {
  $app->render('customer.php');
});
// rep get details about an appointment
$app->get('/getinfo/:timestamp', function ($timestamp) use ($app, $con) {
  $result = sendQuery("SELECT * FROM Schedules WHERE Timestamp='$timestamp'");
  $appointmentInfo = mysqli_fetch_assoc($result);
  header("Content-Type: application/json");
  echo json_encode($appointmentInfo);
});
// get availability of a certain day, used by both rep and customer
$app->get('/availability/:daystring', function ($daystring) use ($app, $con) {
  $result = sendQuery("SELECT timestamp FROM Schedules WHERE Daystring='$daystring'");
  $data = [];
  while($row = mysqli_fetch_array($result)){
    array_push($data, $row['timestamp']);
  }
  header("Content-Type: application/json");
  echo json_encode($data);
});
$app->get('/cancel/:timestamp', function ($timestamp) use ($app, $con) {
  // retrieve user information
  $result = sendQuery("SELECT * FROM Schedules WHERE Timestamp='$timestamp'");
  $appointmentInfo = mysqli_fetch_assoc($result);

  // delete record
  sendQuery("DELETE FROM Schedules WHERE Timestamp='$timestamp'");

  sendEmail('TokBox Demo', 
    'demo@tokbox.com', 
    $appointmentInfo['Name'],
    $appointmentInfo['Email'], 
    "Cancelled: Your TokBox appointment on " .$appointmentInfo['Timestring'], 
    "Your appointment on " .$appointmentInfo['Timestring']. ". has been cancelled. We are sorry for the inconvenience, please reschedule on ".getBaseURL()."/index.php/");
  header("Content-Type: application/json");
  echo json_encode($appointmentInfo);
});
$app->post('/schedule', function () use ($app, $con, $opentok) {
  $name = $app->request->post("name");
  $email = $app->request->post("email");
  $comment = $app->request->post("comment");
  $timestamp = $app->request->post("timestamp");
  $daystring = $app->request->post("daystring");
  $session = $opentok->createSession();
  $sessionId = $session->getSessionId();
  $timestring = $app->request->post("timestring");

  $query = sprintf("INSERT INTO Schedules (Name, Email, Comment, Timestamp, Daystring, Sessionid, Timestring) VALUES ('%s', '%s', '%s', '%d', '%s', '%s', '%s')",
    mysqli_real_escape_string($con, $name),
    mysqli_real_escape_string($con, $email),
    mysqli_real_escape_string($con, $comment),
    intval($timestamp),
    mysqli_real_escape_string($con, $daystring),
    mysqli_real_escape_string($con, $sessionId),
    mysqli_real_escape_string($con, $timestring)
  );
  sendQuery($query);

  sendEmail('TokBox Demo', 'demo@tokbox.com', $name, $email, "Your TokBox appointment on " .$timestring, "You are confirmed for your appointment on " .$timestring. ". On the day of your appointment, go here: ".getBaseURL()."/index.php/chat/" .$sessionId);

  $app->render('schedule.php');
});
$app->get('/rep', function () use ($app) {
  $app->render('rep.php');
});
$app->get('/chat/:session_id', function ($session_id) use ($app, $con, $apiKey, $opentok) {
  $result = sendQuery("SELECT * FROM Schedules WHERE Sessionid='$session_id'");
  $appointmentInfo = mysqli_fetch_assoc($result);
  $token = $opentok->generateToken($session_id);
  $app->render('chat.php', array(
    'name' => $appointmentInfo['Name'],
    'email' => $appointmentInfo['Email'],
    'comment' => $appointmentInfo['Comment'],
    'apiKey' => $apiKey,
    'session_id' => $session_id,
    'token' => $token
  ));
});
$app->run();
?>
