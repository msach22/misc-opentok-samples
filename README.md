# Scheduling Starter Kit

An OpenTok 1-to-1 solution focussed on call scheduling


## Installation

1. Clone the repository.
1. Set your opentok environment variables `TB_KEY` and `TB_SECRET` with your own key and secret values from the [TokBox Dashboard](https://dashboard.tokbox.com)
1. Set your opentok environment variable `CLEARDB_DATABASE_URL` with your mysql db url. The format is `mysql://username:password@mysqlurl:port/database_name`
1. Use [Composer](https://getcomposer.org/) to install dependencies: `composer install`
1. Use a webserver (such as Apache, nginx, etc) to the `web` directory as the document root. In the case of Apache, the provided `.htaccess` file will help properly handle URL rewriting. See the [Slim Route URL Rewriting Guide](http://docs.slimframework.com/#Route-URL-Rewriting) for more details.

## Usage

### Customer

1. Visit the URL mapped to the application by your webserver. `tbschedule.com:8888`
1. Select an appointment time and fill in your information. You should then get an email confirming your slot.
1. At the time of your appointment, join the chatroom

### Rep
1. Have another user (possibly in another window or tab) visit `/rep` url to be the rep.
1. Rep has the ability to click through and view different appointment. 
1. Rep selects an appointment and calls customer

## Requirements

* Mysql installed and running

## Code and Conceptual Walkthrough

### Server

* All server code is located in `index.php`.
* `index.php` starts off by creating and connecting to the database and table required for the app.
* Schedule table:
  * Name - customer's Name
  * Email - customer's email used to send appointment confirmation and cancellations
  * Comment - customer's comment about the things he/she would like to talk to the rep about
  * Timestamp - A timestamp of the customer's appointment time
  * Daystring - A string representing the day of the appointment. Used to look up availability of that day
  * Sessionid - The OpenTok sessionId that both the customer and rep would be connecting to at the time of the appointment
  * Timestring - The appointment time in a human readable format
* All the end points are created in `index.php`

### Customer
* Customer starts by going to the root url and `index.php` will render `templates/customer.php`
* `customer.php` is a simple html of the customer page. 
  * The page shows a list of appointment times for that day.
  * There is a hidden modal that pops up when customer clicks on an appointment and it prompts for customer's information
* All styling is located in `assets/css/customer.css`
* `assets/js/customer.js` contains the javascript that manages the customer's interaction with the page
  * The arrows on the page, which has class `dateNavigate`, help customers navigate through the different dates. Whenever customer clicks on `.dateNavigate`, the javascript first computes the offset (`dayDiff`) from current time and then calls the function `setDayAndAvail`
  * `setDayAndAvail` computes the daystring, and sends a request to the server at the `/availability/:daystring` endpoint in `index.php` to get a list of unavailable appointments.
    * `index.php` then queries the table for all appointments' timestamp in the table with the same daystring and returns the array as json.
    * When the response from server is received, all unavailable dates are blacked out by removing the 'selectableTime' class
  * When user clicks on an available time (they have a `time` class), the modal is shown for user to input his information. The modal contains a form that is submitted to the server at the `/schedule` endpoint.
    * When `index.php` gets the post request, it generates an OpenTok session id and stores that along with the customer's information in the table and sends the customer an email to confirm his appointment. It then sends the customer to `templates/schedule.php`, which is a simple appointment confirmed page
* At the time of the appointment, the customer would click the link in his email and get taken to `/chat/:session_id` endpoint defined in `index.php`
  * When the customer enters the chatroom, `index.php` will retrieve the OpenTok sessionId from the url, generate a valid token for that sessionId, and render `templates/chat.php`
  * `chat.php` shows the chatroom. It connects to the OpenTok session, publishes video to that session, and subscribes to videos in that session

### Rep
* Rep starts by going to `/rep`, which is an endpoint defined in `index.php` and renders `templates/rep.php`
* `rep.php` is a simple html of the rep page. 
  * The page has a sidebar that shows a list of appointment times for that day and an area to display information about that appointment and allows the rep to video chat with the customer.
* All styling is located in `assets/css/rep.css`
* `assets/js/rep.js` contains the javascript that manages the customer's interaction with the page
  * Like the customer page, the arrows on the sidebar has class `dateNavigate` and help reps navigate through the different dates. Whenever rep clicks on `.dateNavigate`, the javascript computes the offset (`dayDiff`) from current time and then calls the function `setDayAndAvail`
  * `setDayAndAvail` computes the daystring, and sends a request to the server at the `/availability/:daystring` endpoint in `index.php` to get a list of unavailable appointments.
    * `index.php` then queries the table for all appointments' timestamp with the same daystring and returns the array as json.
    * When the response from server is received, all booked dates gets added a class `bookedTime` that highlights it so rep knows that there is an appointment at that time.
  * When rep clicks on a time, a request is sent to `index.php` at the `/getinfo/:timestamp` endpoint
    * `index.php` then queries the table and retrieves the customer information for that time and returns a json response of the customer's information
    * When the response is received, the customer's information is displayed on the page. If the current time is within an hour of the appointment time, a `start chat` button would appear.
* At the time of the appointment, the rep would click the appointment time and click the start chat button. The main view would get replaced with an iframe of the same chatroom that the customer would see
* If the rep clicks on the cancel appointment button, a request would be sent to `index.php` at the `/cancel/:timestamp` endpoint.
  * `index.php` will look up that timestamp, retrieve the customer information, delete that row in the table, and send an email to the customer telling him that his appointment has been canceled.


## Appendix

### Deploying to Heroku

Heroku is a PaaS (Platform as a Service) that makes deploying applications simple and for smaller
applications free. For that reason, you may choose to experiment with this code  and deploy it using
Heroku.

*  The provided `Procfile` already decribes a web process which can launch this application.
*  You should avoid commiting configuration and secrets to your code, and instead use Heroku's
   config functionality.
*  In order to configure the OpenTok details you need to set the following keys:
   -  `OPENTOK_KEY` - Your OpenTok API Key
   -  `OPENTOK_SECRET` - Your OpenTok API Secret
*  In order to use the memcached storage, you must have the following keys set as long as you choose
   Memcachier as your provider (or replace them inside `config/memcached.php` if you choose
   another). The easiest way to set them is to simply run `heroku addons:add memcachier:dev`.
   -  `MEMCACHIER_SERVERS` - A comma-separated list of servers, each of which follow the `host:port`
      format
   -  `MEMCACHIER_USERNAME` - The SASL username for authentication
   -  `MEMCACHIER_PASSWORD` - The SASL password for authentication
*  The Slim application will only start reading its Heroku's config when its mode is set to
   `'production'`. This can be done using Heroku config by setting the following key:
   -  `SLIM_MODE` - Set this to `production` when the environment variables should be used to
      configure the application.
