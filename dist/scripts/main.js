(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
angular.module('app.home')
  .controller('OpenTokCtrl', ['$scope', 'OTSession', '$http', '$window', '$firebase', '$attrs',
  function($scope, OTSession, $http, $window, $firebase, $attrs) {

    var MAX_BIG = 1,
        MIN_BIG = 1;

    if ($attrs.teacher === 'true') {
      $scope.teacher = true;
      console.log('i am the teacher');
    } else {
      $scope.teacher = false;
      console.log('i am a student');
    }

    $scope.showWhiteboard = false;

    var bigStreamsRef = new Firebase("https://otaudiodetect.firebaseio.com/classroom");
    $scope.bigStreams = $firebase(bigStreamsRef);

    var whiteboardRef = new Firebase("https://otaudiodetect.firebaseio.com/whiteboard");
    $scope.whiteboard = $firebase(whiteboardRef);

    //var opentokSession;

    // 1. load classroom data from firebase
    // 2. load session information from server
    // 3. connect to opentok
    $scope.bigStreams.$on('loaded', function() {
      $scope.whiteboard.$on('loaded', function() {
        $http.get('/classroom').success(function(data) {
          OTSession.init(data.apiKey, data.sessionId, data.token, function(err, session) {
            if (err) throw err;


            // OpenTok Events
            session.on({

              startedToTalk: function(event) {
                console.log('startedToTalk event fired');
                event.subscribers.forEach(function(subscriber) {
                  // if not locked and i am a teacher
                  if (!$scope.locked && $scope.teacher) {
                    // add the stream to bigStreams
                    console.log('SPEAKING:', subscriber.streamId);

                    // remove the oldest if we don't want any more big
                    var keys = $scope.bigStreams.$getIndex();
                    if (keys.length >= MAX_BIG) {
                      $scope.bigStreams.$remove(keys[0]);
                    }

                    $scope.bigStreams.$add(subscriber.streamId);
                  }
                });
              },

              stoppedToTalk: function(event) {
                console.log('stoppedToTalk event fired');
                event.subscribers.forEach(function(subscriber) {
                  // if not locked and i am a teacher
                  if (!$scope.locked && $scope.teacher) {
                    var keys = $scope.bigStreams.$getIndex();
                    // if we are already at the minimum, don't continue removing bigs
                    if (keys.length <= MIN_BIG) {
                      return;
                    }
                    keys.forEach(function(key) {
                      if (subscriber.streamId == $scope.bigStreams[key]) {
                        console.log('STOPPED SPEAKING:', subscriber.streamId);
                        $scope.bigStreams.$remove(key);
                      }
                    });
                  }
                });
              },

              streamCreated: function(event) {
                updateBigStreams();
              }
            });

            session.on('signal', function(event) {
              // if (event.type === 'signal:otad_whiteboard' && event.from.connectionId !== opentokSession.connection.connectionId ) {
              //   if (event.data === 'on') {
              //     $scope.showWhiteboard = true;
              //   } else if (event.data === 'off') {
              //     $scope.showWhiteboard = false;
              //   }
              //   setTimeout(function () {
              //     $scope.$emit("otLayout");
              //   }, 10);
              // }
            });

            //opentokSession = session;

          });

          // attach data to scope
          $scope.streams = OTSession.streams;
          $scope.publishers = OTSession.publishers;

          // if i'm the teacher, overwrite this and put just me as the big stream
          if ($scope.teacher) {
            // how do we know that we already started publishing?!
            // TODO: only take ownership after we know we are publishing
            console.log('about to take ownership. publishers: ');
            console.log($scope.publishers);
            takeOwnership();
          }
          // if i'm the student, call a function that iterates over the bigStreams and sets them up
          else {
            updateBigStreams();
          }

          $scope.bigStreams.$on('change', function() {
            // call the function that iterates over the bigStreams and sets them up
            updateBigStreams();
          });

          $scope.whiteboard.$on('change', function() {
            updateWhiteboard();
          });

        }).error(function(data, status) {
          console.log("An error occurred while retrieving the classroom data.", data, status);
        });
      });
    });

    var takeOwnership = function() {
      // there may be a race condition here, how do we know when the publisher is ready?
      if ((!$scope.publishers) || $scope.publishers.length != 1) {
        throw new Error('Publisher was not ready in time');
      }

      // TODO: a better way of knowing then the streamId is available, perhaps with $watch?
      if ($scope.publishers[0].stream) {
        console.log($scope.publishers[0].stream.streamId);
        $scope.bigStreams.$remove();
        $scope.bigStreams.$add($scope.publishers[0].stream.streamId);
        console.log('owned bigStreams');
      } else {
        $scope.publishers[0].on('streamCreated', function(event) {
          console.log($scope.publishers[0].stream.streamId);
          $scope.bigStreams.$remove();
          $scope.bigStreams.$add($scope.publishers[0].stream.streamId);
          console.log('owned bigStreams');
        });
      }
    };

    var updateBigStreams = function() {
      // flattened list of just the streamId's for the big streams
      var bigStreamList = [];

      // this is called for each stream in the session (subscribers + publisher)
      var updateStream = function(streamId) {
        console.log('searching for ' + streamId + ' in', bigStreamList);

        // BAD! dom querying galore
        var $el = $('[streamid=\''+streamId+'\']');
        if (!$el.length) $el = $('#publisher')

        if (bigStreamList.indexOf(streamId) >= 0) {
          // stream should be big
          console.log('make ' + streamId + ' big.');
          $el.addClass('OT_big');

        } else {
          // stream should not be big
          console.log('make ' + streamId + ' small.');
          $el.removeClass('OT_big');
        }
        console.log(OTSession.session.streams);
        setTimeout(function() {
          $scope.$emit("otLayout");
        }, 10);
      }

      // generate bigStreamList
      $scope.bigStreams.$getIndex().forEach(function(key, streamId) {
        bigStreamList.push($scope.bigStreams[key]);
      });
      console.log('scope bigStreams for udpate', $scope.bigStreams);
      console.log('big stream list for update', bigStreamList);

      // iterate over all known streams and call updateStream
      $scope.streams.forEach(function(stream, index) {
        updateStream(stream.streamId);
      });

      // TODO: a better way of knowing then the streamId is available, perhaps with $watch?
      if ($scope.publishers[0].stream) {
        updateStream($scope.publishers[0].stream.streamId);
        setTimeout(function() {
          $scope.$emit("otLayout");
        }, 10);
      } else {
        $scope.publishers[0].on('streamCreated', function(event) {
          updateStream($scope.publishers[0].stream.streamId);
          setTimeout(function() {
            $scope.$emit("otLayout");
          }, 10);
        });
      }

    };

    $scope.locked = true;
    $scope.$watch('locked', function(newValue, oldValue) {
      console.log('locked going from ' + oldValue + ' to ' + newValue);
      // TODO: check if we are the student of the teacher, if only the teacher presses the lock this doesn't matter
      if (newValue == true) {
        takeOwnership();
      }
    });

    // this is probably the wrong place to do this, maybe put this in a directive
    angular.element($window).bind('resize', function() {
      // BAD! accessing DOM directly
      // also probably want to throtle this
      $('.classroom').height($(window).height() - ($('#header').height() + $('#course-info').height() + $('#pageFooter').height()));
      $scope.$emit('otLayout');
    });

    $scope.toggleWhiteboard = function() {
      $scope.whiteboard.$set($scope.showWhiteboard ? 0 : 1);
    };

    var updateWhiteboard = function() {
      $scope.showWhiteboard = ($scope.whiteboard['$value'] === 0) ? false : true;
      setTimeout(function() {
        $scope.$emit("otLayout");
      }, 10);
    };
  }]);

},{}],2:[function(require,module,exports){
module.exports = angular.module('app.home', ['opentok', 'firebase', 'opentok-whiteboard']);

require('./OpenTokCtrl');

},{"./OpenTokCtrl":1}],3:[function(require,module,exports){

angular.module('app', [
  require('./home').name
]);


},{"./home":2}]},{},[3])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYW5rdXIvRGV2ZWxvcGVyL3dlYnJ0Y2V4cG8xNC1hdWRpb2RldGVjdGlvbi9ub2RlX21vZHVsZXMvcGhvLWRldnN0YWNrL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYW5rdXIvRGV2ZWxvcGVyL3dlYnJ0Y2V4cG8xNC1hdWRpb2RldGVjdGlvbi9zcmMvc2NyaXB0cy9ob21lL09wZW5Ub2tDdHJsLmpzIiwiL1VzZXJzL2Fua3VyL0RldmVsb3Blci93ZWJydGNleHBvMTQtYXVkaW9kZXRlY3Rpb24vc3JjL3NjcmlwdHMvaG9tZS9pbmRleC5qcyIsIi9Vc2Vycy9hbmt1ci9EZXZlbG9wZXIvd2VicnRjZXhwbzE0LWF1ZGlvZGV0ZWN0aW9uL3NyYy9zY3JpcHRzL21haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlPQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImFuZ3VsYXIubW9kdWxlKCdhcHAuaG9tZScpXG4gIC5jb250cm9sbGVyKCdPcGVuVG9rQ3RybCcsIFsnJHNjb3BlJywgJ09UU2Vzc2lvbicsICckaHR0cCcsICckd2luZG93JywgJyRmaXJlYmFzZScsICckYXR0cnMnLFxuICBmdW5jdGlvbigkc2NvcGUsIE9UU2Vzc2lvbiwgJGh0dHAsICR3aW5kb3csICRmaXJlYmFzZSwgJGF0dHJzKSB7XG5cbiAgICB2YXIgTUFYX0JJRyA9IDEsXG4gICAgICAgIE1JTl9CSUcgPSAxO1xuXG4gICAgaWYgKCRhdHRycy50ZWFjaGVyID09PSAndHJ1ZScpIHtcbiAgICAgICRzY29wZS50ZWFjaGVyID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUubG9nKCdpIGFtIHRoZSB0ZWFjaGVyJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICRzY29wZS50ZWFjaGVyID0gZmFsc2U7XG4gICAgICBjb25zb2xlLmxvZygnaSBhbSBhIHN0dWRlbnQnKTtcbiAgICB9XG5cbiAgICAkc2NvcGUuc2hvd1doaXRlYm9hcmQgPSBmYWxzZTtcblxuICAgIHZhciBiaWdTdHJlYW1zUmVmID0gbmV3IEZpcmViYXNlKFwiaHR0cHM6Ly9vdGF1ZGlvZGV0ZWN0LmZpcmViYXNlaW8uY29tL2NsYXNzcm9vbVwiKTtcbiAgICAkc2NvcGUuYmlnU3RyZWFtcyA9ICRmaXJlYmFzZShiaWdTdHJlYW1zUmVmKTtcblxuICAgIHZhciB3aGl0ZWJvYXJkUmVmID0gbmV3IEZpcmViYXNlKFwiaHR0cHM6Ly9vdGF1ZGlvZGV0ZWN0LmZpcmViYXNlaW8uY29tL3doaXRlYm9hcmRcIik7XG4gICAgJHNjb3BlLndoaXRlYm9hcmQgPSAkZmlyZWJhc2Uod2hpdGVib2FyZFJlZik7XG5cbiAgICAvL3ZhciBvcGVudG9rU2Vzc2lvbjtcblxuICAgIC8vIDEuIGxvYWQgY2xhc3Nyb29tIGRhdGEgZnJvbSBmaXJlYmFzZVxuICAgIC8vIDIuIGxvYWQgc2Vzc2lvbiBpbmZvcm1hdGlvbiBmcm9tIHNlcnZlclxuICAgIC8vIDMuIGNvbm5lY3QgdG8gb3BlbnRva1xuICAgICRzY29wZS5iaWdTdHJlYW1zLiRvbignbG9hZGVkJywgZnVuY3Rpb24oKSB7XG4gICAgICAkc2NvcGUud2hpdGVib2FyZC4kb24oJ2xvYWRlZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAkaHR0cC5nZXQoJy9jbGFzc3Jvb20nKS5zdWNjZXNzKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICBPVFNlc3Npb24uaW5pdChkYXRhLmFwaUtleSwgZGF0YS5zZXNzaW9uSWQsIGRhdGEudG9rZW4sIGZ1bmN0aW9uKGVyciwgc2Vzc2lvbikge1xuICAgICAgICAgICAgaWYgKGVycikgdGhyb3cgZXJyO1xuXG5cbiAgICAgICAgICAgIC8vIE9wZW5Ub2sgRXZlbnRzXG4gICAgICAgICAgICBzZXNzaW9uLm9uKHtcblxuICAgICAgICAgICAgICBzdGFydGVkVG9UYWxrOiBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzdGFydGVkVG9UYWxrIGV2ZW50IGZpcmVkJyk7XG4gICAgICAgICAgICAgICAgZXZlbnQuc3Vic2NyaWJlcnMuZm9yRWFjaChmdW5jdGlvbihzdWJzY3JpYmVyKSB7XG4gICAgICAgICAgICAgICAgICAvLyBpZiBub3QgbG9ja2VkIGFuZCBpIGFtIGEgdGVhY2hlclxuICAgICAgICAgICAgICAgICAgaWYgKCEkc2NvcGUubG9ja2VkICYmICRzY29wZS50ZWFjaGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGFkZCB0aGUgc3RyZWFtIHRvIGJpZ1N0cmVhbXNcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1NQRUFLSU5HOicsIHN1YnNjcmliZXIuc3RyZWFtSWQpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIHJlbW92ZSB0aGUgb2xkZXN0IGlmIHdlIGRvbid0IHdhbnQgYW55IG1vcmUgYmlnXG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXlzID0gJHNjb3BlLmJpZ1N0cmVhbXMuJGdldEluZGV4KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChrZXlzLmxlbmd0aCA+PSBNQVhfQklHKSB7XG4gICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmJpZ1N0cmVhbXMuJHJlbW92ZShrZXlzWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5iaWdTdHJlYW1zLiRhZGQoc3Vic2NyaWJlci5zdHJlYW1JZCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgc3RvcHBlZFRvVGFsazogZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc3RvcHBlZFRvVGFsayBldmVudCBmaXJlZCcpO1xuICAgICAgICAgICAgICAgIGV2ZW50LnN1YnNjcmliZXJzLmZvckVhY2goZnVuY3Rpb24oc3Vic2NyaWJlcikge1xuICAgICAgICAgICAgICAgICAgLy8gaWYgbm90IGxvY2tlZCBhbmQgaSBhbSBhIHRlYWNoZXJcbiAgICAgICAgICAgICAgICAgIGlmICghJHNjb3BlLmxvY2tlZCAmJiAkc2NvcGUudGVhY2hlcikge1xuICAgICAgICAgICAgICAgICAgICB2YXIga2V5cyA9ICRzY29wZS5iaWdTdHJlYW1zLiRnZXRJbmRleCgpO1xuICAgICAgICAgICAgICAgICAgICAvLyBpZiB3ZSBhcmUgYWxyZWFkeSBhdCB0aGUgbWluaW11bSwgZG9uJ3QgY29udGludWUgcmVtb3ZpbmcgYmlnc1xuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5cy5sZW5ndGggPD0gTUlOX0JJRykge1xuICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHN1YnNjcmliZXIuc3RyZWFtSWQgPT0gJHNjb3BlLmJpZ1N0cmVhbXNba2V5XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1NUT1BQRUQgU1BFQUtJTkc6Jywgc3Vic2NyaWJlci5zdHJlYW1JZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuYmlnU3RyZWFtcy4kcmVtb3ZlKGtleSk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICBzdHJlYW1DcmVhdGVkOiBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgICAgIHVwZGF0ZUJpZ1N0cmVhbXMoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHNlc3Npb24ub24oJ3NpZ25hbCcsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICAgIC8vIGlmIChldmVudC50eXBlID09PSAnc2lnbmFsOm90YWRfd2hpdGVib2FyZCcgJiYgZXZlbnQuZnJvbS5jb25uZWN0aW9uSWQgIT09IG9wZW50b2tTZXNzaW9uLmNvbm5lY3Rpb24uY29ubmVjdGlvbklkICkge1xuICAgICAgICAgICAgICAvLyAgIGlmIChldmVudC5kYXRhID09PSAnb24nKSB7XG4gICAgICAgICAgICAgIC8vICAgICAkc2NvcGUuc2hvd1doaXRlYm9hcmQgPSB0cnVlO1xuICAgICAgICAgICAgICAvLyAgIH0gZWxzZSBpZiAoZXZlbnQuZGF0YSA9PT0gJ29mZicpIHtcbiAgICAgICAgICAgICAgLy8gICAgICRzY29wZS5zaG93V2hpdGVib2FyZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAvLyAgIH1cbiAgICAgICAgICAgICAgLy8gICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgLy8gICAgICRzY29wZS4kZW1pdChcIm90TGF5b3V0XCIpO1xuICAgICAgICAgICAgICAvLyAgIH0sIDEwKTtcbiAgICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vb3BlbnRva1Nlc3Npb24gPSBzZXNzaW9uO1xuXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICAvLyBhdHRhY2ggZGF0YSB0byBzY29wZVxuICAgICAgICAgICRzY29wZS5zdHJlYW1zID0gT1RTZXNzaW9uLnN0cmVhbXM7XG4gICAgICAgICAgJHNjb3BlLnB1Ymxpc2hlcnMgPSBPVFNlc3Npb24ucHVibGlzaGVycztcblxuICAgICAgICAgIC8vIGlmIGknbSB0aGUgdGVhY2hlciwgb3ZlcndyaXRlIHRoaXMgYW5kIHB1dCBqdXN0IG1lIGFzIHRoZSBiaWcgc3RyZWFtXG4gICAgICAgICAgaWYgKCRzY29wZS50ZWFjaGVyKSB7XG4gICAgICAgICAgICAvLyBob3cgZG8gd2Uga25vdyB0aGF0IHdlIGFscmVhZHkgc3RhcnRlZCBwdWJsaXNoaW5nPyFcbiAgICAgICAgICAgIC8vIFRPRE86IG9ubHkgdGFrZSBvd25lcnNoaXAgYWZ0ZXIgd2Uga25vdyB3ZSBhcmUgcHVibGlzaGluZ1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2Fib3V0IHRvIHRha2Ugb3duZXJzaGlwLiBwdWJsaXNoZXJzOiAnKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCRzY29wZS5wdWJsaXNoZXJzKTtcbiAgICAgICAgICAgIHRha2VPd25lcnNoaXAoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gaWYgaSdtIHRoZSBzdHVkZW50LCBjYWxsIGEgZnVuY3Rpb24gdGhhdCBpdGVyYXRlcyBvdmVyIHRoZSBiaWdTdHJlYW1zIGFuZCBzZXRzIHRoZW0gdXBcbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHVwZGF0ZUJpZ1N0cmVhbXMoKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAkc2NvcGUuYmlnU3RyZWFtcy4kb24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLy8gY2FsbCB0aGUgZnVuY3Rpb24gdGhhdCBpdGVyYXRlcyBvdmVyIHRoZSBiaWdTdHJlYW1zIGFuZCBzZXRzIHRoZW0gdXBcbiAgICAgICAgICAgIHVwZGF0ZUJpZ1N0cmVhbXMoKTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgICRzY29wZS53aGl0ZWJvYXJkLiRvbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB1cGRhdGVXaGl0ZWJvYXJkKCk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgfSkuZXJyb3IoZnVuY3Rpb24oZGF0YSwgc3RhdHVzKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJBbiBlcnJvciBvY2N1cnJlZCB3aGlsZSByZXRyaWV2aW5nIHRoZSBjbGFzc3Jvb20gZGF0YS5cIiwgZGF0YSwgc3RhdHVzKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHZhciB0YWtlT3duZXJzaGlwID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyB0aGVyZSBtYXkgYmUgYSByYWNlIGNvbmRpdGlvbiBoZXJlLCBob3cgZG8gd2Uga25vdyB3aGVuIHRoZSBwdWJsaXNoZXIgaXMgcmVhZHk/XG4gICAgICBpZiAoKCEkc2NvcGUucHVibGlzaGVycykgfHwgJHNjb3BlLnB1Ymxpc2hlcnMubGVuZ3RoICE9IDEpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQdWJsaXNoZXIgd2FzIG5vdCByZWFkeSBpbiB0aW1lJyk7XG4gICAgICB9XG5cbiAgICAgIC8vIFRPRE86IGEgYmV0dGVyIHdheSBvZiBrbm93aW5nIHRoZW4gdGhlIHN0cmVhbUlkIGlzIGF2YWlsYWJsZSwgcGVyaGFwcyB3aXRoICR3YXRjaD9cbiAgICAgIGlmICgkc2NvcGUucHVibGlzaGVyc1swXS5zdHJlYW0pIHtcbiAgICAgICAgY29uc29sZS5sb2coJHNjb3BlLnB1Ymxpc2hlcnNbMF0uc3RyZWFtLnN0cmVhbUlkKTtcbiAgICAgICAgJHNjb3BlLmJpZ1N0cmVhbXMuJHJlbW92ZSgpO1xuICAgICAgICAkc2NvcGUuYmlnU3RyZWFtcy4kYWRkKCRzY29wZS5wdWJsaXNoZXJzWzBdLnN0cmVhbS5zdHJlYW1JZCk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdvd25lZCBiaWdTdHJlYW1zJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUucHVibGlzaGVyc1swXS5vbignc3RyZWFtQ3JlYXRlZCcsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJHNjb3BlLnB1Ymxpc2hlcnNbMF0uc3RyZWFtLnN0cmVhbUlkKTtcbiAgICAgICAgICAkc2NvcGUuYmlnU3RyZWFtcy4kcmVtb3ZlKCk7XG4gICAgICAgICAgJHNjb3BlLmJpZ1N0cmVhbXMuJGFkZCgkc2NvcGUucHVibGlzaGVyc1swXS5zdHJlYW0uc3RyZWFtSWQpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdvd25lZCBiaWdTdHJlYW1zJyk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgdXBkYXRlQmlnU3RyZWFtcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gZmxhdHRlbmVkIGxpc3Qgb2YganVzdCB0aGUgc3RyZWFtSWQncyBmb3IgdGhlIGJpZyBzdHJlYW1zXG4gICAgICB2YXIgYmlnU3RyZWFtTGlzdCA9IFtdO1xuXG4gICAgICAvLyB0aGlzIGlzIGNhbGxlZCBmb3IgZWFjaCBzdHJlYW0gaW4gdGhlIHNlc3Npb24gKHN1YnNjcmliZXJzICsgcHVibGlzaGVyKVxuICAgICAgdmFyIHVwZGF0ZVN0cmVhbSA9IGZ1bmN0aW9uKHN0cmVhbUlkKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdzZWFyY2hpbmcgZm9yICcgKyBzdHJlYW1JZCArICcgaW4nLCBiaWdTdHJlYW1MaXN0KTtcblxuICAgICAgICAvLyBCQUQhIGRvbSBxdWVyeWluZyBnYWxvcmVcbiAgICAgICAgdmFyICRlbCA9ICQoJ1tzdHJlYW1pZD1cXCcnK3N0cmVhbUlkKydcXCddJyk7XG4gICAgICAgIGlmICghJGVsLmxlbmd0aCkgJGVsID0gJCgnI3B1Ymxpc2hlcicpXG5cbiAgICAgICAgaWYgKGJpZ1N0cmVhbUxpc3QuaW5kZXhPZihzdHJlYW1JZCkgPj0gMCkge1xuICAgICAgICAgIC8vIHN0cmVhbSBzaG91bGQgYmUgYmlnXG4gICAgICAgICAgY29uc29sZS5sb2coJ21ha2UgJyArIHN0cmVhbUlkICsgJyBiaWcuJyk7XG4gICAgICAgICAgJGVsLmFkZENsYXNzKCdPVF9iaWcnKTtcblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHN0cmVhbSBzaG91bGQgbm90IGJlIGJpZ1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdtYWtlICcgKyBzdHJlYW1JZCArICcgc21hbGwuJyk7XG4gICAgICAgICAgJGVsLnJlbW92ZUNsYXNzKCdPVF9iaWcnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZyhPVFNlc3Npb24uc2Vzc2lvbi5zdHJlYW1zKTtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAkc2NvcGUuJGVtaXQoXCJvdExheW91dFwiKTtcbiAgICAgICAgfSwgMTApO1xuICAgICAgfVxuXG4gICAgICAvLyBnZW5lcmF0ZSBiaWdTdHJlYW1MaXN0XG4gICAgICAkc2NvcGUuYmlnU3RyZWFtcy4kZ2V0SW5kZXgoKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSwgc3RyZWFtSWQpIHtcbiAgICAgICAgYmlnU3RyZWFtTGlzdC5wdXNoKCRzY29wZS5iaWdTdHJlYW1zW2tleV0pO1xuICAgICAgfSk7XG4gICAgICBjb25zb2xlLmxvZygnc2NvcGUgYmlnU3RyZWFtcyBmb3IgdWRwYXRlJywgJHNjb3BlLmJpZ1N0cmVhbXMpO1xuICAgICAgY29uc29sZS5sb2coJ2JpZyBzdHJlYW0gbGlzdCBmb3IgdXBkYXRlJywgYmlnU3RyZWFtTGlzdCk7XG5cbiAgICAgIC8vIGl0ZXJhdGUgb3ZlciBhbGwga25vd24gc3RyZWFtcyBhbmQgY2FsbCB1cGRhdGVTdHJlYW1cbiAgICAgICRzY29wZS5zdHJlYW1zLmZvckVhY2goZnVuY3Rpb24oc3RyZWFtLCBpbmRleCkge1xuICAgICAgICB1cGRhdGVTdHJlYW0oc3RyZWFtLnN0cmVhbUlkKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBUT0RPOiBhIGJldHRlciB3YXkgb2Yga25vd2luZyB0aGVuIHRoZSBzdHJlYW1JZCBpcyBhdmFpbGFibGUsIHBlcmhhcHMgd2l0aCAkd2F0Y2g/XG4gICAgICBpZiAoJHNjb3BlLnB1Ymxpc2hlcnNbMF0uc3RyZWFtKSB7XG4gICAgICAgIHVwZGF0ZVN0cmVhbSgkc2NvcGUucHVibGlzaGVyc1swXS5zdHJlYW0uc3RyZWFtSWQpO1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRzY29wZS4kZW1pdChcIm90TGF5b3V0XCIpO1xuICAgICAgICB9LCAxMCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUucHVibGlzaGVyc1swXS5vbignc3RyZWFtQ3JlYXRlZCcsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgdXBkYXRlU3RyZWFtKCRzY29wZS5wdWJsaXNoZXJzWzBdLnN0cmVhbS5zdHJlYW1JZCk7XG4gICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICRzY29wZS4kZW1pdChcIm90TGF5b3V0XCIpO1xuICAgICAgICAgIH0sIDEwKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICB9O1xuXG4gICAgJHNjb3BlLmxvY2tlZCA9IHRydWU7XG4gICAgJHNjb3BlLiR3YXRjaCgnbG9ja2VkJywgZnVuY3Rpb24obmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICBjb25zb2xlLmxvZygnbG9ja2VkIGdvaW5nIGZyb20gJyArIG9sZFZhbHVlICsgJyB0byAnICsgbmV3VmFsdWUpO1xuICAgICAgLy8gVE9ETzogY2hlY2sgaWYgd2UgYXJlIHRoZSBzdHVkZW50IG9mIHRoZSB0ZWFjaGVyLCBpZiBvbmx5IHRoZSB0ZWFjaGVyIHByZXNzZXMgdGhlIGxvY2sgdGhpcyBkb2Vzbid0IG1hdHRlclxuICAgICAgaWYgKG5ld1ZhbHVlID09IHRydWUpIHtcbiAgICAgICAgdGFrZU93bmVyc2hpcCgpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gdGhpcyBpcyBwcm9iYWJseSB0aGUgd3JvbmcgcGxhY2UgdG8gZG8gdGhpcywgbWF5YmUgcHV0IHRoaXMgaW4gYSBkaXJlY3RpdmVcbiAgICBhbmd1bGFyLmVsZW1lbnQoJHdpbmRvdykuYmluZCgncmVzaXplJywgZnVuY3Rpb24oKSB7XG4gICAgICAvLyBCQUQhIGFjY2Vzc2luZyBET00gZGlyZWN0bHlcbiAgICAgIC8vIGFsc28gcHJvYmFibHkgd2FudCB0byB0aHJvdGxlIHRoaXNcbiAgICAgICQoJy5jbGFzc3Jvb20nKS5oZWlnaHQoJCh3aW5kb3cpLmhlaWdodCgpIC0gKCQoJyNoZWFkZXInKS5oZWlnaHQoKSArICQoJyNjb3Vyc2UtaW5mbycpLmhlaWdodCgpICsgJCgnI3BhZ2VGb290ZXInKS5oZWlnaHQoKSkpO1xuICAgICAgJHNjb3BlLiRlbWl0KCdvdExheW91dCcpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLnRvZ2dsZVdoaXRlYm9hcmQgPSBmdW5jdGlvbigpIHtcbiAgICAgICRzY29wZS53aGl0ZWJvYXJkLiRzZXQoJHNjb3BlLnNob3dXaGl0ZWJvYXJkID8gMCA6IDEpO1xuICAgIH07XG5cbiAgICB2YXIgdXBkYXRlV2hpdGVib2FyZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgJHNjb3BlLnNob3dXaGl0ZWJvYXJkID0gKCRzY29wZS53aGl0ZWJvYXJkWyckdmFsdWUnXSA9PT0gMCkgPyBmYWxzZSA6IHRydWU7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUuJGVtaXQoXCJvdExheW91dFwiKTtcbiAgICAgIH0sIDEwKTtcbiAgICB9O1xuICB9XSk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGFuZ3VsYXIubW9kdWxlKCdhcHAuaG9tZScsIFsnb3BlbnRvaycsICdmaXJlYmFzZScsICdvcGVudG9rLXdoaXRlYm9hcmQnXSk7XG5cbnJlcXVpcmUoJy4vT3BlblRva0N0cmwnKTtcbiIsIlxuYW5ndWxhci5tb2R1bGUoJ2FwcCcsIFtcbiAgcmVxdWlyZSgnLi9ob21lJykubmFtZVxuXSk7XG5cbiJdfQ==
