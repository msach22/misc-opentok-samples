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

    $scope.connected = false;
    $scope.showWhiteboard = false;

    var bigStreamsRef = new Firebase("https://otaudiodetect.firebaseio.com/classroom");
    $scope.bigStreams = $firebase(bigStreamsRef);

    var opentokSession;

    // 1. load classroom data from firebase
    // 2. load session information from server
    // 3. connect to opentok
    $scope.bigStreams.$on('loaded', function() {
      $http.get('/classroom').success(function(data) {
        OTSession.init(data.apiKey, data.sessionId, data.token, function(err, session) {
          if (err) throw err;


          // OpenTok Events
          $scope.connected = true;
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
            },

            sessionDisconnected: function() {
              $scope.connected = false;
            }
          });

          session.on('signal', function(event) {
            if (event.type === 'signal:otad_whiteboard' && event.from.connectionId !== opentokSession.connection.connectionId ) {
              if (event.data === 'on') {
                $scope.showWhiteboard = true;
              } else if (event.data === 'off') {
                $scope.showWhiteboard = false;
              }
              setTimeout(function () {
                $scope.$emit("otLayout");
              }, 10);
            }
          });

          opentokSession = session;

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

      }).error(function(data, status) {
        console.log("An error occurred while retrieving the classroom data.", data, status);
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
      $scope.showWhiteboard = !$scope.showWhiteboard;
      if ($scope.showWhiteboard) {
        console.log('showing whiteboard');
        opentokSession.signal({
          type: "otad_whiteboard",
          data: "on"
        });
      } else {
        console.log('hiding whiteboard');
        opentokSession.signal({
          type: "otad_whiteboard",
          data: "off"
        });
      }
      setTimeout(function () {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYW5rdXIvRGV2ZWxvcGVyL3dlYnJ0Y2V4cG8xNC1hdWRpb2RldGVjdGlvbi9ub2RlX21vZHVsZXMvcGhvLWRldnN0YWNrL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYW5rdXIvRGV2ZWxvcGVyL3dlYnJ0Y2V4cG8xNC1hdWRpb2RldGVjdGlvbi9zcmMvc2NyaXB0cy9ob21lL09wZW5Ub2tDdHJsLmpzIiwiL1VzZXJzL2Fua3VyL0RldmVsb3Blci93ZWJydGNleHBvMTQtYXVkaW9kZXRlY3Rpb24vc3JjL3NjcmlwdHMvaG9tZS9pbmRleC5qcyIsIi9Vc2Vycy9hbmt1ci9EZXZlbG9wZXIvd2VicnRjZXhwbzE0LWF1ZGlvZGV0ZWN0aW9uL3NyYy9zY3JpcHRzL21haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BQQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImFuZ3VsYXIubW9kdWxlKCdhcHAuaG9tZScpXG4gIC5jb250cm9sbGVyKCdPcGVuVG9rQ3RybCcsIFsnJHNjb3BlJywgJ09UU2Vzc2lvbicsICckaHR0cCcsICckd2luZG93JywgJyRmaXJlYmFzZScsICckYXR0cnMnLFxuICBmdW5jdGlvbigkc2NvcGUsIE9UU2Vzc2lvbiwgJGh0dHAsICR3aW5kb3csICRmaXJlYmFzZSwgJGF0dHJzKSB7XG5cbiAgICB2YXIgTUFYX0JJRyA9IDEsXG4gICAgICAgIE1JTl9CSUcgPSAxO1xuXG4gICAgaWYgKCRhdHRycy50ZWFjaGVyID09PSAndHJ1ZScpIHtcbiAgICAgICRzY29wZS50ZWFjaGVyID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUubG9nKCdpIGFtIHRoZSB0ZWFjaGVyJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICRzY29wZS50ZWFjaGVyID0gZmFsc2U7XG4gICAgICBjb25zb2xlLmxvZygnaSBhbSBhIHN0dWRlbnQnKTtcbiAgICB9XG5cbiAgICAkc2NvcGUuY29ubmVjdGVkID0gZmFsc2U7XG4gICAgJHNjb3BlLnNob3dXaGl0ZWJvYXJkID0gZmFsc2U7XG5cbiAgICB2YXIgYmlnU3RyZWFtc1JlZiA9IG5ldyBGaXJlYmFzZShcImh0dHBzOi8vb3RhdWRpb2RldGVjdC5maXJlYmFzZWlvLmNvbS9jbGFzc3Jvb21cIik7XG4gICAgJHNjb3BlLmJpZ1N0cmVhbXMgPSAkZmlyZWJhc2UoYmlnU3RyZWFtc1JlZik7XG5cbiAgICB2YXIgb3BlbnRva1Nlc3Npb247XG5cbiAgICAvLyAxLiBsb2FkIGNsYXNzcm9vbSBkYXRhIGZyb20gZmlyZWJhc2VcbiAgICAvLyAyLiBsb2FkIHNlc3Npb24gaW5mb3JtYXRpb24gZnJvbSBzZXJ2ZXJcbiAgICAvLyAzLiBjb25uZWN0IHRvIG9wZW50b2tcbiAgICAkc2NvcGUuYmlnU3RyZWFtcy4kb24oJ2xvYWRlZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgJGh0dHAuZ2V0KCcvY2xhc3Nyb29tJykuc3VjY2VzcyhmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIE9UU2Vzc2lvbi5pbml0KGRhdGEuYXBpS2V5LCBkYXRhLnNlc3Npb25JZCwgZGF0YS50b2tlbiwgZnVuY3Rpb24oZXJyLCBzZXNzaW9uKSB7XG4gICAgICAgICAgaWYgKGVycikgdGhyb3cgZXJyO1xuXG5cbiAgICAgICAgICAvLyBPcGVuVG9rIEV2ZW50c1xuICAgICAgICAgICRzY29wZS5jb25uZWN0ZWQgPSB0cnVlO1xuICAgICAgICAgIHNlc3Npb24ub24oe1xuXG4gICAgICAgICAgICBzdGFydGVkVG9UYWxrOiBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc3RhcnRlZFRvVGFsayBldmVudCBmaXJlZCcpO1xuICAgICAgICAgICAgICBldmVudC5zdWJzY3JpYmVycy5mb3JFYWNoKGZ1bmN0aW9uKHN1YnNjcmliZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBpZiBub3QgbG9ja2VkIGFuZCBpIGFtIGEgdGVhY2hlclxuICAgICAgICAgICAgICAgIGlmICghJHNjb3BlLmxvY2tlZCAmJiAkc2NvcGUudGVhY2hlcikge1xuICAgICAgICAgICAgICAgICAgLy8gYWRkIHRoZSBzdHJlYW0gdG8gYmlnU3RyZWFtc1xuICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1NQRUFLSU5HOicsIHN1YnNjcmliZXIuc3RyZWFtSWQpO1xuXG4gICAgICAgICAgICAgICAgICAvLyByZW1vdmUgdGhlIG9sZGVzdCBpZiB3ZSBkb24ndCB3YW50IGFueSBtb3JlIGJpZ1xuICAgICAgICAgICAgICAgICAgdmFyIGtleXMgPSAkc2NvcGUuYmlnU3RyZWFtcy4kZ2V0SW5kZXgoKTtcbiAgICAgICAgICAgICAgICAgIGlmIChrZXlzLmxlbmd0aCA+PSBNQVhfQklHKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5iaWdTdHJlYW1zLiRyZW1vdmUoa2V5c1swXSk7XG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICRzY29wZS5iaWdTdHJlYW1zLiRhZGQoc3Vic2NyaWJlci5zdHJlYW1JZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHN0b3BwZWRUb1RhbGs6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzdG9wcGVkVG9UYWxrIGV2ZW50IGZpcmVkJyk7XG4gICAgICAgICAgICAgIGV2ZW50LnN1YnNjcmliZXJzLmZvckVhY2goZnVuY3Rpb24oc3Vic2NyaWJlcikge1xuICAgICAgICAgICAgICAgIC8vIGlmIG5vdCBsb2NrZWQgYW5kIGkgYW0gYSB0ZWFjaGVyXG4gICAgICAgICAgICAgICAgaWYgKCEkc2NvcGUubG9ja2VkICYmICRzY29wZS50ZWFjaGVyKSB7XG4gICAgICAgICAgICAgICAgICB2YXIga2V5cyA9ICRzY29wZS5iaWdTdHJlYW1zLiRnZXRJbmRleCgpO1xuICAgICAgICAgICAgICAgICAgLy8gaWYgd2UgYXJlIGFscmVhZHkgYXQgdGhlIG1pbmltdW0sIGRvbid0IGNvbnRpbnVlIHJlbW92aW5nIGJpZ3NcbiAgICAgICAgICAgICAgICAgIGlmIChrZXlzLmxlbmd0aCA8PSBNSU5fQklHKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN1YnNjcmliZXIuc3RyZWFtSWQgPT0gJHNjb3BlLmJpZ1N0cmVhbXNba2V5XSkge1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTVE9QUEVEIFNQRUFLSU5HOicsIHN1YnNjcmliZXIuc3RyZWFtSWQpO1xuICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5iaWdTdHJlYW1zLiRyZW1vdmUoa2V5KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHN0cmVhbUNyZWF0ZWQ6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICAgIHVwZGF0ZUJpZ1N0cmVhbXMoKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHNlc3Npb25EaXNjb25uZWN0ZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAkc2NvcGUuY29ubmVjdGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBzZXNzaW9uLm9uKCdzaWduYWwnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgaWYgKGV2ZW50LnR5cGUgPT09ICdzaWduYWw6b3RhZF93aGl0ZWJvYXJkJyAmJiBldmVudC5mcm9tLmNvbm5lY3Rpb25JZCAhPT0gb3BlbnRva1Nlc3Npb24uY29ubmVjdGlvbi5jb25uZWN0aW9uSWQgKSB7XG4gICAgICAgICAgICAgIGlmIChldmVudC5kYXRhID09PSAnb24nKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnNob3dXaGl0ZWJvYXJkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChldmVudC5kYXRhID09PSAnb2ZmJykge1xuICAgICAgICAgICAgICAgICRzY29wZS5zaG93V2hpdGVib2FyZCA9IGZhbHNlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICRzY29wZS4kZW1pdChcIm90TGF5b3V0XCIpO1xuICAgICAgICAgICAgICB9LCAxMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBvcGVudG9rU2Vzc2lvbiA9IHNlc3Npb247XG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gYXR0YWNoIGRhdGEgdG8gc2NvcGVcbiAgICAgICAgJHNjb3BlLnN0cmVhbXMgPSBPVFNlc3Npb24uc3RyZWFtcztcbiAgICAgICAgJHNjb3BlLnB1Ymxpc2hlcnMgPSBPVFNlc3Npb24ucHVibGlzaGVycztcblxuICAgICAgICAvLyBpZiBpJ20gdGhlIHRlYWNoZXIsIG92ZXJ3cml0ZSB0aGlzIGFuZCBwdXQganVzdCBtZSBhcyB0aGUgYmlnIHN0cmVhbVxuICAgICAgICBpZiAoJHNjb3BlLnRlYWNoZXIpIHtcbiAgICAgICAgICAvLyBob3cgZG8gd2Uga25vdyB0aGF0IHdlIGFscmVhZHkgc3RhcnRlZCBwdWJsaXNoaW5nPyFcbiAgICAgICAgICAvLyBUT0RPOiBvbmx5IHRha2Ugb3duZXJzaGlwIGFmdGVyIHdlIGtub3cgd2UgYXJlIHB1Ymxpc2hpbmdcbiAgICAgICAgICBjb25zb2xlLmxvZygnYWJvdXQgdG8gdGFrZSBvd25lcnNoaXAuIHB1Ymxpc2hlcnM6ICcpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKCRzY29wZS5wdWJsaXNoZXJzKTtcbiAgICAgICAgICB0YWtlT3duZXJzaGlwKCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gaWYgaSdtIHRoZSBzdHVkZW50LCBjYWxsIGEgZnVuY3Rpb24gdGhhdCBpdGVyYXRlcyBvdmVyIHRoZSBiaWdTdHJlYW1zIGFuZCBzZXRzIHRoZW0gdXBcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgdXBkYXRlQmlnU3RyZWFtcygpO1xuICAgICAgICB9XG5cbiAgICAgICAgJHNjb3BlLmJpZ1N0cmVhbXMuJG9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAvLyBjYWxsIHRoZSBmdW5jdGlvbiB0aGF0IGl0ZXJhdGVzIG92ZXIgdGhlIGJpZ1N0cmVhbXMgYW5kIHNldHMgdGhlbSB1cFxuICAgICAgICAgIHVwZGF0ZUJpZ1N0cmVhbXMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgIH0pLmVycm9yKGZ1bmN0aW9uKGRhdGEsIHN0YXR1cykge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkFuIGVycm9yIG9jY3VycmVkIHdoaWxlIHJldHJpZXZpbmcgdGhlIGNsYXNzcm9vbSBkYXRhLlwiLCBkYXRhLCBzdGF0dXMpO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB2YXIgdGFrZU93bmVyc2hpcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gdGhlcmUgbWF5IGJlIGEgcmFjZSBjb25kaXRpb24gaGVyZSwgaG93IGRvIHdlIGtub3cgd2hlbiB0aGUgcHVibGlzaGVyIGlzIHJlYWR5P1xuICAgICAgaWYgKCghJHNjb3BlLnB1Ymxpc2hlcnMpIHx8ICRzY29wZS5wdWJsaXNoZXJzLmxlbmd0aCAhPSAxKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUHVibGlzaGVyIHdhcyBub3QgcmVhZHkgaW4gdGltZScpO1xuICAgICAgfVxuXG4gICAgICAvLyBUT0RPOiBhIGJldHRlciB3YXkgb2Yga25vd2luZyB0aGVuIHRoZSBzdHJlYW1JZCBpcyBhdmFpbGFibGUsIHBlcmhhcHMgd2l0aCAkd2F0Y2g/XG4gICAgICBpZiAoJHNjb3BlLnB1Ymxpc2hlcnNbMF0uc3RyZWFtKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCRzY29wZS5wdWJsaXNoZXJzWzBdLnN0cmVhbS5zdHJlYW1JZCk7XG4gICAgICAgICRzY29wZS5iaWdTdHJlYW1zLiRyZW1vdmUoKTtcbiAgICAgICAgJHNjb3BlLmJpZ1N0cmVhbXMuJGFkZCgkc2NvcGUucHVibGlzaGVyc1swXS5zdHJlYW0uc3RyZWFtSWQpO1xuICAgICAgICBjb25zb2xlLmxvZygnb3duZWQgYmlnU3RyZWFtcycpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLnB1Ymxpc2hlcnNbMF0ub24oJ3N0cmVhbUNyZWF0ZWQnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCRzY29wZS5wdWJsaXNoZXJzWzBdLnN0cmVhbS5zdHJlYW1JZCk7XG4gICAgICAgICAgJHNjb3BlLmJpZ1N0cmVhbXMuJHJlbW92ZSgpO1xuICAgICAgICAgICRzY29wZS5iaWdTdHJlYW1zLiRhZGQoJHNjb3BlLnB1Ymxpc2hlcnNbMF0uc3RyZWFtLnN0cmVhbUlkKTtcbiAgICAgICAgICBjb25zb2xlLmxvZygnb3duZWQgYmlnU3RyZWFtcycpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIHVwZGF0ZUJpZ1N0cmVhbXMgPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGZsYXR0ZW5lZCBsaXN0IG9mIGp1c3QgdGhlIHN0cmVhbUlkJ3MgZm9yIHRoZSBiaWcgc3RyZWFtc1xuICAgICAgdmFyIGJpZ1N0cmVhbUxpc3QgPSBbXTtcblxuICAgICAgLy8gdGhpcyBpcyBjYWxsZWQgZm9yIGVhY2ggc3RyZWFtIGluIHRoZSBzZXNzaW9uIChzdWJzY3JpYmVycyArIHB1Ymxpc2hlcilcbiAgICAgIHZhciB1cGRhdGVTdHJlYW0gPSBmdW5jdGlvbihzdHJlYW1JZCkge1xuICAgICAgICBjb25zb2xlLmxvZygnc2VhcmNoaW5nIGZvciAnICsgc3RyZWFtSWQgKyAnIGluJywgYmlnU3RyZWFtTGlzdCk7XG5cbiAgICAgICAgLy8gQkFEISBkb20gcXVlcnlpbmcgZ2Fsb3JlXG4gICAgICAgIHZhciAkZWwgPSAkKCdbc3RyZWFtaWQ9XFwnJytzdHJlYW1JZCsnXFwnXScpO1xuICAgICAgICBpZiAoISRlbC5sZW5ndGgpICRlbCA9ICQoJyNwdWJsaXNoZXInKVxuXG4gICAgICAgIGlmIChiaWdTdHJlYW1MaXN0LmluZGV4T2Yoc3RyZWFtSWQpID49IDApIHtcbiAgICAgICAgICAvLyBzdHJlYW0gc2hvdWxkIGJlIGJpZ1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdtYWtlICcgKyBzdHJlYW1JZCArICcgYmlnLicpO1xuICAgICAgICAgICRlbC5hZGRDbGFzcygnT1RfYmlnJyk7XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBzdHJlYW0gc2hvdWxkIG5vdCBiZSBiaWdcbiAgICAgICAgICBjb25zb2xlLmxvZygnbWFrZSAnICsgc3RyZWFtSWQgKyAnIHNtYWxsLicpO1xuICAgICAgICAgICRlbC5yZW1vdmVDbGFzcygnT1RfYmlnJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coT1RTZXNzaW9uLnNlc3Npb24uc3RyZWFtcyk7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJHNjb3BlLiRlbWl0KFwib3RMYXlvdXRcIik7XG4gICAgICAgIH0sIDEwKTtcbiAgICAgIH1cblxuICAgICAgLy8gZ2VuZXJhdGUgYmlnU3RyZWFtTGlzdFxuICAgICAgJHNjb3BlLmJpZ1N0cmVhbXMuJGdldEluZGV4KCkuZm9yRWFjaChmdW5jdGlvbihrZXksIHN0cmVhbUlkKSB7XG4gICAgICAgIGJpZ1N0cmVhbUxpc3QucHVzaCgkc2NvcGUuYmlnU3RyZWFtc1trZXldKTtcbiAgICAgIH0pO1xuICAgICAgY29uc29sZS5sb2coJ3Njb3BlIGJpZ1N0cmVhbXMgZm9yIHVkcGF0ZScsICRzY29wZS5iaWdTdHJlYW1zKTtcbiAgICAgIGNvbnNvbGUubG9nKCdiaWcgc3RyZWFtIGxpc3QgZm9yIHVwZGF0ZScsIGJpZ1N0cmVhbUxpc3QpO1xuXG4gICAgICAvLyBpdGVyYXRlIG92ZXIgYWxsIGtub3duIHN0cmVhbXMgYW5kIGNhbGwgdXBkYXRlU3RyZWFtXG4gICAgICAkc2NvcGUuc3RyZWFtcy5mb3JFYWNoKGZ1bmN0aW9uKHN0cmVhbSwgaW5kZXgpIHtcbiAgICAgICAgdXBkYXRlU3RyZWFtKHN0cmVhbS5zdHJlYW1JZCk7XG4gICAgICB9KTtcblxuICAgICAgLy8gVE9ETzogYSBiZXR0ZXIgd2F5IG9mIGtub3dpbmcgdGhlbiB0aGUgc3RyZWFtSWQgaXMgYXZhaWxhYmxlLCBwZXJoYXBzIHdpdGggJHdhdGNoP1xuICAgICAgaWYgKCRzY29wZS5wdWJsaXNoZXJzWzBdLnN0cmVhbSkge1xuICAgICAgICB1cGRhdGVTdHJlYW0oJHNjb3BlLnB1Ymxpc2hlcnNbMF0uc3RyZWFtLnN0cmVhbUlkKTtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAkc2NvcGUuJGVtaXQoXCJvdExheW91dFwiKTtcbiAgICAgICAgfSwgMTApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLnB1Ymxpc2hlcnNbMF0ub24oJ3N0cmVhbUNyZWF0ZWQnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgIHVwZGF0ZVN0cmVhbSgkc2NvcGUucHVibGlzaGVyc1swXS5zdHJlYW0uc3RyZWFtSWQpO1xuICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkc2NvcGUuJGVtaXQoXCJvdExheW91dFwiKTtcbiAgICAgICAgICB9LCAxMCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgfTtcblxuICAgICRzY29wZS5sb2NrZWQgPSB0cnVlO1xuICAgICRzY29wZS4kd2F0Y2goJ2xvY2tlZCcsIGZ1bmN0aW9uKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgY29uc29sZS5sb2coJ2xvY2tlZCBnb2luZyBmcm9tICcgKyBvbGRWYWx1ZSArICcgdG8gJyArIG5ld1ZhbHVlKTtcbiAgICAgIC8vIFRPRE86IGNoZWNrIGlmIHdlIGFyZSB0aGUgc3R1ZGVudCBvZiB0aGUgdGVhY2hlciwgaWYgb25seSB0aGUgdGVhY2hlciBwcmVzc2VzIHRoZSBsb2NrIHRoaXMgZG9lc24ndCBtYXR0ZXJcbiAgICAgIGlmIChuZXdWYWx1ZSA9PSB0cnVlKSB7XG4gICAgICAgIHRha2VPd25lcnNoaXAoKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIHRoaXMgaXMgcHJvYmFibHkgdGhlIHdyb25nIHBsYWNlIHRvIGRvIHRoaXMsIG1heWJlIHB1dCB0aGlzIGluIGEgZGlyZWN0aXZlXG4gICAgYW5ndWxhci5lbGVtZW50KCR3aW5kb3cpLmJpbmQoJ3Jlc2l6ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgLy8gQkFEISBhY2Nlc3NpbmcgRE9NIGRpcmVjdGx5XG4gICAgICAvLyBhbHNvIHByb2JhYmx5IHdhbnQgdG8gdGhyb3RsZSB0aGlzXG4gICAgICAkKCcuY2xhc3Nyb29tJykuaGVpZ2h0KCQod2luZG93KS5oZWlnaHQoKSAtICgkKCcjaGVhZGVyJykuaGVpZ2h0KCkgKyAkKCcjY291cnNlLWluZm8nKS5oZWlnaHQoKSArICQoJyNwYWdlRm9vdGVyJykuaGVpZ2h0KCkpKTtcbiAgICAgICRzY29wZS4kZW1pdCgnb3RMYXlvdXQnKTtcbiAgICB9KTtcblxuICAgICRzY29wZS50b2dnbGVXaGl0ZWJvYXJkID0gZnVuY3Rpb24oKSB7XG4gICAgICAkc2NvcGUuc2hvd1doaXRlYm9hcmQgPSAhJHNjb3BlLnNob3dXaGl0ZWJvYXJkO1xuICAgICAgaWYgKCRzY29wZS5zaG93V2hpdGVib2FyZCkge1xuICAgICAgICBjb25zb2xlLmxvZygnc2hvd2luZyB3aGl0ZWJvYXJkJyk7XG4gICAgICAgIG9wZW50b2tTZXNzaW9uLnNpZ25hbCh7XG4gICAgICAgICAgdHlwZTogXCJvdGFkX3doaXRlYm9hcmRcIixcbiAgICAgICAgICBkYXRhOiBcIm9uXCJcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZygnaGlkaW5nIHdoaXRlYm9hcmQnKTtcbiAgICAgICAgb3BlbnRva1Nlc3Npb24uc2lnbmFsKHtcbiAgICAgICAgICB0eXBlOiBcIm90YWRfd2hpdGVib2FyZFwiLFxuICAgICAgICAgIGRhdGE6IFwib2ZmXCJcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJHNjb3BlLiRlbWl0KFwib3RMYXlvdXRcIik7XG4gICAgICB9LCAxMCk7XG4gICAgfTtcbiAgfV0pO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBhbmd1bGFyLm1vZHVsZSgnYXBwLmhvbWUnLCBbJ29wZW50b2snLCAnZmlyZWJhc2UnLCAnb3BlbnRvay13aGl0ZWJvYXJkJ10pO1xuXG5yZXF1aXJlKCcuL09wZW5Ub2tDdHJsJyk7XG4iLCJcbmFuZ3VsYXIubW9kdWxlKCdhcHAnLCBbXG4gIHJlcXVpcmUoJy4vaG9tZScpLm5hbWVcbl0pO1xuXG4iXX0=
