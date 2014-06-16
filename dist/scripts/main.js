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

    // 1. load classroom data and whiteboard from firebase
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

          });

          // attach data to scope
          $scope.streams = OTSession.streams;
          $scope.publishers = OTSession.publishers;

          // if i'm the teacher, overwrite this and put just me as the big stream
          if ($scope.teacher) {
            $scope.whiteboard.$set(0);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYW5rdXIvRGV2ZWxvcGVyL3dlYnJ0Y2V4cG8xNC1hdWRpb2RldGVjdGlvbi9ub2RlX21vZHVsZXMvcGhvLWRldnN0YWNrL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYW5rdXIvRGV2ZWxvcGVyL3dlYnJ0Y2V4cG8xNC1hdWRpb2RldGVjdGlvbi9zcmMvc2NyaXB0cy9ob21lL09wZW5Ub2tDdHJsLmpzIiwiL1VzZXJzL2Fua3VyL0RldmVsb3Blci93ZWJydGNleHBvMTQtYXVkaW9kZXRlY3Rpb24vc3JjL3NjcmlwdHMvaG9tZS9pbmRleC5qcyIsIi9Vc2Vycy9hbmt1ci9EZXZlbG9wZXIvd2VicnRjZXhwbzE0LWF1ZGlvZGV0ZWN0aW9uL3NyYy9zY3JpcHRzL21haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5TkE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJhbmd1bGFyLm1vZHVsZSgnYXBwLmhvbWUnKVxuICAuY29udHJvbGxlcignT3BlblRva0N0cmwnLCBbJyRzY29wZScsICdPVFNlc3Npb24nLCAnJGh0dHAnLCAnJHdpbmRvdycsICckZmlyZWJhc2UnLCAnJGF0dHJzJyxcbiAgZnVuY3Rpb24oJHNjb3BlLCBPVFNlc3Npb24sICRodHRwLCAkd2luZG93LCAkZmlyZWJhc2UsICRhdHRycykge1xuXG4gICAgdmFyIE1BWF9CSUcgPSAxLFxuICAgICAgICBNSU5fQklHID0gMTtcblxuICAgIGlmICgkYXR0cnMudGVhY2hlciA9PT0gJ3RydWUnKSB7XG4gICAgICAkc2NvcGUudGVhY2hlciA9IHRydWU7XG4gICAgICBjb25zb2xlLmxvZygnaSBhbSB0aGUgdGVhY2hlcicpO1xuICAgIH0gZWxzZSB7XG4gICAgICAkc2NvcGUudGVhY2hlciA9IGZhbHNlO1xuICAgICAgY29uc29sZS5sb2coJ2kgYW0gYSBzdHVkZW50Jyk7XG4gICAgfVxuXG4gICAgJHNjb3BlLnNob3dXaGl0ZWJvYXJkID0gZmFsc2U7XG5cbiAgICB2YXIgYmlnU3RyZWFtc1JlZiA9IG5ldyBGaXJlYmFzZShcImh0dHBzOi8vb3RhdWRpb2RldGVjdC5maXJlYmFzZWlvLmNvbS9jbGFzc3Jvb21cIik7XG4gICAgJHNjb3BlLmJpZ1N0cmVhbXMgPSAkZmlyZWJhc2UoYmlnU3RyZWFtc1JlZik7XG5cbiAgICB2YXIgd2hpdGVib2FyZFJlZiA9IG5ldyBGaXJlYmFzZShcImh0dHBzOi8vb3RhdWRpb2RldGVjdC5maXJlYmFzZWlvLmNvbS93aGl0ZWJvYXJkXCIpO1xuICAgICRzY29wZS53aGl0ZWJvYXJkID0gJGZpcmViYXNlKHdoaXRlYm9hcmRSZWYpO1xuXG4gICAgLy8gMS4gbG9hZCBjbGFzc3Jvb20gZGF0YSBhbmQgd2hpdGVib2FyZCBmcm9tIGZpcmViYXNlXG4gICAgLy8gMi4gbG9hZCBzZXNzaW9uIGluZm9ybWF0aW9uIGZyb20gc2VydmVyXG4gICAgLy8gMy4gY29ubmVjdCB0byBvcGVudG9rXG4gICAgJHNjb3BlLmJpZ1N0cmVhbXMuJG9uKCdsb2FkZWQnLCBmdW5jdGlvbigpIHtcbiAgICAgICRzY29wZS53aGl0ZWJvYXJkLiRvbignbG9hZGVkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICRodHRwLmdldCgnL2NsYXNzcm9vbScpLnN1Y2Nlc3MoZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgIE9UU2Vzc2lvbi5pbml0KGRhdGEuYXBpS2V5LCBkYXRhLnNlc3Npb25JZCwgZGF0YS50b2tlbiwgZnVuY3Rpb24oZXJyLCBzZXNzaW9uKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB0aHJvdyBlcnI7XG5cblxuICAgICAgICAgICAgLy8gT3BlblRvayBFdmVudHNcbiAgICAgICAgICAgIHNlc3Npb24ub24oe1xuXG4gICAgICAgICAgICAgIHN0YXJ0ZWRUb1RhbGs6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3N0YXJ0ZWRUb1RhbGsgZXZlbnQgZmlyZWQnKTtcbiAgICAgICAgICAgICAgICBldmVudC5zdWJzY3JpYmVycy5mb3JFYWNoKGZ1bmN0aW9uKHN1YnNjcmliZXIpIHtcbiAgICAgICAgICAgICAgICAgIC8vIGlmIG5vdCBsb2NrZWQgYW5kIGkgYW0gYSB0ZWFjaGVyXG4gICAgICAgICAgICAgICAgICBpZiAoISRzY29wZS5sb2NrZWQgJiYgJHNjb3BlLnRlYWNoZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gYWRkIHRoZSBzdHJlYW0gdG8gYmlnU3RyZWFtc1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnU1BFQUtJTkc6Jywgc3Vic2NyaWJlci5zdHJlYW1JZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gcmVtb3ZlIHRoZSBvbGRlc3QgaWYgd2UgZG9uJ3Qgd2FudCBhbnkgbW9yZSBiaWdcbiAgICAgICAgICAgICAgICAgICAgdmFyIGtleXMgPSAkc2NvcGUuYmlnU3RyZWFtcy4kZ2V0SW5kZXgoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleXMubGVuZ3RoID49IE1BWF9CSUcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuYmlnU3RyZWFtcy4kcmVtb3ZlKGtleXNbMF0pO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmJpZ1N0cmVhbXMuJGFkZChzdWJzY3JpYmVyLnN0cmVhbUlkKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICBzdG9wcGVkVG9UYWxrOiBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzdG9wcGVkVG9UYWxrIGV2ZW50IGZpcmVkJyk7XG4gICAgICAgICAgICAgICAgZXZlbnQuc3Vic2NyaWJlcnMuZm9yRWFjaChmdW5jdGlvbihzdWJzY3JpYmVyKSB7XG4gICAgICAgICAgICAgICAgICAvLyBpZiBub3QgbG9ja2VkIGFuZCBpIGFtIGEgdGVhY2hlclxuICAgICAgICAgICAgICAgICAgaWYgKCEkc2NvcGUubG9ja2VkICYmICRzY29wZS50ZWFjaGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXlzID0gJHNjb3BlLmJpZ1N0cmVhbXMuJGdldEluZGV4KCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIHdlIGFyZSBhbHJlYWR5IGF0IHRoZSBtaW5pbXVtLCBkb24ndCBjb250aW51ZSByZW1vdmluZyBiaWdzXG4gICAgICAgICAgICAgICAgICAgIGlmIChrZXlzLmxlbmd0aCA8PSBNSU5fQklHKSB7XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoc3Vic2NyaWJlci5zdHJlYW1JZCA9PSAkc2NvcGUuYmlnU3RyZWFtc1trZXldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnU1RPUFBFRCBTUEVBS0lORzonLCBzdWJzY3JpYmVyLnN0cmVhbUlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5iaWdTdHJlYW1zLiRyZW1vdmUoa2V5KTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgIHN0cmVhbUNyZWF0ZWQ6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlQmlnU3RyZWFtcygpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgLy8gYXR0YWNoIGRhdGEgdG8gc2NvcGVcbiAgICAgICAgICAkc2NvcGUuc3RyZWFtcyA9IE9UU2Vzc2lvbi5zdHJlYW1zO1xuICAgICAgICAgICRzY29wZS5wdWJsaXNoZXJzID0gT1RTZXNzaW9uLnB1Ymxpc2hlcnM7XG5cbiAgICAgICAgICAvLyBpZiBpJ20gdGhlIHRlYWNoZXIsIG92ZXJ3cml0ZSB0aGlzIGFuZCBwdXQganVzdCBtZSBhcyB0aGUgYmlnIHN0cmVhbVxuICAgICAgICAgIGlmICgkc2NvcGUudGVhY2hlcikge1xuICAgICAgICAgICAgJHNjb3BlLndoaXRlYm9hcmQuJHNldCgwKTtcbiAgICAgICAgICAgIC8vIGhvdyBkbyB3ZSBrbm93IHRoYXQgd2UgYWxyZWFkeSBzdGFydGVkIHB1Ymxpc2hpbmc/IVxuICAgICAgICAgICAgLy8gVE9ETzogb25seSB0YWtlIG93bmVyc2hpcCBhZnRlciB3ZSBrbm93IHdlIGFyZSBwdWJsaXNoaW5nXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnYWJvdXQgdG8gdGFrZSBvd25lcnNoaXAuIHB1Ymxpc2hlcnM6ICcpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJHNjb3BlLnB1Ymxpc2hlcnMpO1xuICAgICAgICAgICAgdGFrZU93bmVyc2hpcCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBpZiBpJ20gdGhlIHN0dWRlbnQsIGNhbGwgYSBmdW5jdGlvbiB0aGF0IGl0ZXJhdGVzIG92ZXIgdGhlIGJpZ1N0cmVhbXMgYW5kIHNldHMgdGhlbSB1cFxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdXBkYXRlQmlnU3RyZWFtcygpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgICRzY29wZS5iaWdTdHJlYW1zLiRvbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBjYWxsIHRoZSBmdW5jdGlvbiB0aGF0IGl0ZXJhdGVzIG92ZXIgdGhlIGJpZ1N0cmVhbXMgYW5kIHNldHMgdGhlbSB1cFxuICAgICAgICAgICAgdXBkYXRlQmlnU3RyZWFtcygpO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgJHNjb3BlLndoaXRlYm9hcmQuJG9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHVwZGF0ZVdoaXRlYm9hcmQoKTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICB9KS5lcnJvcihmdW5jdGlvbihkYXRhLCBzdGF0dXMpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkFuIGVycm9yIG9jY3VycmVkIHdoaWxlIHJldHJpZXZpbmcgdGhlIGNsYXNzcm9vbSBkYXRhLlwiLCBkYXRhLCBzdGF0dXMpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdmFyIHRha2VPd25lcnNoaXAgPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIHRoZXJlIG1heSBiZSBhIHJhY2UgY29uZGl0aW9uIGhlcmUsIGhvdyBkbyB3ZSBrbm93IHdoZW4gdGhlIHB1Ymxpc2hlciBpcyByZWFkeT9cbiAgICAgIGlmICgoISRzY29wZS5wdWJsaXNoZXJzKSB8fCAkc2NvcGUucHVibGlzaGVycy5sZW5ndGggIT0gMSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1B1Ymxpc2hlciB3YXMgbm90IHJlYWR5IGluIHRpbWUnKTtcbiAgICAgIH1cblxuICAgICAgLy8gVE9ETzogYSBiZXR0ZXIgd2F5IG9mIGtub3dpbmcgdGhlbiB0aGUgc3RyZWFtSWQgaXMgYXZhaWxhYmxlLCBwZXJoYXBzIHdpdGggJHdhdGNoP1xuICAgICAgaWYgKCRzY29wZS5wdWJsaXNoZXJzWzBdLnN0cmVhbSkge1xuICAgICAgICBjb25zb2xlLmxvZygkc2NvcGUucHVibGlzaGVyc1swXS5zdHJlYW0uc3RyZWFtSWQpO1xuICAgICAgICAkc2NvcGUuYmlnU3RyZWFtcy4kcmVtb3ZlKCk7XG4gICAgICAgICRzY29wZS5iaWdTdHJlYW1zLiRhZGQoJHNjb3BlLnB1Ymxpc2hlcnNbMF0uc3RyZWFtLnN0cmVhbUlkKTtcbiAgICAgICAgY29uc29sZS5sb2coJ293bmVkIGJpZ1N0cmVhbXMnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5wdWJsaXNoZXJzWzBdLm9uKCdzdHJlYW1DcmVhdGVkJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygkc2NvcGUucHVibGlzaGVyc1swXS5zdHJlYW0uc3RyZWFtSWQpO1xuICAgICAgICAgICRzY29wZS5iaWdTdHJlYW1zLiRyZW1vdmUoKTtcbiAgICAgICAgICAkc2NvcGUuYmlnU3RyZWFtcy4kYWRkKCRzY29wZS5wdWJsaXNoZXJzWzBdLnN0cmVhbS5zdHJlYW1JZCk7XG4gICAgICAgICAgY29uc29sZS5sb2coJ293bmVkIGJpZ1N0cmVhbXMnKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHZhciB1cGRhdGVCaWdTdHJlYW1zID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBmbGF0dGVuZWQgbGlzdCBvZiBqdXN0IHRoZSBzdHJlYW1JZCdzIGZvciB0aGUgYmlnIHN0cmVhbXNcbiAgICAgIHZhciBiaWdTdHJlYW1MaXN0ID0gW107XG5cbiAgICAgIC8vIHRoaXMgaXMgY2FsbGVkIGZvciBlYWNoIHN0cmVhbSBpbiB0aGUgc2Vzc2lvbiAoc3Vic2NyaWJlcnMgKyBwdWJsaXNoZXIpXG4gICAgICB2YXIgdXBkYXRlU3RyZWFtID0gZnVuY3Rpb24oc3RyZWFtSWQpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3NlYXJjaGluZyBmb3IgJyArIHN0cmVhbUlkICsgJyBpbicsIGJpZ1N0cmVhbUxpc3QpO1xuXG4gICAgICAgIC8vIEJBRCEgZG9tIHF1ZXJ5aW5nIGdhbG9yZVxuICAgICAgICB2YXIgJGVsID0gJCgnW3N0cmVhbWlkPVxcJycrc3RyZWFtSWQrJ1xcJ10nKTtcbiAgICAgICAgaWYgKCEkZWwubGVuZ3RoKSAkZWwgPSAkKCcjcHVibGlzaGVyJylcblxuICAgICAgICBpZiAoYmlnU3RyZWFtTGlzdC5pbmRleE9mKHN0cmVhbUlkKSA+PSAwKSB7XG4gICAgICAgICAgLy8gc3RyZWFtIHNob3VsZCBiZSBiaWdcbiAgICAgICAgICBjb25zb2xlLmxvZygnbWFrZSAnICsgc3RyZWFtSWQgKyAnIGJpZy4nKTtcbiAgICAgICAgICAkZWwuYWRkQ2xhc3MoJ09UX2JpZycpO1xuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gc3RyZWFtIHNob3VsZCBub3QgYmUgYmlnXG4gICAgICAgICAgY29uc29sZS5sb2coJ21ha2UgJyArIHN0cmVhbUlkICsgJyBzbWFsbC4nKTtcbiAgICAgICAgICAkZWwucmVtb3ZlQ2xhc3MoJ09UX2JpZycpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKE9UU2Vzc2lvbi5zZXNzaW9uLnN0cmVhbXMpO1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRzY29wZS4kZW1pdChcIm90TGF5b3V0XCIpO1xuICAgICAgICB9LCAxMCk7XG4gICAgICB9XG5cbiAgICAgIC8vIGdlbmVyYXRlIGJpZ1N0cmVhbUxpc3RcbiAgICAgICRzY29wZS5iaWdTdHJlYW1zLiRnZXRJbmRleCgpLmZvckVhY2goZnVuY3Rpb24oa2V5LCBzdHJlYW1JZCkge1xuICAgICAgICBiaWdTdHJlYW1MaXN0LnB1c2goJHNjb3BlLmJpZ1N0cmVhbXNba2V5XSk7XG4gICAgICB9KTtcbiAgICAgIGNvbnNvbGUubG9nKCdzY29wZSBiaWdTdHJlYW1zIGZvciB1ZHBhdGUnLCAkc2NvcGUuYmlnU3RyZWFtcyk7XG4gICAgICBjb25zb2xlLmxvZygnYmlnIHN0cmVhbSBsaXN0IGZvciB1cGRhdGUnLCBiaWdTdHJlYW1MaXN0KTtcblxuICAgICAgLy8gaXRlcmF0ZSBvdmVyIGFsbCBrbm93biBzdHJlYW1zIGFuZCBjYWxsIHVwZGF0ZVN0cmVhbVxuICAgICAgJHNjb3BlLnN0cmVhbXMuZm9yRWFjaChmdW5jdGlvbihzdHJlYW0sIGluZGV4KSB7XG4gICAgICAgIHVwZGF0ZVN0cmVhbShzdHJlYW0uc3RyZWFtSWQpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFRPRE86IGEgYmV0dGVyIHdheSBvZiBrbm93aW5nIHRoZW4gdGhlIHN0cmVhbUlkIGlzIGF2YWlsYWJsZSwgcGVyaGFwcyB3aXRoICR3YXRjaD9cbiAgICAgIGlmICgkc2NvcGUucHVibGlzaGVyc1swXS5zdHJlYW0pIHtcbiAgICAgICAgdXBkYXRlU3RyZWFtKCRzY29wZS5wdWJsaXNoZXJzWzBdLnN0cmVhbS5zdHJlYW1JZCk7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJHNjb3BlLiRlbWl0KFwib3RMYXlvdXRcIik7XG4gICAgICAgIH0sIDEwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5wdWJsaXNoZXJzWzBdLm9uKCdzdHJlYW1DcmVhdGVkJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICB1cGRhdGVTdHJlYW0oJHNjb3BlLnB1Ymxpc2hlcnNbMF0uc3RyZWFtLnN0cmVhbUlkKTtcbiAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJHNjb3BlLiRlbWl0KFwib3RMYXlvdXRcIik7XG4gICAgICAgICAgfSwgMTApO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgIH07XG5cbiAgICAkc2NvcGUubG9ja2VkID0gdHJ1ZTtcbiAgICAkc2NvcGUuJHdhdGNoKCdsb2NrZWQnLCBmdW5jdGlvbihuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdsb2NrZWQgZ29pbmcgZnJvbSAnICsgb2xkVmFsdWUgKyAnIHRvICcgKyBuZXdWYWx1ZSk7XG4gICAgICAvLyBUT0RPOiBjaGVjayBpZiB3ZSBhcmUgdGhlIHN0dWRlbnQgb2YgdGhlIHRlYWNoZXIsIGlmIG9ubHkgdGhlIHRlYWNoZXIgcHJlc3NlcyB0aGUgbG9jayB0aGlzIGRvZXNuJ3QgbWF0dGVyXG4gICAgICBpZiAobmV3VmFsdWUgPT0gdHJ1ZSkge1xuICAgICAgICB0YWtlT3duZXJzaGlwKCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyB0aGlzIGlzIHByb2JhYmx5IHRoZSB3cm9uZyBwbGFjZSB0byBkbyB0aGlzLCBtYXliZSBwdXQgdGhpcyBpbiBhIGRpcmVjdGl2ZVxuICAgIGFuZ3VsYXIuZWxlbWVudCgkd2luZG93KS5iaW5kKCdyZXNpemUnLCBmdW5jdGlvbigpIHtcbiAgICAgIC8vIEJBRCEgYWNjZXNzaW5nIERPTSBkaXJlY3RseVxuICAgICAgLy8gYWxzbyBwcm9iYWJseSB3YW50IHRvIHRocm90bGUgdGhpc1xuICAgICAgJCgnLmNsYXNzcm9vbScpLmhlaWdodCgkKHdpbmRvdykuaGVpZ2h0KCkgLSAoJCgnI2hlYWRlcicpLmhlaWdodCgpICsgJCgnI2NvdXJzZS1pbmZvJykuaGVpZ2h0KCkgKyAkKCcjcGFnZUZvb3RlcicpLmhlaWdodCgpKSk7XG4gICAgICAkc2NvcGUuJGVtaXQoJ290TGF5b3V0Jyk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUudG9nZ2xlV2hpdGVib2FyZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgJHNjb3BlLndoaXRlYm9hcmQuJHNldCgkc2NvcGUuc2hvd1doaXRlYm9hcmQgPyAwIDogMSk7XG4gICAgfTtcblxuICAgIHZhciB1cGRhdGVXaGl0ZWJvYXJkID0gZnVuY3Rpb24oKSB7XG4gICAgICAkc2NvcGUuc2hvd1doaXRlYm9hcmQgPSAoJHNjb3BlLndoaXRlYm9hcmRbJyR2YWx1ZSddID09PSAwKSA/IGZhbHNlIDogdHJ1ZTtcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICRzY29wZS4kZW1pdChcIm90TGF5b3V0XCIpO1xuICAgICAgfSwgMTApO1xuICAgIH07XG4gIH1dKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gYW5ndWxhci5tb2R1bGUoJ2FwcC5ob21lJywgWydvcGVudG9rJywgJ2ZpcmViYXNlJywgJ29wZW50b2std2hpdGVib2FyZCddKTtcblxucmVxdWlyZSgnLi9PcGVuVG9rQ3RybCcpO1xuIiwiXG5hbmd1bGFyLm1vZHVsZSgnYXBwJywgW1xuICByZXF1aXJlKCcuL2hvbWUnKS5uYW1lXG5dKTtcblxuIl19
