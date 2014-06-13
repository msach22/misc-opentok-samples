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

    var bigStreamsRef = new Firebase("https://otaudiodetect.firebaseio.com/classroom");
    $scope.bigStreams = $firebase(bigStreamsRef);

    // 1. load classroom data from firebase
    // 2. load session information from server
    // 3. connect to opentok
    $scope.bigStreams.$on('loaded', function() {
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

    // $scope.toggleWhiteboard = function() {
    //   $scope.showWhiteboard = ! $scope.showWhiteboard;
    //   setTimeout(function () {
    //     $scope.$emit("otLayout");
    //   }, 10);
    // };
  }]);

},{}],2:[function(require,module,exports){
module.exports = angular.module('app.home', ['opentok', 'firebase']);

require('./OpenTokCtrl');

},{"./OpenTokCtrl":1}],3:[function(require,module,exports){

angular.module('app', [
  require('./home').name
]);


},{"./home":2}]},{},[3])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYW5rdXIvRGV2ZWxvcGVyL3dlYnJ0Y2V4cG8xNC1hdWRpb2RldGVjdGlvbi9ub2RlX21vZHVsZXMvcGhvLWRldnN0YWNrL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYW5rdXIvRGV2ZWxvcGVyL3dlYnJ0Y2V4cG8xNC1hdWRpb2RldGVjdGlvbi9zcmMvc2NyaXB0cy9ob21lL09wZW5Ub2tDdHJsLmpzIiwiL1VzZXJzL2Fua3VyL0RldmVsb3Blci93ZWJydGNleHBvMTQtYXVkaW9kZXRlY3Rpb24vc3JjL3NjcmlwdHMvaG9tZS9pbmRleC5qcyIsIi9Vc2Vycy9hbmt1ci9EZXZlbG9wZXIvd2VicnRjZXhwbzE0LWF1ZGlvZGV0ZWN0aW9uL3NyYy9zY3JpcHRzL21haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOU1BO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5ob21lJylcbiAgLmNvbnRyb2xsZXIoJ09wZW5Ub2tDdHJsJywgWyckc2NvcGUnLCAnT1RTZXNzaW9uJywgJyRodHRwJywgJyR3aW5kb3cnLCAnJGZpcmViYXNlJywgJyRhdHRycycsXG4gIGZ1bmN0aW9uKCRzY29wZSwgT1RTZXNzaW9uLCAkaHR0cCwgJHdpbmRvdywgJGZpcmViYXNlLCAkYXR0cnMpIHtcblxuICAgIHZhciBNQVhfQklHID0gMSxcbiAgICAgICAgTUlOX0JJRyA9IDE7XG5cbiAgICBpZiAoJGF0dHJzLnRlYWNoZXIgPT09ICd0cnVlJykge1xuICAgICAgJHNjb3BlLnRlYWNoZXIgPSB0cnVlO1xuICAgICAgY29uc29sZS5sb2coJ2kgYW0gdGhlIHRlYWNoZXInKTtcbiAgICB9IGVsc2Uge1xuICAgICAgJHNjb3BlLnRlYWNoZXIgPSBmYWxzZTtcbiAgICAgIGNvbnNvbGUubG9nKCdpIGFtIGEgc3R1ZGVudCcpO1xuICAgIH1cblxuICAgIHZhciBiaWdTdHJlYW1zUmVmID0gbmV3IEZpcmViYXNlKFwiaHR0cHM6Ly9vdGF1ZGlvZGV0ZWN0LmZpcmViYXNlaW8uY29tL2NsYXNzcm9vbVwiKTtcbiAgICAkc2NvcGUuYmlnU3RyZWFtcyA9ICRmaXJlYmFzZShiaWdTdHJlYW1zUmVmKTtcblxuICAgIC8vIDEuIGxvYWQgY2xhc3Nyb29tIGRhdGEgZnJvbSBmaXJlYmFzZVxuICAgIC8vIDIuIGxvYWQgc2Vzc2lvbiBpbmZvcm1hdGlvbiBmcm9tIHNlcnZlclxuICAgIC8vIDMuIGNvbm5lY3QgdG8gb3BlbnRva1xuICAgICRzY29wZS5iaWdTdHJlYW1zLiRvbignbG9hZGVkJywgZnVuY3Rpb24oKSB7XG4gICAgICAkaHR0cC5nZXQoJy9jbGFzc3Jvb20nKS5zdWNjZXNzKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgT1RTZXNzaW9uLmluaXQoZGF0YS5hcGlLZXksIGRhdGEuc2Vzc2lvbklkLCBkYXRhLnRva2VuLCBmdW5jdGlvbihlcnIsIHNlc3Npb24pIHtcbiAgICAgICAgICBpZiAoZXJyKSB0aHJvdyBlcnI7XG5cblxuICAgICAgICAgIC8vIE9wZW5Ub2sgRXZlbnRzXG4gICAgICAgICAgc2Vzc2lvbi5vbih7XG5cbiAgICAgICAgICAgIHN0YXJ0ZWRUb1RhbGs6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzdGFydGVkVG9UYWxrIGV2ZW50IGZpcmVkJyk7XG4gICAgICAgICAgICAgIGV2ZW50LnN1YnNjcmliZXJzLmZvckVhY2goZnVuY3Rpb24oc3Vic2NyaWJlcikge1xuICAgICAgICAgICAgICAgIC8vIGlmIG5vdCBsb2NrZWQgYW5kIGkgYW0gYSB0ZWFjaGVyXG4gICAgICAgICAgICAgICAgaWYgKCEkc2NvcGUubG9ja2VkICYmICRzY29wZS50ZWFjaGVyKSB7XG4gICAgICAgICAgICAgICAgICAvLyBhZGQgdGhlIHN0cmVhbSB0byBiaWdTdHJlYW1zXG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnU1BFQUtJTkc6Jywgc3Vic2NyaWJlci5zdHJlYW1JZCk7XG5cbiAgICAgICAgICAgICAgICAgIC8vIHJlbW92ZSB0aGUgb2xkZXN0IGlmIHdlIGRvbid0IHdhbnQgYW55IG1vcmUgYmlnXG4gICAgICAgICAgICAgICAgICB2YXIga2V5cyA9ICRzY29wZS5iaWdTdHJlYW1zLiRnZXRJbmRleCgpO1xuICAgICAgICAgICAgICAgICAgaWYgKGtleXMubGVuZ3RoID49IE1BWF9CSUcpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmJpZ1N0cmVhbXMuJHJlbW92ZShrZXlzWzBdKTtcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgJHNjb3BlLmJpZ1N0cmVhbXMuJGFkZChzdWJzY3JpYmVyLnN0cmVhbUlkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgc3RvcHBlZFRvVGFsazogZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3N0b3BwZWRUb1RhbGsgZXZlbnQgZmlyZWQnKTtcbiAgICAgICAgICAgICAgZXZlbnQuc3Vic2NyaWJlcnMuZm9yRWFjaChmdW5jdGlvbihzdWJzY3JpYmVyKSB7XG4gICAgICAgICAgICAgICAgLy8gaWYgbm90IGxvY2tlZCBhbmQgaSBhbSBhIHRlYWNoZXJcbiAgICAgICAgICAgICAgICBpZiAoISRzY29wZS5sb2NrZWQgJiYgJHNjb3BlLnRlYWNoZXIpIHtcbiAgICAgICAgICAgICAgICAgIHZhciBrZXlzID0gJHNjb3BlLmJpZ1N0cmVhbXMuJGdldEluZGV4KCk7XG4gICAgICAgICAgICAgICAgICAvLyBpZiB3ZSBhcmUgYWxyZWFkeSBhdCB0aGUgbWluaW11bSwgZG9uJ3QgY29udGludWUgcmVtb3ZpbmcgYmlnc1xuICAgICAgICAgICAgICAgICAgaWYgKGtleXMubGVuZ3RoIDw9IE1JTl9CSUcpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3Vic2NyaWJlci5zdHJlYW1JZCA9PSAkc2NvcGUuYmlnU3RyZWFtc1trZXldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1NUT1BQRUQgU1BFQUtJTkc6Jywgc3Vic2NyaWJlci5zdHJlYW1JZCk7XG4gICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmJpZ1N0cmVhbXMuJHJlbW92ZShrZXkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgc3RyZWFtQ3JlYXRlZDogZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgICAgdXBkYXRlQmlnU3RyZWFtcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIGF0dGFjaCBkYXRhIHRvIHNjb3BlXG4gICAgICAgICRzY29wZS5zdHJlYW1zID0gT1RTZXNzaW9uLnN0cmVhbXM7XG4gICAgICAgICRzY29wZS5wdWJsaXNoZXJzID0gT1RTZXNzaW9uLnB1Ymxpc2hlcnM7XG5cbiAgICAgICAgLy8gaWYgaSdtIHRoZSB0ZWFjaGVyLCBvdmVyd3JpdGUgdGhpcyBhbmQgcHV0IGp1c3QgbWUgYXMgdGhlIGJpZyBzdHJlYW1cbiAgICAgICAgaWYgKCRzY29wZS50ZWFjaGVyKSB7XG4gICAgICAgICAgLy8gaG93IGRvIHdlIGtub3cgdGhhdCB3ZSBhbHJlYWR5IHN0YXJ0ZWQgcHVibGlzaGluZz8hXG4gICAgICAgICAgLy8gVE9ETzogb25seSB0YWtlIG93bmVyc2hpcCBhZnRlciB3ZSBrbm93IHdlIGFyZSBwdWJsaXNoaW5nXG4gICAgICAgICAgY29uc29sZS5sb2coJ2Fib3V0IHRvIHRha2Ugb3duZXJzaGlwLiBwdWJsaXNoZXJzOiAnKTtcbiAgICAgICAgICBjb25zb2xlLmxvZygkc2NvcGUucHVibGlzaGVycyk7XG4gICAgICAgICAgdGFrZU93bmVyc2hpcCgpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGlmIGknbSB0aGUgc3R1ZGVudCwgY2FsbCBhIGZ1bmN0aW9uIHRoYXQgaXRlcmF0ZXMgb3ZlciB0aGUgYmlnU3RyZWFtcyBhbmQgc2V0cyB0aGVtIHVwXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHVwZGF0ZUJpZ1N0cmVhbXMoKTtcbiAgICAgICAgfVxuXG4gICAgICAgICRzY29wZS5iaWdTdHJlYW1zLiRvbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgLy8gY2FsbCB0aGUgZnVuY3Rpb24gdGhhdCBpdGVyYXRlcyBvdmVyIHRoZSBiaWdTdHJlYW1zIGFuZCBzZXRzIHRoZW0gdXBcbiAgICAgICAgICB1cGRhdGVCaWdTdHJlYW1zKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICB9KS5lcnJvcihmdW5jdGlvbihkYXRhLCBzdGF0dXMpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJBbiBlcnJvciBvY2N1cnJlZCB3aGlsZSByZXRyaWV2aW5nIHRoZSBjbGFzc3Jvb20gZGF0YS5cIiwgZGF0YSwgc3RhdHVzKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdmFyIHRha2VPd25lcnNoaXAgPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIHRoZXJlIG1heSBiZSBhIHJhY2UgY29uZGl0aW9uIGhlcmUsIGhvdyBkbyB3ZSBrbm93IHdoZW4gdGhlIHB1Ymxpc2hlciBpcyByZWFkeT9cbiAgICAgIGlmICgoISRzY29wZS5wdWJsaXNoZXJzKSB8fCAkc2NvcGUucHVibGlzaGVycy5sZW5ndGggIT0gMSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1B1Ymxpc2hlciB3YXMgbm90IHJlYWR5IGluIHRpbWUnKTtcbiAgICAgIH1cblxuICAgICAgLy8gVE9ETzogYSBiZXR0ZXIgd2F5IG9mIGtub3dpbmcgdGhlbiB0aGUgc3RyZWFtSWQgaXMgYXZhaWxhYmxlLCBwZXJoYXBzIHdpdGggJHdhdGNoP1xuICAgICAgaWYgKCRzY29wZS5wdWJsaXNoZXJzWzBdLnN0cmVhbSkge1xuICAgICAgICBjb25zb2xlLmxvZygkc2NvcGUucHVibGlzaGVyc1swXS5zdHJlYW0uc3RyZWFtSWQpO1xuICAgICAgICAkc2NvcGUuYmlnU3RyZWFtcy4kcmVtb3ZlKCk7XG4gICAgICAgICRzY29wZS5iaWdTdHJlYW1zLiRhZGQoJHNjb3BlLnB1Ymxpc2hlcnNbMF0uc3RyZWFtLnN0cmVhbUlkKTtcbiAgICAgICAgY29uc29sZS5sb2coJ293bmVkIGJpZ1N0cmVhbXMnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5wdWJsaXNoZXJzWzBdLm9uKCdzdHJlYW1DcmVhdGVkJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygkc2NvcGUucHVibGlzaGVyc1swXS5zdHJlYW0uc3RyZWFtSWQpO1xuICAgICAgICAgICRzY29wZS5iaWdTdHJlYW1zLiRyZW1vdmUoKTtcbiAgICAgICAgICAkc2NvcGUuYmlnU3RyZWFtcy4kYWRkKCRzY29wZS5wdWJsaXNoZXJzWzBdLnN0cmVhbS5zdHJlYW1JZCk7XG4gICAgICAgICAgY29uc29sZS5sb2coJ293bmVkIGJpZ1N0cmVhbXMnKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHZhciB1cGRhdGVCaWdTdHJlYW1zID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBmbGF0dGVuZWQgbGlzdCBvZiBqdXN0IHRoZSBzdHJlYW1JZCdzIGZvciB0aGUgYmlnIHN0cmVhbXNcbiAgICAgIHZhciBiaWdTdHJlYW1MaXN0ID0gW107XG5cbiAgICAgIC8vIHRoaXMgaXMgY2FsbGVkIGZvciBlYWNoIHN0cmVhbSBpbiB0aGUgc2Vzc2lvbiAoc3Vic2NyaWJlcnMgKyBwdWJsaXNoZXIpXG4gICAgICB2YXIgdXBkYXRlU3RyZWFtID0gZnVuY3Rpb24oc3RyZWFtSWQpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3NlYXJjaGluZyBmb3IgJyArIHN0cmVhbUlkICsgJyBpbicsIGJpZ1N0cmVhbUxpc3QpO1xuXG4gICAgICAgIC8vIEJBRCEgZG9tIHF1ZXJ5aW5nIGdhbG9yZVxuICAgICAgICB2YXIgJGVsID0gJCgnW3N0cmVhbWlkPVxcJycrc3RyZWFtSWQrJ1xcJ10nKTtcbiAgICAgICAgaWYgKCEkZWwubGVuZ3RoKSAkZWwgPSAkKCcjcHVibGlzaGVyJylcblxuICAgICAgICBpZiAoYmlnU3RyZWFtTGlzdC5pbmRleE9mKHN0cmVhbUlkKSA+PSAwKSB7XG4gICAgICAgICAgLy8gc3RyZWFtIHNob3VsZCBiZSBiaWdcbiAgICAgICAgICBjb25zb2xlLmxvZygnbWFrZSAnICsgc3RyZWFtSWQgKyAnIGJpZy4nKTtcbiAgICAgICAgICAkZWwuYWRkQ2xhc3MoJ09UX2JpZycpO1xuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gc3RyZWFtIHNob3VsZCBub3QgYmUgYmlnXG4gICAgICAgICAgY29uc29sZS5sb2coJ21ha2UgJyArIHN0cmVhbUlkICsgJyBzbWFsbC4nKTtcbiAgICAgICAgICAkZWwucmVtb3ZlQ2xhc3MoJ09UX2JpZycpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKE9UU2Vzc2lvbi5zZXNzaW9uLnN0cmVhbXMpO1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRzY29wZS4kZW1pdChcIm90TGF5b3V0XCIpO1xuICAgICAgICB9LCAxMCk7XG4gICAgICB9XG5cbiAgICAgIC8vIGdlbmVyYXRlIGJpZ1N0cmVhbUxpc3RcbiAgICAgICRzY29wZS5iaWdTdHJlYW1zLiRnZXRJbmRleCgpLmZvckVhY2goZnVuY3Rpb24oa2V5LCBzdHJlYW1JZCkge1xuICAgICAgICBiaWdTdHJlYW1MaXN0LnB1c2goJHNjb3BlLmJpZ1N0cmVhbXNba2V5XSk7XG4gICAgICB9KTtcbiAgICAgIGNvbnNvbGUubG9nKCdzY29wZSBiaWdTdHJlYW1zIGZvciB1ZHBhdGUnLCAkc2NvcGUuYmlnU3RyZWFtcyk7XG4gICAgICBjb25zb2xlLmxvZygnYmlnIHN0cmVhbSBsaXN0IGZvciB1cGRhdGUnLCBiaWdTdHJlYW1MaXN0KTtcblxuICAgICAgLy8gaXRlcmF0ZSBvdmVyIGFsbCBrbm93biBzdHJlYW1zIGFuZCBjYWxsIHVwZGF0ZVN0cmVhbVxuICAgICAgJHNjb3BlLnN0cmVhbXMuZm9yRWFjaChmdW5jdGlvbihzdHJlYW0sIGluZGV4KSB7XG4gICAgICAgIHVwZGF0ZVN0cmVhbShzdHJlYW0uc3RyZWFtSWQpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFRPRE86IGEgYmV0dGVyIHdheSBvZiBrbm93aW5nIHRoZW4gdGhlIHN0cmVhbUlkIGlzIGF2YWlsYWJsZSwgcGVyaGFwcyB3aXRoICR3YXRjaD9cbiAgICAgIGlmICgkc2NvcGUucHVibGlzaGVyc1swXS5zdHJlYW0pIHtcbiAgICAgICAgdXBkYXRlU3RyZWFtKCRzY29wZS5wdWJsaXNoZXJzWzBdLnN0cmVhbS5zdHJlYW1JZCk7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJHNjb3BlLiRlbWl0KFwib3RMYXlvdXRcIik7XG4gICAgICAgIH0sIDEwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5wdWJsaXNoZXJzWzBdLm9uKCdzdHJlYW1DcmVhdGVkJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICB1cGRhdGVTdHJlYW0oJHNjb3BlLnB1Ymxpc2hlcnNbMF0uc3RyZWFtLnN0cmVhbUlkKTtcbiAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJHNjb3BlLiRlbWl0KFwib3RMYXlvdXRcIik7XG4gICAgICAgICAgfSwgMTApO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgIH07XG5cbiAgICAkc2NvcGUubG9ja2VkID0gdHJ1ZTtcbiAgICAkc2NvcGUuJHdhdGNoKCdsb2NrZWQnLCBmdW5jdGlvbihuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdsb2NrZWQgZ29pbmcgZnJvbSAnICsgb2xkVmFsdWUgKyAnIHRvICcgKyBuZXdWYWx1ZSk7XG4gICAgICAvLyBUT0RPOiBjaGVjayBpZiB3ZSBhcmUgdGhlIHN0dWRlbnQgb2YgdGhlIHRlYWNoZXIsIGlmIG9ubHkgdGhlIHRlYWNoZXIgcHJlc3NlcyB0aGUgbG9jayB0aGlzIGRvZXNuJ3QgbWF0dGVyXG4gICAgICBpZiAobmV3VmFsdWUgPT0gdHJ1ZSkge1xuICAgICAgICB0YWtlT3duZXJzaGlwKCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyB0aGlzIGlzIHByb2JhYmx5IHRoZSB3cm9uZyBwbGFjZSB0byBkbyB0aGlzLCBtYXliZSBwdXQgdGhpcyBpbiBhIGRpcmVjdGl2ZVxuICAgIGFuZ3VsYXIuZWxlbWVudCgkd2luZG93KS5iaW5kKCdyZXNpemUnLCBmdW5jdGlvbigpIHtcbiAgICAgIC8vIEJBRCEgYWNjZXNzaW5nIERPTSBkaXJlY3RseVxuICAgICAgLy8gYWxzbyBwcm9iYWJseSB3YW50IHRvIHRocm90bGUgdGhpc1xuICAgICAgJCgnLmNsYXNzcm9vbScpLmhlaWdodCgkKHdpbmRvdykuaGVpZ2h0KCkgLSAoJCgnI2hlYWRlcicpLmhlaWdodCgpICsgJCgnI2NvdXJzZS1pbmZvJykuaGVpZ2h0KCkgKyAkKCcjcGFnZUZvb3RlcicpLmhlaWdodCgpKSk7XG4gICAgICAkc2NvcGUuJGVtaXQoJ290TGF5b3V0Jyk7XG4gICAgfSk7XG5cbiAgICAvLyAkc2NvcGUudG9nZ2xlV2hpdGVib2FyZCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vICAgJHNjb3BlLnNob3dXaGl0ZWJvYXJkID0gISAkc2NvcGUuc2hvd1doaXRlYm9hcmQ7XG4gICAgLy8gICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAvLyAgICAgJHNjb3BlLiRlbWl0KFwib3RMYXlvdXRcIik7XG4gICAgLy8gICB9LCAxMCk7XG4gICAgLy8gfTtcbiAgfV0pO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBhbmd1bGFyLm1vZHVsZSgnYXBwLmhvbWUnLCBbJ29wZW50b2snLCAnZmlyZWJhc2UnXSk7XG5cbnJlcXVpcmUoJy4vT3BlblRva0N0cmwnKTtcbiIsIlxuYW5ndWxhci5tb2R1bGUoJ2FwcCcsIFtcbiAgcmVxdWlyZSgnLi9ob21lJykubmFtZVxuXSk7XG5cbiJdfQ==
