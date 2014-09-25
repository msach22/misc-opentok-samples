# Scheduling Starter Kit

An OpenTok 1-to-1 solution focussed on call scheduling


## Installation

1. Clone the repository.
1. Copy the `config/development/opentok.php.sample` file to `config/development/opentok.php` and
   replace the key and secret with your own values from the [TokBox
   Dashboard](https://dashboard.tokbox.com)
1. Use [Composer](https://getcomposer.org/) to install dependencies: `composer install`
1. Use a webserver (such as Apache, nginx, etc) to the `web` directory as the document root. In the
   case of Apache, the provided `.htaccess` file will help properly handle URL rewriting. See the
   [Slim Route URL Rewriting Guide](http://docs.slimframework.com/#Route-URL-Rewriting) for more
   detail.

## Usage

1. Visit the URL mapped to the application by your webserver.
1. Select an appointment time and fill in your information. You should then get an email confirming your slot.
1. At the time of your appointment, join the chatroom
1. Have another user (possibly in another window or tab) visit `/rep` url to be the rep.
1. Rep selects your appointment and chats with you

## Requirements

*  **TODO**

## Code and Conceptual Walkthrough

*  **TODO**

## TODOs

*  Testing?
*  Separate boilerplate from actual substance (routing) in `web/index.php`
*  Only need to persist one global sessionId, do we really need a database?

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
