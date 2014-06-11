(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
angular.module('app.home')
  .controller('OpenTokCtrl', ['$scope', 'OTSession', '$http', '$window', '$firebase', '$attrs',
  function($scope, OTSession, $http, $window, $firebase, $attrs) {

    var MAX_BIG = 1;

    if ($attrs.teacher === 'true') {
      $scope.teacher = true;
    } else {
      $scope.teacher = false;
    }

    var bigStreamsRef = new Firebase("https://otaudiodetect.firebaseio.com/classroom");
    $scope.bigStreams = $firebase(bigStreamsRef);
    $scope.bigStreams.$on('loaded', function() {
      // if i'm the teacher, overwrite this and put just me as the big stream
      if ($scope.teacher) {
        takeOwnership();
      }
      // if i'm the student, call a function that iterates over the bigStreams and sets them up
      else {
        updateBigStreams();
      }
    });
    $scope.bigStreams.$on('change', function() {
      // call the function that iterates over the bigStreams and sets them up
      updateBigStreams();
    });

    var takeOwnership = function() {
      // there may be a race condition here, how do we know when the publisher is ready?
      if ($scope.publishers.length != 1) {
        throw new Error('Publisher was not ready in time');
      }

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
        $scope.$emit("otLayout");
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

      if ($scope.publishers[0].stream) {
        updateStream($scope.publishers[0].stream.streamId);
        $scope.$emit("otLayout");
      } else {
        $scope.publishers[0].on('streamCreated', function(event) {
          updateStream($scope.publishers[0].stream.streamId);
          $scope.$emit("otLayout");
        });
      }

      $scope.$emit("otLayout");

    };

    $scope.locked = true;
    $scope.$watch('locked', function(newValue, oldValue) {
      console.log('locked going from ' + oldValue + ' to ' + newValue);
      if (newValue == true) {
        takeOwnership();
      }
    });

    $http.get('/classroom').success(function(data) {
      OTSession.init(data.apiKey, data.sessionId, data.token, function(err, session) {
        if (err) throw err;

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
                $scope.bigStreams.$getIndex().forEach(function(key) {
                  if (subscriber.streamId == $scope.bigStreams[key]) {
                    console.log('STOPPED SPEAKING:', subscriber.streamId);
                    $scope.bigStreams.$remove(key);
                  }
                });
              }
            });
          }
        });

      });

      $scope.streams = OTSession.streams;
      $scope.publishers = OTSession.publishers;

    }).error(function(data, status) {
      console.log("An error occurred while retrieving the classroom data.", data, status);
    });

    // this is probably the wrong place to do this, maybe put this in a directive
    angular.element($window).bind('resize', function() {
      // BAD! accessing DOM directly
      // also probably want to throtle this
      $('.classroom').height($(window).height() - ($('#header').height() + $('#course-info').height() + $('#pageFooter').height()));
      $scope.$emit('otLayout');
    });
  }]);

},{}],2:[function(require,module,exports){
module.exports = angular.module('app.home', ['opentok', 'firebase']);

require('./OpenTokCtrl');

},{"./OpenTokCtrl":1}],3:[function(require,module,exports){

angular.module('app', [
  require('./home').name
]);


},{"./home":2}]},{},[3])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYW5rdXIvRGV2ZWxvcGVyL3dlYnJ0Y2V4cG8xNC1hdWRpb2RldGVjdGlvbi9ub2RlX21vZHVsZXMvcGhvLWRldnN0YWNrL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYW5rdXIvRGV2ZWxvcGVyL3dlYnJ0Y2V4cG8xNC1hdWRpb2RldGVjdGlvbi9zcmMvc2NyaXB0cy9ob21lL09wZW5Ub2tDdHJsLmpzIiwiL1VzZXJzL2Fua3VyL0RldmVsb3Blci93ZWJydGNleHBvMTQtYXVkaW9kZXRlY3Rpb24vc3JjL3NjcmlwdHMvaG9tZS9pbmRleC5qcyIsIi9Vc2Vycy9hbmt1ci9EZXZlbG9wZXIvd2VicnRjZXhwbzE0LWF1ZGlvZGV0ZWN0aW9uL3NyYy9zY3JpcHRzL21haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdktBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5ob21lJylcbiAgLmNvbnRyb2xsZXIoJ09wZW5Ub2tDdHJsJywgWyckc2NvcGUnLCAnT1RTZXNzaW9uJywgJyRodHRwJywgJyR3aW5kb3cnLCAnJGZpcmViYXNlJywgJyRhdHRycycsXG4gIGZ1bmN0aW9uKCRzY29wZSwgT1RTZXNzaW9uLCAkaHR0cCwgJHdpbmRvdywgJGZpcmViYXNlLCAkYXR0cnMpIHtcblxuICAgIHZhciBNQVhfQklHID0gMTtcblxuICAgIGlmICgkYXR0cnMudGVhY2hlciA9PT0gJ3RydWUnKSB7XG4gICAgICAkc2NvcGUudGVhY2hlciA9IHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgICRzY29wZS50ZWFjaGVyID0gZmFsc2U7XG4gICAgfVxuXG4gICAgdmFyIGJpZ1N0cmVhbXNSZWYgPSBuZXcgRmlyZWJhc2UoXCJodHRwczovL290YXVkaW9kZXRlY3QuZmlyZWJhc2Vpby5jb20vY2xhc3Nyb29tXCIpO1xuICAgICRzY29wZS5iaWdTdHJlYW1zID0gJGZpcmViYXNlKGJpZ1N0cmVhbXNSZWYpO1xuICAgICRzY29wZS5iaWdTdHJlYW1zLiRvbignbG9hZGVkJywgZnVuY3Rpb24oKSB7XG4gICAgICAvLyBpZiBpJ20gdGhlIHRlYWNoZXIsIG92ZXJ3cml0ZSB0aGlzIGFuZCBwdXQganVzdCBtZSBhcyB0aGUgYmlnIHN0cmVhbVxuICAgICAgaWYgKCRzY29wZS50ZWFjaGVyKSB7XG4gICAgICAgIHRha2VPd25lcnNoaXAoKTtcbiAgICAgIH1cbiAgICAgIC8vIGlmIGknbSB0aGUgc3R1ZGVudCwgY2FsbCBhIGZ1bmN0aW9uIHRoYXQgaXRlcmF0ZXMgb3ZlciB0aGUgYmlnU3RyZWFtcyBhbmQgc2V0cyB0aGVtIHVwXG4gICAgICBlbHNlIHtcbiAgICAgICAgdXBkYXRlQmlnU3RyZWFtcygpO1xuICAgICAgfVxuICAgIH0pO1xuICAgICRzY29wZS5iaWdTdHJlYW1zLiRvbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAvLyBjYWxsIHRoZSBmdW5jdGlvbiB0aGF0IGl0ZXJhdGVzIG92ZXIgdGhlIGJpZ1N0cmVhbXMgYW5kIHNldHMgdGhlbSB1cFxuICAgICAgdXBkYXRlQmlnU3RyZWFtcygpO1xuICAgIH0pO1xuXG4gICAgdmFyIHRha2VPd25lcnNoaXAgPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIHRoZXJlIG1heSBiZSBhIHJhY2UgY29uZGl0aW9uIGhlcmUsIGhvdyBkbyB3ZSBrbm93IHdoZW4gdGhlIHB1Ymxpc2hlciBpcyByZWFkeT9cbiAgICAgIGlmICgkc2NvcGUucHVibGlzaGVycy5sZW5ndGggIT0gMSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1B1Ymxpc2hlciB3YXMgbm90IHJlYWR5IGluIHRpbWUnKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCRzY29wZS5wdWJsaXNoZXJzWzBdLnN0cmVhbSkge1xuICAgICAgICBjb25zb2xlLmxvZygkc2NvcGUucHVibGlzaGVyc1swXS5zdHJlYW0uc3RyZWFtSWQpO1xuICAgICAgICAkc2NvcGUuYmlnU3RyZWFtcy4kcmVtb3ZlKCk7XG4gICAgICAgICRzY29wZS5iaWdTdHJlYW1zLiRhZGQoJHNjb3BlLnB1Ymxpc2hlcnNbMF0uc3RyZWFtLnN0cmVhbUlkKTtcbiAgICAgICAgY29uc29sZS5sb2coJ293bmVkIGJpZ1N0cmVhbXMnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5wdWJsaXNoZXJzWzBdLm9uKCdzdHJlYW1DcmVhdGVkJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygkc2NvcGUucHVibGlzaGVyc1swXS5zdHJlYW0uc3RyZWFtSWQpO1xuICAgICAgICAgICRzY29wZS5iaWdTdHJlYW1zLiRyZW1vdmUoKTtcbiAgICAgICAgICAkc2NvcGUuYmlnU3RyZWFtcy4kYWRkKCRzY29wZS5wdWJsaXNoZXJzWzBdLnN0cmVhbS5zdHJlYW1JZCk7XG4gICAgICAgICAgY29uc29sZS5sb2coJ293bmVkIGJpZ1N0cmVhbXMnKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHZhciB1cGRhdGVCaWdTdHJlYW1zID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBmbGF0dGVuZWQgbGlzdCBvZiBqdXN0IHRoZSBzdHJlYW1JZCdzIGZvciB0aGUgYmlnIHN0cmVhbXNcbiAgICAgIHZhciBiaWdTdHJlYW1MaXN0ID0gW107XG5cbiAgICAgIC8vIHRoaXMgaXMgY2FsbGVkIGZvciBlYWNoIHN0cmVhbSBpbiB0aGUgc2Vzc2lvbiAoc3Vic2NyaWJlcnMgKyBwdWJsaXNoZXIpXG4gICAgICB2YXIgdXBkYXRlU3RyZWFtID0gZnVuY3Rpb24oc3RyZWFtSWQpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3NlYXJjaGluZyBmb3IgJyArIHN0cmVhbUlkICsgJyBpbicsIGJpZ1N0cmVhbUxpc3QpO1xuXG4gICAgICAgIC8vIEJBRCEgZG9tIHF1ZXJ5aW5nIGdhbG9yZVxuICAgICAgICB2YXIgJGVsID0gJCgnW3N0cmVhbWlkPVxcJycrc3RyZWFtSWQrJ1xcJ10nKTtcbiAgICAgICAgaWYgKCEkZWwubGVuZ3RoKSAkZWwgPSAkKCcjcHVibGlzaGVyJylcblxuICAgICAgICBpZiAoYmlnU3RyZWFtTGlzdC5pbmRleE9mKHN0cmVhbUlkKSA+PSAwKSB7XG4gICAgICAgICAgLy8gc3RyZWFtIHNob3VsZCBiZSBiaWdcbiAgICAgICAgICBjb25zb2xlLmxvZygnbWFrZSAnICsgc3RyZWFtSWQgKyAnIGJpZy4nKTtcbiAgICAgICAgICAkZWwuYWRkQ2xhc3MoJ09UX2JpZycpO1xuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gc3RyZWFtIHNob3VsZCBub3QgYmUgYmlnXG4gICAgICAgICAgY29uc29sZS5sb2coJ21ha2UgJyArIHN0cmVhbUlkICsgJyBzbWFsbC4nKTtcbiAgICAgICAgICAkZWwucmVtb3ZlQ2xhc3MoJ09UX2JpZycpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKE9UU2Vzc2lvbi5zZXNzaW9uLnN0cmVhbXMpO1xuICAgICAgICAkc2NvcGUuJGVtaXQoXCJvdExheW91dFwiKTtcbiAgICAgIH1cblxuICAgICAgLy8gZ2VuZXJhdGUgYmlnU3RyZWFtTGlzdFxuICAgICAgJHNjb3BlLmJpZ1N0cmVhbXMuJGdldEluZGV4KCkuZm9yRWFjaChmdW5jdGlvbihrZXksIHN0cmVhbUlkKSB7XG4gICAgICAgIGJpZ1N0cmVhbUxpc3QucHVzaCgkc2NvcGUuYmlnU3RyZWFtc1trZXldKTtcbiAgICAgIH0pO1xuICAgICAgY29uc29sZS5sb2coJ3Njb3BlIGJpZ1N0cmVhbXMgZm9yIHVkcGF0ZScsICRzY29wZS5iaWdTdHJlYW1zKTtcbiAgICAgIGNvbnNvbGUubG9nKCdiaWcgc3RyZWFtIGxpc3QgZm9yIHVwZGF0ZScsIGJpZ1N0cmVhbUxpc3QpO1xuXG4gICAgICAvLyBpdGVyYXRlIG92ZXIgYWxsIGtub3duIHN0cmVhbXMgYW5kIGNhbGwgdXBkYXRlU3RyZWFtXG4gICAgICAkc2NvcGUuc3RyZWFtcy5mb3JFYWNoKGZ1bmN0aW9uKHN0cmVhbSwgaW5kZXgpIHtcbiAgICAgICAgdXBkYXRlU3RyZWFtKHN0cmVhbS5zdHJlYW1JZCk7XG4gICAgICB9KTtcblxuICAgICAgaWYgKCRzY29wZS5wdWJsaXNoZXJzWzBdLnN0cmVhbSkge1xuICAgICAgICB1cGRhdGVTdHJlYW0oJHNjb3BlLnB1Ymxpc2hlcnNbMF0uc3RyZWFtLnN0cmVhbUlkKTtcbiAgICAgICAgJHNjb3BlLiRlbWl0KFwib3RMYXlvdXRcIik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUucHVibGlzaGVyc1swXS5vbignc3RyZWFtQ3JlYXRlZCcsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgdXBkYXRlU3RyZWFtKCRzY29wZS5wdWJsaXNoZXJzWzBdLnN0cmVhbS5zdHJlYW1JZCk7XG4gICAgICAgICAgJHNjb3BlLiRlbWl0KFwib3RMYXlvdXRcIik7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAkc2NvcGUuJGVtaXQoXCJvdExheW91dFwiKTtcblxuICAgIH07XG5cbiAgICAkc2NvcGUubG9ja2VkID0gdHJ1ZTtcbiAgICAkc2NvcGUuJHdhdGNoKCdsb2NrZWQnLCBmdW5jdGlvbihuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdsb2NrZWQgZ29pbmcgZnJvbSAnICsgb2xkVmFsdWUgKyAnIHRvICcgKyBuZXdWYWx1ZSk7XG4gICAgICBpZiAobmV3VmFsdWUgPT0gdHJ1ZSkge1xuICAgICAgICB0YWtlT3duZXJzaGlwKCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAkaHR0cC5nZXQoJy9jbGFzc3Jvb20nKS5zdWNjZXNzKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIE9UU2Vzc2lvbi5pbml0KGRhdGEuYXBpS2V5LCBkYXRhLnNlc3Npb25JZCwgZGF0YS50b2tlbiwgZnVuY3Rpb24oZXJyLCBzZXNzaW9uKSB7XG4gICAgICAgIGlmIChlcnIpIHRocm93IGVycjtcblxuICAgICAgICBzZXNzaW9uLm9uKHtcbiAgICAgICAgICBzdGFydGVkVG9UYWxrOiBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3N0YXJ0ZWRUb1RhbGsgZXZlbnQgZmlyZWQnKTtcbiAgICAgICAgICAgIGV2ZW50LnN1YnNjcmliZXJzLmZvckVhY2goZnVuY3Rpb24oc3Vic2NyaWJlcikge1xuICAgICAgICAgICAgICAvLyBpZiBub3QgbG9ja2VkIGFuZCBpIGFtIGEgdGVhY2hlclxuICAgICAgICAgICAgICBpZiAoISRzY29wZS5sb2NrZWQgJiYgJHNjb3BlLnRlYWNoZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBhZGQgdGhlIHN0cmVhbSB0byBiaWdTdHJlYW1zXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1NQRUFLSU5HOicsIHN1YnNjcmliZXIuc3RyZWFtSWQpO1xuXG4gICAgICAgICAgICAgICAgLy8gcmVtb3ZlIHRoZSBvbGRlc3QgaWYgd2UgZG9uJ3Qgd2FudCBhbnkgbW9yZSBiaWdcbiAgICAgICAgICAgICAgICB2YXIga2V5cyA9ICRzY29wZS5iaWdTdHJlYW1zLiRnZXRJbmRleCgpO1xuICAgICAgICAgICAgICAgIGlmIChrZXlzLmxlbmd0aCA+PSBNQVhfQklHKSB7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUuYmlnU3RyZWFtcy4kcmVtb3ZlKGtleXNbMF0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICRzY29wZS5iaWdTdHJlYW1zLiRhZGQoc3Vic2NyaWJlci5zdHJlYW1JZCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0sXG5cbiAgICAgICAgICBzdG9wcGVkVG9UYWxrOiBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3N0b3BwZWRUb1RhbGsgZXZlbnQgZmlyZWQnKTtcbiAgICAgICAgICAgIGV2ZW50LnN1YnNjcmliZXJzLmZvckVhY2goZnVuY3Rpb24oc3Vic2NyaWJlcikge1xuICAgICAgICAgICAgICAvLyBpZiBub3QgbG9ja2VkIGFuZCBpIGFtIGEgdGVhY2hlclxuICAgICAgICAgICAgICBpZiAoISRzY29wZS5sb2NrZWQgJiYgJHNjb3BlLnRlYWNoZXIpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuYmlnU3RyZWFtcy4kZ2V0SW5kZXgoKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgICAgICAgaWYgKHN1YnNjcmliZXIuc3RyZWFtSWQgPT0gJHNjb3BlLmJpZ1N0cmVhbXNba2V5XSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnU1RPUFBFRCBTUEVBS0lORzonLCBzdWJzY3JpYmVyLnN0cmVhbUlkKTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmJpZ1N0cmVhbXMuJHJlbW92ZShrZXkpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICB9KTtcblxuICAgICAgJHNjb3BlLnN0cmVhbXMgPSBPVFNlc3Npb24uc3RyZWFtcztcbiAgICAgICRzY29wZS5wdWJsaXNoZXJzID0gT1RTZXNzaW9uLnB1Ymxpc2hlcnM7XG5cbiAgICB9KS5lcnJvcihmdW5jdGlvbihkYXRhLCBzdGF0dXMpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiQW4gZXJyb3Igb2NjdXJyZWQgd2hpbGUgcmV0cmlldmluZyB0aGUgY2xhc3Nyb29tIGRhdGEuXCIsIGRhdGEsIHN0YXR1cyk7XG4gICAgfSk7XG5cbiAgICAvLyB0aGlzIGlzIHByb2JhYmx5IHRoZSB3cm9uZyBwbGFjZSB0byBkbyB0aGlzLCBtYXliZSBwdXQgdGhpcyBpbiBhIGRpcmVjdGl2ZVxuICAgIGFuZ3VsYXIuZWxlbWVudCgkd2luZG93KS5iaW5kKCdyZXNpemUnLCBmdW5jdGlvbigpIHtcbiAgICAgIC8vIEJBRCEgYWNjZXNzaW5nIERPTSBkaXJlY3RseVxuICAgICAgLy8gYWxzbyBwcm9iYWJseSB3YW50IHRvIHRocm90bGUgdGhpc1xuICAgICAgJCgnLmNsYXNzcm9vbScpLmhlaWdodCgkKHdpbmRvdykuaGVpZ2h0KCkgLSAoJCgnI2hlYWRlcicpLmhlaWdodCgpICsgJCgnI2NvdXJzZS1pbmZvJykuaGVpZ2h0KCkgKyAkKCcjcGFnZUZvb3RlcicpLmhlaWdodCgpKSk7XG4gICAgICAkc2NvcGUuJGVtaXQoJ290TGF5b3V0Jyk7XG4gICAgfSk7XG4gIH1dKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gYW5ndWxhci5tb2R1bGUoJ2FwcC5ob21lJywgWydvcGVudG9rJywgJ2ZpcmViYXNlJ10pO1xuXG5yZXF1aXJlKCcuL09wZW5Ub2tDdHJsJyk7XG4iLCJcbmFuZ3VsYXIubW9kdWxlKCdhcHAnLCBbXG4gIHJlcXVpcmUoJy4vaG9tZScpLm5hbWVcbl0pO1xuXG4iXX0=
