(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
angular.module('app.home')
  .controller('HomeCtrl', function($scope) {
    $scope.version = '0';
  });

},{}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
module.exports = angular.module('app.home', ['opentok']);

require('./HomeCtrl');
require('./OpenTokCtrl');

},{"./HomeCtrl":1,"./OpenTokCtrl":2}],4:[function(require,module,exports){

angular.module('app', [
  require('./home').name
]);


},{"./home":3}]},{},[4])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYW5rdXIvRGV2ZWxvcGVyL3dlYnJ0Y2V4cG8xNC1hdWRpb2RldGVjdGlvbi9ub2RlX21vZHVsZXMvcGhvLWRldnN0YWNrL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYW5rdXIvRGV2ZWxvcGVyL3dlYnJ0Y2V4cG8xNC1hdWRpb2RldGVjdGlvbi9zcmMvc2NyaXB0cy9ob21lL0hvbWVDdHJsLmpzIiwiL1VzZXJzL2Fua3VyL0RldmVsb3Blci93ZWJydGNleHBvMTQtYXVkaW9kZXRlY3Rpb24vc3JjL3NjcmlwdHMvaG9tZS9PcGVuVG9rQ3RybC5qcyIsIi9Vc2Vycy9hbmt1ci9EZXZlbG9wZXIvd2VicnRjZXhwbzE0LWF1ZGlvZGV0ZWN0aW9uL3NyYy9zY3JpcHRzL2hvbWUvaW5kZXguanMiLCIvVXNlcnMvYW5rdXIvRGV2ZWxvcGVyL3dlYnJ0Y2V4cG8xNC1hdWRpb2RldGVjdGlvbi9zcmMvc2NyaXB0cy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5ob21lJylcbiAgLmNvbnRyb2xsZXIoJ0hvbWVDdHJsJywgZnVuY3Rpb24oJHNjb3BlKSB7XG4gICAgJHNjb3BlLnZlcnNpb24gPSAnMCc7XG4gIH0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5ob21lJylcbiAgLmNvbnRyb2xsZXIoJ09wZW5Ub2tDdHJsJywgWyckc2NvcGUnLCAnT1RTZXNzaW9uJywgJ2FwaUtleScsICdzZXNzaW9uSWQnLCAndG9rZW4nLCBmdW5jdGlvbigkc2NvcGUsIE9UU2Vzc2lvbiwgYXBpS2V5LCBzZXNzaW9uSWQsIHRva2VuKSB7XG4gICAgT1RTZXNzaW9uLmluaXQoYXBpS2V5LCBzZXNzaW9uSWQsIHRva2VuLCBmdW5jdGlvbihlcnIsIHNlc3Npb24pIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiVEhJUyBJUyBGUk9NIE1ZIEFQUFwiKTtcbiAgICAgIGNvbnNvbGUubG9nKHNlc3Npb24pO1xuICAgICAgc2Vzc2lvbi5vbih7XG4gICAgICAgIHN0YXJ0ZWRUb1RhbGs6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJTVEFSVEVEIFRPIFRBTEtcIik7XG4gICAgICAgICAgY29uc29sZS5sb2coZXZlbnQpO1xuICAgICAgICAgIGV2ZW50LnN1YnNjcmliZXJzLmZvckVhY2goZnVuY3Rpb24oc3Vic2NyaWJlcikge1xuICAgICAgICAgICAgc3Vic2NyaWJlci5lbGVtZW50LmNsYXNzTGlzdC5hZGQoJ09UX2JpZycpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgICRzY29wZS4kZW1pdChcIm90TGF5b3V0XCIpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHN0b3BwZWRUb1RhbGs6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJTVE9QUEVEIFRPIFRBTEtcIik7XG4gICAgICAgICAgY29uc29sZS5sb2coZXZlbnQpO1xuICAgICAgICAgIGV2ZW50LnN1YnNjcmliZXJzLmZvckVhY2goZnVuY3Rpb24oc3Vic2NyaWJlcikge1xuICAgICAgICAgICAgc3Vic2NyaWJlci5lbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoJ09UX2JpZycpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgICRzY29wZS4kZW1pdChcIm90TGF5b3V0XCIpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICAkc2NvcGUuc3RyZWFtcyA9IE9UU2Vzc2lvbi5zdHJlYW1zO1xuICB9XSkudmFsdWUoe1xuICAgIGFwaUtleTogJzg1NDUxMScsXG4gICAgc2Vzc2lvbklkOiAnMl9NWDQ0TlRRMU1URi1mbGRsWkNCS2RXNGdNRFFnTURZNk1qVTZNRGtnVUVSVUlESXdNVFItTUM0Mk9USTVPVGt3Tm41LScsXG4gICAgdG9rZW46ICdUMT09Y0dGeWRHNWxjbDlwWkQwNE5UUTFNVEVtYzJSclgzWmxjbk5wYjI0OWRHSnlkV0o1TFhSaWNtSXRkakF1T1RFdU1qQXhNUzB3TWkweE55WnphV2M5T0dWaU9HTm1NREJtTWpSbVpURmxNalkxTkdKbFpESTVOak5sTXpJeFlqSXpaVE5qTVRGaVpqcHliMnhsUFhCMVlteHBjMmhsY2laelpYTnphVzl1WDJsa1BUSmZUVmcwTkU1VVVURk5WRVl0Wm14a2JGcERRa3RrVnpSblRVUlJaMDFFV1RaTmFsVTJUVVJyWjFWRlVsVkpSRWwzVFZSU0xVMUROREpQVkVrMVQxUnJkMDV1TlMwbVkzSmxZWFJsWDNScGJXVTlNVFF3TVRnNE9ETXlPU1p1YjI1alpUMHdMakEyTURnNE1qUTBNalUwT0RjMU9EYzBKbVY0Y0dseVpWOTBhVzFsUFRFME1EUTBPREF6TWprbVkyOXVibVZqZEdsdmJsOWtZWFJoUFE9PSdcbiAgfSk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGFuZ3VsYXIubW9kdWxlKCdhcHAuaG9tZScsIFsnb3BlbnRvayddKTtcblxucmVxdWlyZSgnLi9Ib21lQ3RybCcpO1xucmVxdWlyZSgnLi9PcGVuVG9rQ3RybCcpO1xuIiwiXG5hbmd1bGFyLm1vZHVsZSgnYXBwJywgW1xuICByZXF1aXJlKCcuL2hvbWUnKS5uYW1lXG5dKTtcblxuIl19
