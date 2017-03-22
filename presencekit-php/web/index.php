<?php

/* ------------------------------------------------------------------------------------------------
 * Composer Autoloader
 * -----------------------------------------------------------------------------------------------*/
require_once __DIR__.'/../vendor/autoload.php';

use \Slim\Slim;
use \OpenTok\OpenTok;
use \OpenTok\Role;
use \werx\Config\Providers\ArrayProvider;
use \werx\Config\Container;

/* ------------------------------------------------------------------------------------------------
 * Slim Application Initialization
 * -----------------------------------------------------------------------------------------------*/
$app = new Slim(array(
    'log.enabled' => true
));

/* ------------------------------------------------------------------------------------------------
 * Configuration
 * -----------------------------------------------------------------------------------------------*/
$provider = new ArrayProvider('../config');
$config = new Container($provider);

// Environment Selection
$app->configureMode('development', function () use ($config) {
    $config->setEnvironment('development');
});

$config->load(array('opentok'), true);

// Constants
define('NAME_MAX_LENGTH', '100');

/* ------------------------------------------------------------------------------------------------
 * OpenTok Initialization
 * -----------------------------------------------------------------------------------------------*/
$opentok = new OpenTok($config->opentok('key'), $config->opentok('secret'));

/* ------------------------------------------------------------------------------------------------
 * Routing
 * -----------------------------------------------------------------------------------------------*/

// Presence configuration
// 
// Response: (JSON encoded)
// *  `apiKey`: The presence session API Key
// *  `sessionId`: The presence session ID
$app->get('/presence', function () use ($app, $config) {

    $responseData = array(
        'apiKey' => $config->opentok('key'),
        'sessionId' => $config->opentok('presenceSession')
    );

    $app->response->headers->set('Content-Type', 'application/json');
    $app->response->setBody(json_encode($responseData));
});

// User enters
//
// Request: (JSON encoded)
// *  `name`: A name for the user that will appear in the UI
// 
// Response: (JSON encoded)
// *  `token`: A token that can be used to connect to the presence session, which also identifies 
//    the user to all other users who connect to it.
//
// NOTE: This request allows anonymous access, but if user authentication is required then the 
// identity of the request should be verified (often times with session cookies) before a valid 
// response is given.
// NOTE: Uniqueness of names is not enforced.
$app->post('/users', function () use ($app, $opentok, $config) {
    $rawBody = $app->request->getBody();
    $params = json_decode($rawBody);

    // Parameter validation
    $name = $params->name;
    if (empty($name) || strlen($name) > intval(NAME_MAX_LENGTH)) {
        $app->response->setStatus(400);
        return;
    }

    $token = $opentok->generateToken($config->opentok('presenceSession'), array(
        'data' => json_encode(array( 
            'name' => $name
        )),
        'role' => Role::SUBSCRIBER
    ));
    $responseData = array( 'token' => $token );

    $app->response->headers->set('Content-Type', 'application/json');
    $app->response->setBody(json_encode($responseData));
});

// Create a chat
//
// Request: (JSON encoded)
// *  `invitee`: the name of the other user who is being invited to the chat
//
// Response: (JSON encoded)
// *  `apiKey`: an OpenTok API key that owns the session ID
// *  `sessionId`: an OpenTok session ID to conduct the chat within
// *  `token`: a token that the creator of the chat (or inviter) can use to connect to the chat 
//    session
// 
// NOTE: This request is designed in a manner that would make it convenient to add user 
// authentication in the future. The `invitee` field is not currently used but could be used to help 
// verify that a user who attempts to create a chat is allowed to do so. An alternative design could 
// be to hand both the `inviterToken` and `inviteeToken` to the inviter, who could then send the 
// invitee a token over an OpenTok signal. The drawback of that design would be that the server 
// loses the ability to keep track of the state of a user (such as if they have joined a chat or not).
$app->post('/chats', function () use ($app, $opentok, $config) {
    // NOTE: Uses a relayed session. If a routed session is preferred, add that parameter here.
    $chatSession = $opentok->createSession();
    $responseData = array(
        'apiKey' => $config->opentok('key'),
        'sessionId' => $chatSession->getSessionId(),
        'token' => $chatSession->generateToken()
    );

    $app->response->headers->set('Content-Type', 'application/json');
    // NOTE: would add a 'Location' header if a new resource URI were to be created
    $app->response->setBody(json_encode($responseData));
});

// Join a chat
//
// Request: (query parameter)
// *  `sessionId`: the OpenTok session ID which corresponds to the chat an invitee is attempting 
//    to enter
// 
// Response: (JSON encoded)
// *  `apiKey`: an OpenTok API key that owns the session ID
// *  `sessionId`: an OpenTok session ID to conduct the chat within
// *  `token`: a token that the user joining (or invitee) a chat can use to connect to the chat 
//    session
//
// NOTE: This request is designed in a manner that would make it convenient to add user 
// authentication in the future. The query parameter `sessionId` is like a filter on  the `/chats`
// resource to find the appropriate chat. Alternatively, if new chats were stored for  some time,
// each one could be given an independent URI. The invitee would then GET that specific resource.
// The response would then contain the `sessionId` and an appropriate token (invitee or inviter)
// based on user authentication.
$app->get('/chats', function () use ($app, $opentok, $config) {
    // Parameter validation
    $sessionId = $app->request->params('sessionId');
    if (empty($sessionId)) {
       $app->response->setStatus(404); 
       return;
    }

    // An exception can be generated if the sessionId was an arbitrary string
    try {
        $token = $opentok->generateToken($sessionId);
    } catch (\OpenTok\Exception\InvalidArgumentException $e) {
        $app->response->setStatus(404);
        return;
    }
    $responseData = array(
        'apiKey' => $config->opentok('key'),
        'sessionId' => $sessionId,
        'token' => $token
    );

    $app->response->headers->set('Content-Type', 'application/json');
    $app->response->setBody(json_encode($responseData));
});

/* ------------------------------------------------------------------------------------------------
 * Application Start
 * -----------------------------------------------------------------------------------------------*/
$app->run();

