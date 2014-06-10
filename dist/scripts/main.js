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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvc29uZ25mb25nL0Nsb3VkU3RvcmFnZS9Ecm9wYm94L1Rva2JveC9Db2RlL2RlbW9zL2V4cG93ZWJydGMvb3RhdWRpb2RldGVjdC1kZW1vL25vZGVfbW9kdWxlcy9waG8tZGV2c3RhY2svbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9zb25nbmZvbmcvQ2xvdWRTdG9yYWdlL0Ryb3Bib3gvVG9rYm94L0NvZGUvZGVtb3MvZXhwb3dlYnJ0Yy9vdGF1ZGlvZGV0ZWN0LWRlbW8vc3JjL3NjcmlwdHMvaG9tZS9Ib21lQ3RybC5qcyIsIi9Vc2Vycy9zb25nbmZvbmcvQ2xvdWRTdG9yYWdlL0Ryb3Bib3gvVG9rYm94L0NvZGUvZGVtb3MvZXhwb3dlYnJ0Yy9vdGF1ZGlvZGV0ZWN0LWRlbW8vc3JjL3NjcmlwdHMvaG9tZS9PcGVuVG9rQ3RybC5qcyIsIi9Vc2Vycy9zb25nbmZvbmcvQ2xvdWRTdG9yYWdlL0Ryb3Bib3gvVG9rYm94L0NvZGUvZGVtb3MvZXhwb3dlYnJ0Yy9vdGF1ZGlvZGV0ZWN0LWRlbW8vc3JjL3NjcmlwdHMvaG9tZS9pbmRleC5qcyIsIi9Vc2Vycy9zb25nbmZvbmcvQ2xvdWRTdG9yYWdlL0Ryb3Bib3gvVG9rYm94L0NvZGUvZGVtb3MvZXhwb3dlYnJ0Yy9vdGF1ZGlvZGV0ZWN0LWRlbW8vc3JjL3NjcmlwdHMvbWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImFuZ3VsYXIubW9kdWxlKCdhcHAuaG9tZScpXG4gIC5jb250cm9sbGVyKCdIb21lQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSkge1xuICAgICRzY29wZS52ZXJzaW9uID0gJzAnO1xuICB9KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdhcHAuaG9tZScpXG4gIC5jb250cm9sbGVyKCdPcGVuVG9rQ3RybCcsIFsnJHNjb3BlJywgJ09UU2Vzc2lvbicsICckaHR0cCcsIGZ1bmN0aW9uKCRzY29wZSwgT1RTZXNzaW9uLCAkaHR0cCkge1xuICAgICRodHRwLmdldCgnL2NsYXNzcm9vbScpLnN1Y2Nlc3MoZnVuY3Rpb24oZGF0YSkge1xuICAgICAgT1RTZXNzaW9uLmluaXQoZGF0YS5hcGlLZXksIGRhdGEuc2Vzc2lvbklkLCBkYXRhLnRva2VuLCBmdW5jdGlvbihlcnIsIHNlc3Npb24pIHtcbiAgICAgICAgaWYgKGVycikgdGhyb3cgZXJyO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiVEhJUyBJUyBGUk9NIE1ZIEFQUFwiKTtcbiAgICAgICAgY29uc29sZS5sb2coc2Vzc2lvbik7XG5cbiAgICAgICAgc2Vzc2lvbi5vbih7XG4gICAgICAgICAgc3RhcnRlZFRvVGFsazogZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiU1RBUlRFRCBUTyBUQUxLXCIpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXZlbnQpO1xuICAgICAgICAgICAgZXZlbnQuc3Vic2NyaWJlcnMuZm9yRWFjaChmdW5jdGlvbihzdWJzY3JpYmVyKSB7XG4gICAgICAgICAgICAgIHN1YnNjcmliZXIuZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdPVF9iaWcnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHNjb3BlLiRlbWl0KFwib3RMYXlvdXRcIik7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIHN0b3BwZWRUb1RhbGs6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlNUT1BQRUQgVE8gVEFMS1wiKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGV2ZW50KTtcbiAgICAgICAgICAgIGV2ZW50LnN1YnNjcmliZXJzLmZvckVhY2goZnVuY3Rpb24oc3Vic2NyaWJlcikge1xuICAgICAgICAgICAgICBzdWJzY3JpYmVyLmVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZSgnT1RfYmlnJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRzY29wZS4kZW1pdChcIm90TGF5b3V0XCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgIH0pO1xuXG4gICAgICAkc2NvcGUuc3RyZWFtcyA9IE9UU2Vzc2lvbi5zdHJlYW1zO1xuXG4gICAgfSkuZXJyb3IoZnVuY3Rpb24oZGF0YSwgc3RhdHVzKSB7XG4gICAgICBjb25zb2xlLmxvZyhcIkFuIGVycm9yIG9jY3VycmVkIHdoaWxlIHJldHJpZXZpbmcgdGhlIGNsYXNzcm9vbSBkYXRhLlwiLCBkYXRhLCBzdGF0dXMpO1xuICAgIH0pO1xuICB9XSk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGFuZ3VsYXIubW9kdWxlKCdhcHAuaG9tZScsIFsnb3BlbnRvayddKTtcblxucmVxdWlyZSgnLi9Ib21lQ3RybCcpO1xucmVxdWlyZSgnLi9PcGVuVG9rQ3RybCcpO1xuIiwiXG5hbmd1bGFyLm1vZHVsZSgnYXBwJywgW1xuICByZXF1aXJlKCcuL2hvbWUnKS5uYW1lXG5dKTtcblxuIl19
