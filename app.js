
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
  , request = require('request')
  , mandrill = require('mandrill-api/mandrill')
  , mandrill_client = new mandrill.Mandrill(process.env.MANDRILL_KEY)
  , async = require('async');

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

var nickserv_password = process.env.NICKSERV_PASSWORD || '';

var owner_exists;
var timer = ['robbiet480'];

var thechannel = process.env.CHANNEL || '#opentok';

var botname = process.env.BOTNAME || 'tokbox_bot';

var server = process.env.IRC_SERVER || 'chat.freenode.org';

var client = new irc.Client(server, botname, {
    channels: [thechannel],
    username: botname,
    realName: botname+', created by robbiet480'
});

// TODO: Should add auto op/powers to anyone joining from a *tokbox.com domain
var owners = ['robbiet480','songz','Song','aoberoi','digitaltsai','digitaltsai1','digitaltsai2'];

var ping_time = process.env.PING_TIME || 300000;

var timeout = process.env.TIMEOUT || 900000;

var topic_prepend = process.env.TOPIC_PREPEND || "OpenTok || tokbox.com || ";

var support_email = process.env.SUPPORT_EMAIL || "irc@tokbox.com";

var opable = ['robbiet480'].concat(owners);

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
      var date = new Date();
      var message = {
        "html": "<p>"+from+" is looking for help from someone in "+thechannel+".</p><p>Their email is "+text+". They requested help at "+date.toString()+"</p>",
        "subject": "Help request from "+from,
        "from_email": "tokbox-bot@tokbox.com",
        "from_name": "Tokbox Bot",
        "to": [{
          "email":support_email,
          "name": "IRC Support email",
          "type": "to"
        }]
      };
      mandrill_client.messages.send({"message":message, "async": false}, function(result){
        // console.log(result);
        console.log('Email sent');
        client.say(from, 'Thanks '+from+', someone will be sure to get back to you shortly! You may want to check out our forums at tokbox.com/forums for more information while you wait. Thanks for using OpenTok powered by TokBox');
      }, function(e){
        console.error(e);
        console.log('Email error');
        client.say(from, 'We\'re so sorry '+from+', but we had an issue notifiying a team member. Please send an email to support@tokbox.com. Thank you.');
      });
      
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
    case '!opme':
      if(opable.indexOf(from) != -1) {
        console.log('opping',from);
        client.send('MODE', thechannel, '+o', from);
      } else {
        console.log(from+' tried to gain op but was denied');
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

function checkOwner(nick,callback) {
  if(owners.indexOf(nick) != -1) {
    if(botop == true) {
      console.log('Giving +o to '+nick+' on '+thechannel);
      client.send('MODE', thechannel, '+o', nick);
    }
    return callback(true)
  } else {
    return callback(false);
  }
}

client.addListener('names'+thechannel, function(nicks){
  client.say('NICKSERV','IDENTIFY '+nickserv_password);
  client.say('CHANSERV','OP '+thechannel);
  async.filter(Object.keys(nicks), checkOwner,function(results){
    owners_here = results;
    if(results.length > 0) {
      var word = "are";
      if(results.length == 1) {
        var word = "is";
      }
      client.send('TOPIC', thechannel, topic_prepend+results.join(', ')+' '+word+' here to help you!');
    } else {
      client.send('TOPIC', thechannel, topic_prepend+'No one is currently available to help you. Please say !helpme to send a message to a staff member');
    }
  });
});

client.addListener('join'+thechannel, function(nick){
  if(nick === botname) {
    client.say('NICKSERV','IDENTIFY '+nickserv_password);
    client.say('CHANSERV','OP '+thechannel);
    client.say(thechannel, "Hey, look at me, new, improved and ready for work!");
  }
  if(owners.indexOf(nick) != -1) {
    owners_here.push(nick);
    client.say(thechannel,'Hello '+nick+', welcome back to '+thechannel+'! Those of you with questions can direct them to '+nick+' who would be more than happy to help you!');
    console.log('Setting topic because an owner joined');
    var word = "are";
    if(owners_here.length == 1) {
      var word = "is";
    }
    client.send('TOPIC', thechannel, topic_prepend+owners_here.join(', ')+' '+word+' here to help you!');
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
  if(owners_here.indexOf(nick) != -1) {
    owners_here.splice(nick,1);
    if(owners_here.length > 0) {
      console.log('Setting topic because an owner is here but one left');
      var word = "are";
      if(owners_here.length == 1) {
        var word = "is";
      }
      client.send('TOPIC', thechannel, topic_prepend+owners_here.join(', ')+' '+word+' here to help you!');
    } else {
      console.log('Setting topic because no owner is available');
      client.send('TOPIC', thechannel, topic_prepend+'No one is currently available to help you. Please say !helpme to send a message to a staff member');
    }
    console.log(nick+' (an owner) left');
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
