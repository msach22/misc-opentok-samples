# OpenTok Schedule Kit

An OpenTok Starter Kit focussed on call scheduling

## Installation

1. Clone the repository.

2. Rename `config.ini.sample` to `config.ini` and configure your credentials.

3. Set the following variables in the `config.ini` file:

   * `OPENTOK_KEY` and `OPENTOK_SECRET` -- Set these to your OpenTok API key and
     API secret values from the [TokBox Dashboard](https://dashboard.tokbox.com).

   * `MYSQL_URL` -- This is the URL for access to your MySQL server. The format is
     `mysql://username:password@mysqlurl:port/database_name`

   * `GMAIL_USER` and `GMAIL_PW` -- These are your Gmail user name and password. Include
     '@gmail.com' in the `GMAIL_USER` string (as in 'user@gmail.com'). The app uses these
     credentials to send emails to customers notifying them about appointments. If you get
     errors sending emails then you need to make sure you have [Access for less secure apps](https://www.google.com/settings/security/lesssecureapps) turned on.

4. Use Composer to install dependencies:

        ./composer.phar install

5. Set the document root for your web server (such as Apache, nginx, etc.) to the `web` directory
   of this project. In the case of Apache, the provided `.htaccess` file handles URL rewriting.
   See the [Slim Route URL Rewriting Guide](http://docs.slimframework.com/#Route-URL-Rewriting)
   for more details.

6. Make sure the following line is included in your php.ini file, and that it is not commented:

        extension=php_openssl.dll

### Testing

On OSX devices, navigate to `web` folder and start the server in your terminal: `php -S localhost:8000`


## Usage

### Customer

1. Visit the URL mapped to the application by your web server.

2. Select an appointment time and fill in your information. You should then receive an email
   confirming your appointment.

3. At the time of your appointment, join the chat room.

### Representative

1. Have another user (possibly in another window or tab) visit the `/rep` URL to be the
   representative.

2. The representative can click through and view different appointments.

3. The representative can start or cancel an appointment.

## Requirements

* PHP
* MySQL

## Code and Conceptual Walkthrough

### Server

* All server code is located in `index.php`.

* `index.php` starts off by creating and connecting to the database and table required for the app.

* The schedule table includes the following fields:

  * Name -- the customer's name
  * Email -- the customer's email address, used to send appointment confirmation and cancellations
  * Comment -- The customer's comment entered when scheduling the appointment
  * Timestamp -- The timestamp of the appointment time
  * Daystring -- A string representing the day of the appointment, used to look up the availability
    on that day
  * Sessionid - The OpenTok session ID that both the customer and the representative connect to at
    the time of the appointment
  * Timestring -- The appointment time in a human-readable format

* All end points are created in `index.php`.

### Customer

* The customer starts by going to the root URL, and `index.php` renders `templates/customer.php`.

* The `customer.php` file contains HTML for the customer page.

  * The page shows a list of appointment times for that day.

  * When the customer clicks an appointment time, a form prompts the customer for information.

* All styling is located in the `assets/css/customer.css` file.

* The `assets/js/customer.js` file contains the JavaScript that manages the customer's interaction
  with the page.

  * The arrows on the page, which use the class `dateNavigate`, let customers navigate through the
    different dates. When the customer clicks on an element that has the `.dateNavigate` class,
    the JavaScript computes the offset (`dayDiff`) from current time and then calls the
    `setDayAndAvail()` function.

  * The `setDayAndAvail()` function computes the `daystring` value and sends a request to the server
    at the `/availability/:daystring` endpoint in `index.php`, to get a list of unavailable
    appointments.

    * `index.php` then queries the table for all appointment timestamps in the table that have the
      same `daystring` value, and it returns this array as JSON.

    * When the response from server is received, all unavailable dates are dimmed by removing
      the 'selectableTime' class.

  * When the user clicks on an available time (which have the `time` class), a form is shown for
    the user to input information. The form data is submitted to the server at the `/schedule`
    endpoint.

    * When `index.php` gets the POST request, it generates an OpenTok ID, stores it along with the
      customer's information in the table, and sends the customer an email to confirm the
      appointment. It then sends the customer to `templates/schedule.php`, which is a simple
      appointment confirmation page.

* At the time of the appointment, the customer clicks the link in the email to navigate to the
  `/chat/:session_id` endpoint defined in `index.php`.

  * When the customer enters the chat room, `index.php` retrieves the OpenTok session ID from the
    URL, generates a valid token for that session ID, and renders `templates/chat.php`.

  * `chat.php` shows the chat room. It connects to the OpenTok session, publishes video to the
    session, and subscribes to videos in the session.

### Representative

* The representative starts by going to `/rep`, an endpoint defined in `index.php`, which
  renders `templates/rep.php`.

* The `rep.php` file contains HTML for the representative page.

  The page includes a sidebar, which shows a list of appointment times for that day. The page also
  includes an area that displays information about the selected appointment and lets the
  representative start a video chat with the customer.

* All styling is located in the `assets/css/rep.css` file.

* `assets/js/rep.js` contains JavaScript code that manages the representative's interaction with the
  page.

  * Like the customer page, the arrows on the sidebar, which use the class `dateNavigate`, let
    the representative navigate through the different dates. When the representative clicks
    an element that has the `.dateNavigate` class, the JavaScript computes the offset (`dayDiff`)
    from the current time and calls the `setDayAndAvail()` function.

  * The `setDayAndAvail()` function computes the `daystring` and sends a request to the server at
    the `/availability/:daystring` endpoint in `index.php` to get a list of unavailable
    appointments.

    * `index.php` then queries the table for all appointment timestamps with the matching
       `daystring` value, and it returns this array as JSON.

    * When the response from server is received, the class `bookedTime` is added to all booked
      dates, which causes them to be highlighted on the page (indicating that they are booked).

  * When the representative clicks a time, a request is sent to `index.php` at the
    `/getinfo/:timestamp` endpoint.

    * `index.php` then queries the table and retrieves the customer information for that time, and
      it returns a JSON response with the customer's information.

    * When the response is received, the customer's information is displayed on the page. If the
      current time is within an hour of the appointment time, a Start Appointment button is
      displayed.

* At the time of the appointment, the representative clicks the appointment time and the Start
  Appointment button. The main view is replaced with an iframe of the same chat room that the
  customer sees.

* If the representative clicks the Cancel Appointment button, a request is sent to `index.php` at
  the `/cancel/:timestamp` endpoint.  `index.php` looks up that timestamp, retrieves the customer
  information, deletes that row in the table, and sends an email to the customer indicating that the
  appointment has been canceled.

## Appendix -- Deploying to Heroku

Heroku is a PaaS (Platform as a Service) that you can use to deploy simple and small applications
for free. For that reason, you may choose to experiment with this code and deploy it using
Heroku.

The provided `Procfile` describes a web process that launches this application.

This application uses MYSQL. Use `heroku addons:create cleardb:ignite` to
install the ClearDB addon for Heroku to use MYSQL.

This application also uses SendGrid to send emails. Use `heroku addons:create sendgrid:starter`

Use Heroku config to set the following keys:

*  `OPENTOK_KEY` -- Your OpenTok API key

*  `OPENTOK_SECRET` -- Your OpenTok API secret
