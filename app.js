var express = require('express'),
    OpenTok = require('opentok'),
    config = require('./config'),
    apiKey = process.env.OPENTOK_KEY || (config.opentok && config.opentok.key),
    apiSecret = process.env.OPENTOK_SECRET || (config.opentok && config.opentok.secret),
    port = process.env.PORT || (config.http && config.http.port) || 3000,
    opentok = new OpenTok(apiKey, apiSecret),
    app = express();


app.use(express.static(__dirname + '/dist'));

opentok.createSession(function(err, session) {
  if (err) throw err;

  app.set('sessionId', session.sessionId);
  init();
});

app.get('/classroom', function(req, res) {
  var sessionId = app.get('sessionId'),
      token = opentok.generateToken(sessionId);

  res.json({
    apiKey: apiKey,
    sessionId: sessionId,
    token: token
  });
});


function init() {
  app.listen(port, function() {
    console.log('You\'re app is now listening on port: '+port);
  });
}
