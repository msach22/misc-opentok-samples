angular.module('app.home')
  .controller('OpenTokCtrl', ['$scope', 'OTSession', 'apiKey', 'sessionId', 'token', function($scope, OTSession, apiKey, sessionId, token) {
    OTSession.init(apiKey, sessionId, token, function(err, session) {
      console.log("THIS IS FROM MY APP");
      console.log(session);
      session.on({
        startedToTalk: function(event) {
          console.log("STARTED TO TALK");
          console.log(event);
          event.subscribers.forEach(function(subscriber) {
            subscriber.element.classList.add('OT_big');
          });
          $scope.$emit("otLayout");
        },

        stoppedToTalk: function(event) {
          console.log("STOPPED TO TALK");
          console.log(event);
          event.subscribers.forEach(function(subscriber) {
            subscriber.element.classList.remove('OT_big');
          });
          $scope.$emit("otLayout");
        }
      });
    });
    $scope.streams = OTSession.streams;
  }]).value({
    apiKey: '854511',
    sessionId: '2_MX44NTQ1MTF-fldlZCBKdW4gMDQgMDY6MjU6MDkgUERUIDIwMTR-MC42OTI5OTkwNn5-',
    token: 'T1==cGFydG5lcl9pZD04NTQ1MTEmc2RrX3ZlcnNpb249dGJydWJ5LXRicmItdjAuOTEuMjAxMS0wMi0xNyZzaWc9OGViOGNmMDBmMjRmZTFlMjY1NGJlZDI5NjNlMzIxYjIzZTNjMTFiZjpyb2xlPXB1Ymxpc2hlciZzZXNzaW9uX2lkPTJfTVg0NE5UUTFNVEYtZmxkbFpDQktkVzRnTURRZ01EWTZNalU2TURrZ1VFUlVJREl3TVRSLU1DNDJPVEk1T1Rrd05uNS0mY3JlYXRlX3RpbWU9MTQwMTg4ODMyOSZub25jZT0wLjA2MDg4MjQ0MjU0ODc1ODc0JmV4cGlyZV90aW1lPTE0MDQ0ODAzMjkmY29ubmVjdGlvbl9kYXRhPQ=='
  });
