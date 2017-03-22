<?php

require '../vendor/autoload.php';
use OpenTok\OpenTok;

/* ------------------------------------------------------------------------------------------------
 * Configuration - pull credentials from env or config.ini
 * -----------------------------------------------------------------------------------------------*/
$config_array = parse_ini_file("../config.ini");
$mysql_url = getenv("MYSQL_URL") ? : $config_array['MYSQL_URL'];
$apiKey = getenv('OPENTOK_KEY') ? : $config_array['OPENTOK_KEY'];
$apiSecret = getenv('OPENTOK_SECRET') ? : $config_array['OPENTOK_SECRET'];

// mysql - replace user/pw and database name
// Set env vars in /Applications/MAMP/Library/bin/envvars if you are using MAMP
// MYSQL env: export CLEARDB_DATABASE_URL="mysql://root:root@localhost/tb_schedule
// MYSQL format: username:pw@url/database
$mysql_url = parse_url($mysql_url);
$dbname = substr($mysql_url['path'],1);
$con = mysqli_connect($mysql_url['host'] . ':' . $mysql_url['port'], $mysql_url['user'], $mysql_url['pass']);

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
$sql="CREATE TABLE IF NOT EXISTS `Rooms` (
  `Name` CHAR(255),
  `Sessionid` CHAR(255),
  `User2` CHAR(255),
  `User1` CHAR(255))";
if (!mysqli_query($con,$sql)) {
  echo "Error creating table: " . mysqli_error($con);
}

function getBaseURL(){
  $pageURL = 'http';
  $pageURL .= "://".$_SERVER["SERVER_NAME"];
  if ($_SERVER["SERVER_PORT"] != "80") {
    $pageURL .= ":".$_SERVER["SERVER_PORT"];
  }
  return $pageURL;
}


// opentok
$opentok = new OpenTok($apiKey, $apiSecret);

// setup slim framework
$app = new \Slim\Slim(array(
  'templates.path' => './templates'
));

// variables
$date = new DateTime();

// routes
$app->get('/', function () use ($app) {
  $app->render('createRoom.php');
});
$app->post('/:sessionId', function ($sessionId) use ($app, $con, $date) {
  $userType = $app->request->post("userType");
  echo $userType;
  $currentTime = $date->getTimestamp();
  if($userType == "User1"){
    $sql = "UPDATE ROOMS SET User1='$currentTime' WHERE Sessionid='$sessionId'";
  }else{
    $sql = "UPDATE ROOMS SET User2='$currentTime' WHERE Sessionid='$sessionId'";
  }
  if (!mysqli_query($con,$sql)) {
    die('Error: ' . mysqli_error($con));
  }
  echo 'success updating '.$userType;
});
$app->get('/:roomname', function ($roomname) use ($app, $con, $opentok, $apiKey, $date) {
  $roomAvailable = false;
  $userPos = 'User1';
  $sql = "SELECT * FROM Rooms WHERE Name='$roomname'";
  $result = mysqli_query($con, $sql);
  if (!$result) {
    die('Error: ' . mysqli_error($con));
  }
  $row = mysqli_fetch_assoc($result);

  if(!$row){
    $session = $opentok->createSession();
    $sessionId = $session->getSessionId();

    // escape variables for security
    $roomname = mysqli_real_escape_string($con, $roomname);
    $sessionId = mysqli_real_escape_string($con, $sessionId);
    $currentTime = $date->getTimestamp();

    $sql = "INSERT INTO Rooms (Name, Sessionid, User1) VALUES ('$roomname', '$sessionId', '$currentTime')";
    if (!mysqli_query($con,$sql)) {
      die('Error: ' . mysqli_error($con));
    }

    $row = array();
    $row['Name'] = $roomname;
    $row['Sessionid'] = $sessionId;
    $roomAvailable = true;
  }else{
    if(intval($date->getTimestamp()) - intval($row['User1']) > 60){
      // user1 has not been in the room for > 180 seconds
      $roomAvailable = true;
    }elseif(intval($date->getTimestamp()) - intval($row['User2']) > 60){
      $userPos = 'User2';
      $roomAvailable = true;
    }
  }
  if($roomAvailable){
    $row['apiKey'] = $apiKey;
    $row['roomname'] = $roomname;
    $row['token'] = $opentok->generateToken($row['Sessionid'], array(
      'data' => $userPos
    ));

    $app->render('chat.php', $row);
  }else{
    echo "Room is full at the moment. Please try again in a few minutes";
  }
});

$app->run();

?>
