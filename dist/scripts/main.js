(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
angular.module('app.home')
  .controller('OpenTokCtrl', ['$scope', 'OTSession', '$http', '$window', function($scope, OTSession, $http, $window) {
    $http.get('/classroom').success(function(data) {
      OTSession.init(data.apiKey, data.sessionId, data.token, function(err, session) {
        if (err) throw err;

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

    // this is probably the wrong place to do this, maybe put this in a directive
    angular.element($window).bind('resize', function() {
      console.log('RESIZED!');
      // BAD! accessing DOM directly
      //$('.classroom').width($('body').width() - $('#sidebar').width());
      $('.classroom').height($(window).height() - ($('#header').height() + $('#course-info').height() + $('#pageFooter').height()));
      $scope.$emit('otLayout');
    });
  }]);

},{}],2:[function(require,module,exports){
module.exports = angular.module('app.home', ['opentok']);

require('./OpenTokCtrl');

},{"./OpenTokCtrl":1}],3:[function(require,module,exports){

angular.module('app', [
  require('./home').name
]);


},{"./home":2}]},{},[3])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYW5rdXIvRGV2ZWxvcGVyL3dlYnJ0Y2V4cG8xNC1hdWRpb2RldGVjdGlvbi9ub2RlX21vZHVsZXMvcGhvLWRldnN0YWNrL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYW5rdXIvRGV2ZWxvcGVyL3dlYnJ0Y2V4cG8xNC1hdWRpb2RldGVjdGlvbi9zcmMvc2NyaXB0cy9ob21lL09wZW5Ub2tDdHJsLmpzIiwiL1VzZXJzL2Fua3VyL0RldmVsb3Blci93ZWJydGNleHBvMTQtYXVkaW9kZXRlY3Rpb24vc3JjL3NjcmlwdHMvaG9tZS9pbmRleC5qcyIsIi9Vc2Vycy9hbmt1ci9EZXZlbG9wZXIvd2VicnRjZXhwbzE0LWF1ZGlvZGV0ZWN0aW9uL3NyYy9zY3JpcHRzL21haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImFuZ3VsYXIubW9kdWxlKCdhcHAuaG9tZScpXG4gIC5jb250cm9sbGVyKCdPcGVuVG9rQ3RybCcsIFsnJHNjb3BlJywgJ09UU2Vzc2lvbicsICckaHR0cCcsICckd2luZG93JywgZnVuY3Rpb24oJHNjb3BlLCBPVFNlc3Npb24sICRodHRwLCAkd2luZG93KSB7XG4gICAgJGh0dHAuZ2V0KCcvY2xhc3Nyb29tJykuc3VjY2VzcyhmdW5jdGlvbihkYXRhKSB7XG4gICAgICBPVFNlc3Npb24uaW5pdChkYXRhLmFwaUtleSwgZGF0YS5zZXNzaW9uSWQsIGRhdGEudG9rZW4sIGZ1bmN0aW9uKGVyciwgc2Vzc2lvbikge1xuICAgICAgICBpZiAoZXJyKSB0aHJvdyBlcnI7XG5cbiAgICAgICAgc2Vzc2lvbi5vbih7XG4gICAgICAgICAgc3RhcnRlZFRvVGFsazogZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiU1RBUlRFRCBUTyBUQUxLXCIpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXZlbnQpO1xuICAgICAgICAgICAgZXZlbnQuc3Vic2NyaWJlcnMuZm9yRWFjaChmdW5jdGlvbihzdWJzY3JpYmVyKSB7XG4gICAgICAgICAgICAgIHN1YnNjcmliZXIuZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdPVF9iaWcnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHNjb3BlLiRlbWl0KFwib3RMYXlvdXRcIik7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIHN0b3BwZWRUb1RhbGs6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlNUT1BQRUQgVE8gVEFMS1wiKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGV2ZW50KTtcbiAgICAgICAgICAgIGV2ZW50LnN1YnNjcmliZXJzLmZvckVhY2goZnVuY3Rpb24oc3Vic2NyaWJlcikge1xuICAgICAgICAgICAgICBzdWJzY3JpYmVyLmVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZSgnT1RfYmlnJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRzY29wZS4kZW1pdChcIm90TGF5b3V0XCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgIH0pO1xuXG4gICAgICAkc2NvcGUuc3RyZWFtcyA9IE9UU2Vzc2lvbi5zdHJlYW1zO1xuXG4gICAgfSkuZXJyb3IoZnVuY3Rpb24oZGF0YSwgc3RhdHVzKSB7XG4gICAgICBjb25zb2xlLmxvZyhcIkFuIGVycm9yIG9jY3VycmVkIHdoaWxlIHJldHJpZXZpbmcgdGhlIGNsYXNzcm9vbSBkYXRhLlwiLCBkYXRhLCBzdGF0dXMpO1xuICAgIH0pO1xuXG4gICAgLy8gdGhpcyBpcyBwcm9iYWJseSB0aGUgd3JvbmcgcGxhY2UgdG8gZG8gdGhpcywgbWF5YmUgcHV0IHRoaXMgaW4gYSBkaXJlY3RpdmVcbiAgICBhbmd1bGFyLmVsZW1lbnQoJHdpbmRvdykuYmluZCgncmVzaXplJywgZnVuY3Rpb24oKSB7XG4gICAgICBjb25zb2xlLmxvZygnUkVTSVpFRCEnKTtcbiAgICAgIC8vIEJBRCEgYWNjZXNzaW5nIERPTSBkaXJlY3RseVxuICAgICAgLy8kKCcuY2xhc3Nyb29tJykud2lkdGgoJCgnYm9keScpLndpZHRoKCkgLSAkKCcjc2lkZWJhcicpLndpZHRoKCkpO1xuICAgICAgJCgnLmNsYXNzcm9vbScpLmhlaWdodCgkKHdpbmRvdykuaGVpZ2h0KCkgLSAoJCgnI2hlYWRlcicpLmhlaWdodCgpICsgJCgnI2NvdXJzZS1pbmZvJykuaGVpZ2h0KCkgKyAkKCcjcGFnZUZvb3RlcicpLmhlaWdodCgpKSk7XG4gICAgICAkc2NvcGUuJGVtaXQoJ290TGF5b3V0Jyk7XG4gICAgfSk7XG4gIH1dKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gYW5ndWxhci5tb2R1bGUoJ2FwcC5ob21lJywgWydvcGVudG9rJ10pO1xuXG5yZXF1aXJlKCcuL09wZW5Ub2tDdHJsJyk7XG4iLCJcbmFuZ3VsYXIubW9kdWxlKCdhcHAnLCBbXG4gIHJlcXVpcmUoJy4vaG9tZScpLm5hbWVcbl0pO1xuXG4iXX0=
