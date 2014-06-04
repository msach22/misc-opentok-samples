(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
angular.module('app.home')
  .controller('HomeCtrl', function($scope) {
    $scope.version = '0';
  });

},{}],2:[function(require,module,exports){
angular.module('app.home')
  .controller('OpenTokCtrl', ['$scope', 'OTSession', '$http', function($scope, OTSession, $http) {
    $http.get('/classroom').success(function(data) {
      OTSession.init(data.apiKey, data.sessionId, data.token, function(err, session) {
        if (err) throw err;

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

    }).error(function(data, status) {
      console.log("An error occurred while retrieving the classroom data.", data, status);
    });
  }]);

},{}],3:[function(require,module,exports){
module.exports = angular.module('app.home', ['opentok']);

require('./HomeCtrl');
require('./OpenTokCtrl');

},{"./HomeCtrl":1,"./OpenTokCtrl":2}],4:[function(require,module,exports){

angular.module('app', [
  require('./home').name
]);


},{"./home":3}]},{},[4])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYW5rdXIvRGV2ZWxvcGVyL3dlYnJ0Y2V4cG8xNC1hdWRpb2RldGVjdGlvbi9ub2RlX21vZHVsZXMvcGhvLWRldnN0YWNrL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYW5rdXIvRGV2ZWxvcGVyL3dlYnJ0Y2V4cG8xNC1hdWRpb2RldGVjdGlvbi9zcmMvc2NyaXB0cy9ob21lL0hvbWVDdHJsLmpzIiwiL1VzZXJzL2Fua3VyL0RldmVsb3Blci93ZWJydGNleHBvMTQtYXVkaW9kZXRlY3Rpb24vc3JjL3NjcmlwdHMvaG9tZS9PcGVuVG9rQ3RybC5qcyIsIi9Vc2Vycy9hbmt1ci9EZXZlbG9wZXIvd2VicnRjZXhwbzE0LWF1ZGlvZGV0ZWN0aW9uL3NyYy9zY3JpcHRzL2hvbWUvaW5kZXguanMiLCIvVXNlcnMvYW5rdXIvRGV2ZWxvcGVyL3dlYnJ0Y2V4cG8xNC1hdWRpb2RldGVjdGlvbi9zcmMvc2NyaXB0cy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5ob21lJylcbiAgLmNvbnRyb2xsZXIoJ0hvbWVDdHJsJywgZnVuY3Rpb24oJHNjb3BlKSB7XG4gICAgJHNjb3BlLnZlcnNpb24gPSAnMCc7XG4gIH0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5ob21lJylcbiAgLmNvbnRyb2xsZXIoJ09wZW5Ub2tDdHJsJywgWyckc2NvcGUnLCAnT1RTZXNzaW9uJywgJyRodHRwJywgZnVuY3Rpb24oJHNjb3BlLCBPVFNlc3Npb24sICRodHRwKSB7XG4gICAgJGh0dHAuZ2V0KCcvY2xhc3Nyb29tJykuc3VjY2VzcyhmdW5jdGlvbihkYXRhKSB7XG4gICAgICBPVFNlc3Npb24uaW5pdChkYXRhLmFwaUtleSwgZGF0YS5zZXNzaW9uSWQsIGRhdGEudG9rZW4sIGZ1bmN0aW9uKGVyciwgc2Vzc2lvbikge1xuICAgICAgICBpZiAoZXJyKSB0aHJvdyBlcnI7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJUSElTIElTIEZST00gTVkgQVBQXCIpO1xuICAgICAgICBjb25zb2xlLmxvZyhzZXNzaW9uKTtcblxuICAgICAgICBzZXNzaW9uLm9uKHtcbiAgICAgICAgICBzdGFydGVkVG9UYWxrOiBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJTVEFSVEVEIFRPIFRBTEtcIik7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhldmVudCk7XG4gICAgICAgICAgICBldmVudC5zdWJzY3JpYmVycy5mb3JFYWNoKGZ1bmN0aW9uKHN1YnNjcmliZXIpIHtcbiAgICAgICAgICAgICAgc3Vic2NyaWJlci5lbGVtZW50LmNsYXNzTGlzdC5hZGQoJ09UX2JpZycpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkc2NvcGUuJGVtaXQoXCJvdExheW91dFwiKTtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgc3RvcHBlZFRvVGFsazogZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiU1RPUFBFRCBUTyBUQUxLXCIpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXZlbnQpO1xuICAgICAgICAgICAgZXZlbnQuc3Vic2NyaWJlcnMuZm9yRWFjaChmdW5jdGlvbihzdWJzY3JpYmVyKSB7XG4gICAgICAgICAgICAgIHN1YnNjcmliZXIuZWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKCdPVF9iaWcnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHNjb3BlLiRlbWl0KFwib3RMYXlvdXRcIik7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgfSk7XG5cbiAgICAgICRzY29wZS5zdHJlYW1zID0gT1RTZXNzaW9uLnN0cmVhbXM7XG5cbiAgICB9KS5lcnJvcihmdW5jdGlvbihkYXRhLCBzdGF0dXMpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiQW4gZXJyb3Igb2NjdXJyZWQgd2hpbGUgcmV0cmlldmluZyB0aGUgY2xhc3Nyb29tIGRhdGEuXCIsIGRhdGEsIHN0YXR1cyk7XG4gICAgfSk7XG4gIH1dKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gYW5ndWxhci5tb2R1bGUoJ2FwcC5ob21lJywgWydvcGVudG9rJ10pO1xuXG5yZXF1aXJlKCcuL0hvbWVDdHJsJyk7XG5yZXF1aXJlKCcuL09wZW5Ub2tDdHJsJyk7XG4iLCJcbmFuZ3VsYXIubW9kdWxlKCdhcHAnLCBbXG4gIHJlcXVpcmUoJy4vaG9tZScpLm5hbWVcbl0pO1xuXG4iXX0=
