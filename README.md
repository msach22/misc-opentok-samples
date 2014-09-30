# OpenTok LinkTok Starter Kit

An OpenTok 1-to-1 solution focussed on link sharing

## Installation

1. Clone the repository.
2. Rename   `config.ini.sample` to `config.ini` and configure your credentials.
2. Set the `OPENTOK_KEY` and `OPENTOK_SECRET` variables in `config.ini` to your OpenTok API key and
   secret values from the [TokBox Dashboard](https://dashboard.tokbox.com).
3. Set the `MYSQL_URL` environment variable with your MySQL database URL in `config.ini`. The format is
   `mysql://username:password@mysqlurl:port/database_name`
4. Install [Composer](https://getcomposer.org/).
5. Use Composer to install dependencies: `composer install`
6. Set the document root for your web server (such as Apache, nginx, etc.) to the `web` directory
   of this project. In the case of Apache, the provided `.htaccess` file handles URL rewriting.
   See the [Slim Route URL Rewriting Guide](http://docs.slimframework.com/#Route-URL-Rewriting)
   for more details.

## Usage

1. Visit the URL mapped to the application by your web server. `linktok.com:8888`
2. Enter a name for the chat room.
3. Share the URL with a friend and you will get a 1-1 chat session.

## Requirements

* PHP
* Mysql

## Code and Conceptual Walkthrough

### Server

* All server code is located in `index.php`.
* `index.php` starts off by creating and connecting to the database and table required for the app.
* Rooms table:
  * Name -- the room name
  * Sessionid - The OpenTok session ID that the users will connect to
  * User1 - The timestamp of user1's heartbeat to see if user1 is still connected to the room
  * User2 - The timestamp of user2's heartbeat to see if user2 is still connected to the room
* All the end points are created in `index.php`.

### Interaction

* A user starts by going to the root URL, and `index.php` renders `templates/createRoom.php`
* `createRoom.php` is a simple input where the user types in the room they want to join. 
  * Styling for `createRoom.php`is located in `assets/css/createRoom.css`.
  * JavaScript code for `createRoom.php`is located in `assets/js/createRoom.js`.
    * When the user presses the Enter key, the user is sent to the `/roomname` endpoint in
      `index.php`.
      * `/:roomname` attempts to retrieve the room from the table.
        * If the room does not exist, the code creates an OpenTok session ID for that room and
          stores the room name and session ID in the table.
        * If the room exists, the code checks if the user1 and user2 column timestamps are within
          60 seconds of current time. If it is, that means there are already 2 people in the room
          currently, and the "Room is full message" is displayed.
        * If the room is available, the code stores the user ID (user1 or user2) in the data of the
          OpenTok token so we can identify the users later. The page renders `templates/chat.php`.
* `chat.php` renders the view of the video chat room. 
  * When the user connects to the OpenTok session, the page gets the user ID (user1 or user2) that
    was encoded into the token by checking the `session.connection.data` property.
  * `heartBeatTimeout` sends a post request to the `/:sessionid` endpoint in `index.php` with the
     user ID.
  * `index.php` retrieves the room based on the session ID and update the userId with current
    timestamp.

## Appendix

### Deploying to Heroku

Heroku is a PaaS (Platform as a Service) that can use to deploy simple and small applications for
free. For that reason, you may choose to experiment with this code and deploy it using
Heroku.

*  The provided `Procfile` describes a web process that launches this application.
*  This application needs MYSQL to run. Follow [heroku addons:add cleardb:ignite](these instructions) to install ClearDB addon for heroku to get MYSQL
*  Use Heroku config to set the following keys:
   -  `OPENTOK_KEY` - Your OpenTok API Key
   -  `OPENTOK_SECRET` - Your OpenTok API Secret
   -  `MYSQL_URL` - Your ClearDB url when you added the addon
      the [ClearDB add-on](https://devcenter.heroku.com/articles/cleardb) for Heroku.


