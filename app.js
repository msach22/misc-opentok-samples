
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path')
  , irc = require('irc')
  , _ = require('underscore')
  , check = require('validator').check
  , sanitize = require('validator').sanitize
  , request = require('request');

var app = express();

// all environments
app.set('port', process.env.PORT || 4000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

var keepalive_url = process.env.KEEPALIVE_URL || 'http://localhost:'+app.get('port')+'/ping';

var owner_exists;
var timer = [];

var thechannel = process.env.CHANNEL || '#opentok';

var botname = process.env.BOTNAME || 'tokbox_bot';

var client = new irc.Client('chat.freenode.org', botname, {
    channels: [thechannel],
    username: botname,
    realName: botname+', created by robbiet480'
});

var owners = ['robbiet480','songz','Song','aoberoi','digitaltsai'];

var ping_time = process.env.PING_TIME || 300000;

var timeout = process.env.TIMEOUT || 900000;

var owners_here = [];

var requested = [];

var botop = false;

app.get('/', function(req,res){
  res.end('go away');
});

app.get('/ping', function(req,res){
  res.end();
  console.log('Heroku keepalive received!');
});


request.get(keepalive_url, function(err,resp,body){
  if(!err && resp.statusCode == 200) {
    console.log('Sent Heroku keepalive');
  }
});
//heroku keepalive
setInterval(function(){
  console.log('Sending keepalive ping');
  request.get(keepalive_url, function(err,resp,body){
    if(!err && resp.statusCode == 200) {
      console.log('Sent keepalive ping');
    }
  });
},ping_time)

client.addListener('pm', function (from, text, message) {
    if(text.indexOf('@') !== -1) {
      try {
          check(text).isEmail();
      } catch (e) {
          console.log(e.message); //Invalid integer
          client.say(from, 'Sorry '+from+' but that doesn\'t look like a valid email address. Please try again');
      }
      console.log('valid email');
      console.log(from+' requested help! Their email is '+text);
      requested.push(from);
      // TODO: PUT NOTIFICATION CODE HERE
      client.say(from, 'Thanks '+from+' someone will be sure to get back to you shortly! You may want to check out our forums at tokbox.com/forums for more information while you wait. Thanks for using OpenTok powered by TokBox');
    } else {
      client.say(from, 'Sorry '+from+' but I didn\'t understand that. Please try again.');
    }
});

client.addListener('message'+thechannel, function (from, text, message) {
  switch(text) {
    case '!helpme':
    case '!help':
      if(owners_here.length != 0) {
        console.log(from+' requested help but an owner is here already!');
        client.say(thechannel,'Sorry '+from+' but '+owners_here.join(', ')+' is already here to help you!');
      } else {
        console.log(from+' requested more help! PMing');
        client.say(from,'Hello '+from+' please give me your email address. A TokBox employee will contact you as soon as possible, by IRC if you are still available here, or by email if not.');
        requested.push(from);
      }
      break;
    default:
      if((owners_here.length < 1) && (timer.indexOf(from) == -1)) {
        console.log(from+' is not on the timeout list, sending a message');
        client.say(thechannel, 'Hi '+from+', we\'re sorry, but there is no one around to help you right now. Please post on our forums at tokbox.com/forums or email support@tokbox.com with questions. You can also say !helpme to ping a Tokbox employee now. However, they may not respond quickly due to the time (PST, GMT-8)');
        timer.push(from);
        console.log(from+' added to the timeout list');
        setTimeout(function(){
          var item = timer.indexOf(from);
          if(item > -1) {
            timer.splice(item,1);
            console.log('Removed '+from+' from the timeout list');
          }
        },timeout);
      } else if((owners_here.length >= 1) && (owners_here.indexOf(from) == -1)) {
        console.log(owners_here.join(',')+', owner(s), is already here so I am not sending a message to '+from);
      } else {
        console.log(from+' didnt match any vars, NOT sending a message');
      }
      break;
  }
});

client.addListener('names'+thechannel, function(nicks){
  _.each(nicks, function(k,v){
    if(owners.indexOf(v) != -1) {
      owners_here.push(v);
      if(botop == true) {
        client.send('MODE', thechannel, '+o', v);
      }
    }
  });
});

client.addListener('join'+thechannel, function(nick){
  if(owners.indexOf(nick) != -1) {
    owners_here.push(nick);
    client.say('Hello '+nick+'! Welcome back to '+thechannel+'. Those of you with questions can direct them to '+nick+' who would be more then happy to help you!');
    if(requested.length > 0) {
      client.say(nick,'While you were gone, '+requested.join(' and ')+' asked for help');
    }
    console.log('Giving +o to '+nick+' on '+thechannel);
    client.send('MODE', thechannel, '+o', nick);
    requested = [];
    timer = [];
  }
});

client.addListener('part'+thechannel, function(nick){
  if(owners.indexOf(nick) != -1) {
    var owner = timer.indexOf(nick);
    if(owner > -1) {
      owners_here.splice(nick,1);
      console.log(nick+' (an owner) left');
    }
  }
});

client.addListener('+mode', function(channel,by,mode,argument,message){
  if((mode == "o") && (argument == botname)) {
    botop = true;
  }
});

client.addListener('error',function(err){
  console.error(err);
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
