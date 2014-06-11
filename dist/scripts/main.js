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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYW5rdXIvRGV2ZWxvcGVyL3dlYnJ0Y2V4cG8xNC1hdWRpb2RldGVjdGlvbi9ub2RlX21vZHVsZXMvcGhvLWRldnN0YWNrL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYW5rdXIvRGV2ZWxvcGVyL3dlYnJ0Y2V4cG8xNC1hdWRpb2RldGVjdGlvbi9zcmMvc2NyaXB0cy9ob21lL09wZW5Ub2tDdHJsLmpzIiwiL1VzZXJzL2Fua3VyL0RldmVsb3Blci93ZWJydGNleHBvMTQtYXVkaW9kZXRlY3Rpb24vc3JjL3NjcmlwdHMvaG9tZS9pbmRleC5qcyIsIi9Vc2Vycy9hbmt1ci9EZXZlbG9wZXIvd2VicnRjZXhwbzE0LWF1ZGlvZGV0ZWN0aW9uL3NyYy9zY3JpcHRzL21haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyS0E7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJhbmd1bGFyLm1vZHVsZSgnYXBwLmhvbWUnKVxuICAuY29udHJvbGxlcignT3BlblRva0N0cmwnLCBbJyRzY29wZScsICdPVFNlc3Npb24nLCAnJGh0dHAnLCAnJHdpbmRvdycsICckZmlyZWJhc2UnLCAnJGF0dHJzJyxcbiAgZnVuY3Rpb24oJHNjb3BlLCBPVFNlc3Npb24sICRodHRwLCAkd2luZG93LCAkZmlyZWJhc2UsICRhdHRycykge1xuXG4gICAgdmFyIE1BWF9CSUcgPSAxO1xuXG4gICAgaWYgKCRhdHRycy50ZWFjaGVyID09PSAndHJ1ZScpIHtcbiAgICAgICRzY29wZS50ZWFjaGVyID0gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgJHNjb3BlLnRlYWNoZXIgPSBmYWxzZTtcbiAgICB9XG5cbiAgICB2YXIgYmlnU3RyZWFtc1JlZiA9IG5ldyBGaXJlYmFzZShcImh0dHBzOi8vb3RhdWRpb2RldGVjdC5maXJlYmFzZWlvLmNvbS9jbGFzc3Jvb21cIik7XG4gICAgJHNjb3BlLmJpZ1N0cmVhbXMgPSAkZmlyZWJhc2UoYmlnU3RyZWFtc1JlZik7XG4gICAgJHNjb3BlLmJpZ1N0cmVhbXMuJG9uKCdsb2FkZWQnLCBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGlmIGknbSB0aGUgdGVhY2hlciwgb3ZlcndyaXRlIHRoaXMgYW5kIHB1dCBqdXN0IG1lIGFzIHRoZSBiaWcgc3RyZWFtXG4gICAgICBpZiAoJHNjb3BlLnRlYWNoZXIpIHtcbiAgICAgICAgdGFrZU93bmVyc2hpcCgpO1xuICAgICAgfVxuICAgICAgLy8gaWYgaSdtIHRoZSBzdHVkZW50LCBjYWxsIGEgZnVuY3Rpb24gdGhhdCBpdGVyYXRlcyBvdmVyIHRoZSBiaWdTdHJlYW1zIGFuZCBzZXRzIHRoZW0gdXBcbiAgICAgIGVsc2Uge1xuICAgICAgICB1cGRhdGVCaWdTdHJlYW1zKCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgJHNjb3BlLmJpZ1N0cmVhbXMuJG9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGNhbGwgdGhlIGZ1bmN0aW9uIHRoYXQgaXRlcmF0ZXMgb3ZlciB0aGUgYmlnU3RyZWFtcyBhbmQgc2V0cyB0aGVtIHVwXG4gICAgICB1cGRhdGVCaWdTdHJlYW1zKCk7XG4gICAgfSk7XG5cbiAgICB2YXIgdGFrZU93bmVyc2hpcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gdGhlcmUgbWF5IGJlIGEgcmFjZSBjb25kaXRpb24gaGVyZSwgaG93IGRvIHdlIGtub3cgd2hlbiB0aGUgcHVibGlzaGVyIGlzIHJlYWR5P1xuICAgICAgaWYgKCRzY29wZS5wdWJsaXNoZXJzLmxlbmd0aCAhPSAxKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUHVibGlzaGVyIHdhcyBub3QgcmVhZHkgaW4gdGltZScpO1xuICAgICAgfVxuXG4gICAgICBpZiAoJHNjb3BlLnB1Ymxpc2hlcnNbMF0uc3RyZWFtKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCRzY29wZS5wdWJsaXNoZXJzWzBdLnN0cmVhbS5zdHJlYW1JZCk7XG4gICAgICAgICRzY29wZS5iaWdTdHJlYW1zLiRyZW1vdmUoKTtcbiAgICAgICAgJHNjb3BlLmJpZ1N0cmVhbXMuJGFkZCgkc2NvcGUucHVibGlzaGVyc1swXS5zdHJlYW0uc3RyZWFtSWQpO1xuICAgICAgICBjb25zb2xlLmxvZygnb3duZWQgYmlnU3RyZWFtcycpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLnB1Ymxpc2hlcnNbMF0ub24oJ3N0cmVhbUNyZWF0ZWQnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCRzY29wZS5wdWJsaXNoZXJzWzBdLnN0cmVhbS5zdHJlYW1JZCk7XG4gICAgICAgICAgJHNjb3BlLmJpZ1N0cmVhbXMuJHJlbW92ZSgpO1xuICAgICAgICAgICRzY29wZS5iaWdTdHJlYW1zLiRhZGQoJHNjb3BlLnB1Ymxpc2hlcnNbMF0uc3RyZWFtLnN0cmVhbUlkKTtcbiAgICAgICAgICBjb25zb2xlLmxvZygnb3duZWQgYmlnU3RyZWFtcycpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIHVwZGF0ZUJpZ1N0cmVhbXMgPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGZsYXR0ZW5lZCBsaXN0IG9mIGp1c3QgdGhlIHN0cmVhbUlkJ3MgZm9yIHRoZSBiaWcgc3RyZWFtc1xuICAgICAgdmFyIGJpZ1N0cmVhbUxpc3QgPSBbXTtcblxuICAgICAgLy8gdGhpcyBpcyBjYWxsZWQgZm9yIGVhY2ggc3RyZWFtIGluIHRoZSBzZXNzaW9uIChzdWJzY3JpYmVycyArIHB1Ymxpc2hlcilcbiAgICAgIHZhciB1cGRhdGVTdHJlYW0gPSBmdW5jdGlvbihzdHJlYW1JZCkge1xuICAgICAgICBjb25zb2xlLmxvZygnc2VhcmNoaW5nIGZvciAnICsgc3RyZWFtSWQgKyAnIGluJywgYmlnU3RyZWFtTGlzdCk7XG5cbiAgICAgICAgLy8gQkFEISBkb20gcXVlcnlpbmcgZ2Fsb3JlXG4gICAgICAgIHZhciAkZWwgPSAkKCdbc3RyZWFtaWQ9XFwnJytzdHJlYW1JZCsnXFwnXScpO1xuICAgICAgICBpZiAoISRlbC5sZW5ndGgpICRlbCA9ICQoJyNwdWJsaXNoZXInKVxuXG4gICAgICAgIGlmIChiaWdTdHJlYW1MaXN0LmluZGV4T2Yoc3RyZWFtSWQpID49IDApIHtcbiAgICAgICAgICAvLyBzdHJlYW0gc2hvdWxkIGJlIGJpZ1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdtYWtlICcgKyBzdHJlYW1JZCArICcgYmlnLicpO1xuICAgICAgICAgICRlbC5hZGRDbGFzcygnT1RfYmlnJyk7XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBzdHJlYW0gc2hvdWxkIG5vdCBiZSBiaWdcbiAgICAgICAgICBjb25zb2xlLmxvZygnbWFrZSAnICsgc3RyZWFtSWQgKyAnIHNtYWxsLicpO1xuICAgICAgICAgICRlbC5yZW1vdmVDbGFzcygnT1RfYmlnJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coT1RTZXNzaW9uLnNlc3Npb24uc3RyZWFtcyk7XG4gICAgICB9XG5cbiAgICAgIC8vIGdlbmVyYXRlIGJpZ1N0cmVhbUxpc3RcbiAgICAgICRzY29wZS5iaWdTdHJlYW1zLiRnZXRJbmRleCgpLmZvckVhY2goZnVuY3Rpb24oa2V5LCBzdHJlYW1JZCkge1xuICAgICAgICBiaWdTdHJlYW1MaXN0LnB1c2goJHNjb3BlLmJpZ1N0cmVhbXNba2V5XSk7XG4gICAgICB9KTtcbiAgICAgIGNvbnNvbGUubG9nKCdzY29wZSBiaWdTdHJlYW1zIGZvciB1ZHBhdGUnLCAkc2NvcGUuYmlnU3RyZWFtcyk7XG4gICAgICBjb25zb2xlLmxvZygnYmlnIHN0cmVhbSBsaXN0IGZvciB1cGRhdGUnLCBiaWdTdHJlYW1MaXN0KTtcblxuICAgICAgLy8gaXRlcmF0ZSBvdmVyIGFsbCBrbm93biBzdHJlYW1zIGFuZCBjYWxsIHVwZGF0ZVN0cmVhbVxuICAgICAgJHNjb3BlLnN0cmVhbXMuZm9yRWFjaChmdW5jdGlvbihzdHJlYW0sIGluZGV4KSB7XG4gICAgICAgIHVwZGF0ZVN0cmVhbShzdHJlYW0uc3RyZWFtSWQpO1xuICAgICAgfSk7XG5cbiAgICAgIGlmICgkc2NvcGUucHVibGlzaGVyc1swXS5zdHJlYW0pIHtcbiAgICAgICAgdXBkYXRlU3RyZWFtKCRzY29wZS5wdWJsaXNoZXJzWzBdLnN0cmVhbS5zdHJlYW1JZCk7XG4gICAgICAgICRzY29wZS4kZW1pdChcIm90TGF5b3V0XCIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLnB1Ymxpc2hlcnNbMF0ub24oJ3N0cmVhbUNyZWF0ZWQnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgIHVwZGF0ZVN0cmVhbSgkc2NvcGUucHVibGlzaGVyc1swXS5zdHJlYW0uc3RyZWFtSWQpO1xuICAgICAgICAgICRzY29wZS4kZW1pdChcIm90TGF5b3V0XCIpO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuXG4gICAgfTtcblxuICAgICRzY29wZS5sb2NrZWQgPSB0cnVlO1xuICAgICRzY29wZS4kd2F0Y2goJ2xvY2tlZCcsIGZ1bmN0aW9uKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgY29uc29sZS5sb2coJ2xvY2tlZCBnb2luZyBmcm9tICcgKyBvbGRWYWx1ZSArICcgdG8gJyArIG5ld1ZhbHVlKTtcbiAgICAgIGlmIChuZXdWYWx1ZSA9PSB0cnVlKSB7XG4gICAgICAgIHRha2VPd25lcnNoaXAoKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgICRodHRwLmdldCgnL2NsYXNzcm9vbScpLnN1Y2Nlc3MoZnVuY3Rpb24oZGF0YSkge1xuICAgICAgT1RTZXNzaW9uLmluaXQoZGF0YS5hcGlLZXksIGRhdGEuc2Vzc2lvbklkLCBkYXRhLnRva2VuLCBmdW5jdGlvbihlcnIsIHNlc3Npb24pIHtcbiAgICAgICAgaWYgKGVycikgdGhyb3cgZXJyO1xuXG4gICAgICAgIHNlc3Npb24ub24oe1xuICAgICAgICAgIHN0YXJ0ZWRUb1RhbGs6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnc3RhcnRlZFRvVGFsayBldmVudCBmaXJlZCcpO1xuICAgICAgICAgICAgZXZlbnQuc3Vic2NyaWJlcnMuZm9yRWFjaChmdW5jdGlvbihzdWJzY3JpYmVyKSB7XG4gICAgICAgICAgICAgIC8vIGlmIG5vdCBsb2NrZWQgYW5kIGkgYW0gYSB0ZWFjaGVyXG4gICAgICAgICAgICAgIGlmICghJHNjb3BlLmxvY2tlZCAmJiAkc2NvcGUudGVhY2hlcikge1xuICAgICAgICAgICAgICAgIC8vIGFkZCB0aGUgc3RyZWFtIHRvIGJpZ1N0cmVhbXNcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnU1BFQUtJTkc6Jywgc3Vic2NyaWJlci5zdHJlYW1JZCk7XG5cbiAgICAgICAgICAgICAgICAvLyByZW1vdmUgdGhlIG9sZGVzdCBpZiB3ZSBkb24ndCB3YW50IGFueSBtb3JlIGJpZ1xuICAgICAgICAgICAgICAgIHZhciBrZXlzID0gJHNjb3BlLmJpZ1N0cmVhbXMuJGdldEluZGV4KCk7XG4gICAgICAgICAgICAgICAgaWYgKGtleXMubGVuZ3RoID49IE1BWF9CSUcpIHtcbiAgICAgICAgICAgICAgICAgICRzY29wZS5iaWdTdHJlYW1zLiRyZW1vdmUoa2V5c1swXSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJHNjb3BlLmJpZ1N0cmVhbXMuJGFkZChzdWJzY3JpYmVyLnN0cmVhbUlkKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIHN0b3BwZWRUb1RhbGs6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnc3RvcHBlZFRvVGFsayBldmVudCBmaXJlZCcpO1xuICAgICAgICAgICAgZXZlbnQuc3Vic2NyaWJlcnMuZm9yRWFjaChmdW5jdGlvbihzdWJzY3JpYmVyKSB7XG4gICAgICAgICAgICAgIC8vIGlmIG5vdCBsb2NrZWQgYW5kIGkgYW0gYSB0ZWFjaGVyXG4gICAgICAgICAgICAgIGlmICghJHNjb3BlLmxvY2tlZCAmJiAkc2NvcGUudGVhY2hlcikge1xuICAgICAgICAgICAgICAgICRzY29wZS5iaWdTdHJlYW1zLiRnZXRJbmRleCgpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgICAgICAgICBpZiAoc3Vic2NyaWJlci5zdHJlYW1JZCA9PSAkc2NvcGUuYmlnU3RyZWFtc1trZXldKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTVE9QUEVEIFNQRUFLSU5HOicsIHN1YnNjcmliZXIuc3RyZWFtSWQpO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuYmlnU3RyZWFtcy4kcmVtb3ZlKGtleSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgIH0pO1xuXG4gICAgICAkc2NvcGUuc3RyZWFtcyA9IE9UU2Vzc2lvbi5zdHJlYW1zO1xuICAgICAgJHNjb3BlLnB1Ymxpc2hlcnMgPSBPVFNlc3Npb24ucHVibGlzaGVycztcblxuICAgIH0pLmVycm9yKGZ1bmN0aW9uKGRhdGEsIHN0YXR1cykge1xuICAgICAgY29uc29sZS5sb2coXCJBbiBlcnJvciBvY2N1cnJlZCB3aGlsZSByZXRyaWV2aW5nIHRoZSBjbGFzc3Jvb20gZGF0YS5cIiwgZGF0YSwgc3RhdHVzKTtcbiAgICB9KTtcblxuICAgIC8vIHRoaXMgaXMgcHJvYmFibHkgdGhlIHdyb25nIHBsYWNlIHRvIGRvIHRoaXMsIG1heWJlIHB1dCB0aGlzIGluIGEgZGlyZWN0aXZlXG4gICAgYW5ndWxhci5lbGVtZW50KCR3aW5kb3cpLmJpbmQoJ3Jlc2l6ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgLy8gQkFEISBhY2Nlc3NpbmcgRE9NIGRpcmVjdGx5XG4gICAgICAvLyBhbHNvIHByb2JhYmx5IHdhbnQgdG8gdGhyb3RsZSB0aGlzXG4gICAgICAkKCcuY2xhc3Nyb29tJykuaGVpZ2h0KCQod2luZG93KS5oZWlnaHQoKSAtICgkKCcjaGVhZGVyJykuaGVpZ2h0KCkgKyAkKCcjY291cnNlLWluZm8nKS5oZWlnaHQoKSArICQoJyNwYWdlRm9vdGVyJykuaGVpZ2h0KCkpKTtcbiAgICAgICRzY29wZS4kZW1pdCgnb3RMYXlvdXQnKTtcbiAgICB9KTtcbiAgfV0pO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBhbmd1bGFyLm1vZHVsZSgnYXBwLmhvbWUnLCBbJ29wZW50b2snLCAnZmlyZWJhc2UnXSk7XG5cbnJlcXVpcmUoJy4vT3BlblRva0N0cmwnKTtcbiIsIlxuYW5ndWxhci5tb2R1bGUoJ2FwcCcsIFtcbiAgcmVxdWlyZSgnLi9ob21lJykubmFtZVxuXSk7XG5cbiJdfQ==
