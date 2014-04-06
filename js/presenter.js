/*
 * Presenter Application
 *
 * This is a test app to run agasint the TokCast for Chrome prototype. The use case is simple: the
 * user would like to present their desktop to all the participants in the OpenTok Session.
 */

var session = OT.initSession(apiKey, sessionId),
    publisher = OT.initScreenPublisher(screenPublished);

function screenPublished(err) {
  if (err) throw err;
  console.log('screen published returned');
}

session.on({
  'sessionConnected': function(event) {
    //if (publisher.accessAllowed) {
    //  session.publish(publisher);
    //}
  },
  'streamCreated': function(event) {
    if (event.stream.connection.connectionId === session.connection.connectionId) {
      console.log('oops, it looks like a stream from your connection made it to '+
        'a handler that isn\'t meant to recieve it');
    }
  }
});

//publisher.on('accessAllowed', function(event) {
//  console.log('screen publisher access allowed');
//});
//
//publisher.on('accessDenied', function(event) {
//  console.log('uh-oh, looks like you denied access to the screen');
//});

session.connect(token);

