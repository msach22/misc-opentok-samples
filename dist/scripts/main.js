(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
angular.module('app.home')
  .controller('OpenTokCtrl', ['$scope', 'OTSession', '$http', '$window', '$firebase', '$attrs',
  function($scope, OTSession, $http, $window, $firebase, $attrs) {

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
        // there may be a race condition here, how do we know when the publisher is ready?
        if ($scope.publishers.length != 1) {
          throw new Error('Publisher was not ready in time');
        }

        $scope.publishers[0].on('streamCreated', function(event) {
          console.log($scope.publishers[0].stream.streamId);
          $scope.bigStreams.$remove();
          $scope.bigStreams.$add($scope.publishers[0].stream.streamId);
          console.log('updated bigStreams');
        });
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
      // there might be a race condition here, hopefully this event fires immediately if
      // the stream was already previously created.
      //$scope.publishers[0].on('streamCreated', function(event) {
        updateStream($scope.publishers[0].stream.streamId);
      //});
      $scope.$emit("otLayout");
    };

    $scope.locked = true;
    $scope.$watch('locked', function(newValue, oldValue) {
      console.log('locked going from ' + oldValue + ' to ' + newValue);
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
                $scope.bigStreams.$add(subscriber.streamId);
                //subscriber.element.classList.add('OT_big');
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
              // remove the stream from bigStreams
              //subscriber.element.classList.remove('OT_big');
            });
            //$scope.$emit("otLayout");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYW5rdXIvRGV2ZWxvcGVyL3dlYnJ0Y2V4cG8xNC1hdWRpb2RldGVjdGlvbi9ub2RlX21vZHVsZXMvcGhvLWRldnN0YWNrL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYW5rdXIvRGV2ZWxvcGVyL3dlYnJ0Y2V4cG8xNC1hdWRpb2RldGVjdGlvbi9zcmMvc2NyaXB0cy9ob21lL09wZW5Ub2tDdHJsLmpzIiwiL1VzZXJzL2Fua3VyL0RldmVsb3Blci93ZWJydGNleHBvMTQtYXVkaW9kZXRlY3Rpb24vc3JjL3NjcmlwdHMvaG9tZS9pbmRleC5qcyIsIi9Vc2Vycy9hbmt1ci9EZXZlbG9wZXIvd2VicnRjZXhwbzE0LWF1ZGlvZGV0ZWN0aW9uL3NyYy9zY3JpcHRzL21haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUlBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5ob21lJylcbiAgLmNvbnRyb2xsZXIoJ09wZW5Ub2tDdHJsJywgWyckc2NvcGUnLCAnT1RTZXNzaW9uJywgJyRodHRwJywgJyR3aW5kb3cnLCAnJGZpcmViYXNlJywgJyRhdHRycycsXG4gIGZ1bmN0aW9uKCRzY29wZSwgT1RTZXNzaW9uLCAkaHR0cCwgJHdpbmRvdywgJGZpcmViYXNlLCAkYXR0cnMpIHtcblxuICAgIGlmICgkYXR0cnMudGVhY2hlciA9PT0gJ3RydWUnKSB7XG4gICAgICAkc2NvcGUudGVhY2hlciA9IHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgICRzY29wZS50ZWFjaGVyID0gZmFsc2U7XG4gICAgfVxuXG4gICAgdmFyIGJpZ1N0cmVhbXNSZWYgPSBuZXcgRmlyZWJhc2UoXCJodHRwczovL290YXVkaW9kZXRlY3QuZmlyZWJhc2Vpby5jb20vY2xhc3Nyb29tXCIpO1xuICAgICRzY29wZS5iaWdTdHJlYW1zID0gJGZpcmViYXNlKGJpZ1N0cmVhbXNSZWYpO1xuICAgICRzY29wZS5iaWdTdHJlYW1zLiRvbignbG9hZGVkJywgZnVuY3Rpb24oKSB7XG4gICAgICAvLyBpZiBpJ20gdGhlIHRlYWNoZXIsIG92ZXJ3cml0ZSB0aGlzIGFuZCBwdXQganVzdCBtZSBhcyB0aGUgYmlnIHN0cmVhbVxuICAgICAgaWYgKCRzY29wZS50ZWFjaGVyKSB7XG4gICAgICAgIC8vIHRoZXJlIG1heSBiZSBhIHJhY2UgY29uZGl0aW9uIGhlcmUsIGhvdyBkbyB3ZSBrbm93IHdoZW4gdGhlIHB1Ymxpc2hlciBpcyByZWFkeT9cbiAgICAgICAgaWYgKCRzY29wZS5wdWJsaXNoZXJzLmxlbmd0aCAhPSAxKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQdWJsaXNoZXIgd2FzIG5vdCByZWFkeSBpbiB0aW1lJyk7XG4gICAgICAgIH1cblxuICAgICAgICAkc2NvcGUucHVibGlzaGVyc1swXS5vbignc3RyZWFtQ3JlYXRlZCcsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJHNjb3BlLnB1Ymxpc2hlcnNbMF0uc3RyZWFtLnN0cmVhbUlkKTtcbiAgICAgICAgICAkc2NvcGUuYmlnU3RyZWFtcy4kcmVtb3ZlKCk7XG4gICAgICAgICAgJHNjb3BlLmJpZ1N0cmVhbXMuJGFkZCgkc2NvcGUucHVibGlzaGVyc1swXS5zdHJlYW0uc3RyZWFtSWQpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKCd1cGRhdGVkIGJpZ1N0cmVhbXMnKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICAvLyBpZiBpJ20gdGhlIHN0dWRlbnQsIGNhbGwgYSBmdW5jdGlvbiB0aGF0IGl0ZXJhdGVzIG92ZXIgdGhlIGJpZ1N0cmVhbXMgYW5kIHNldHMgdGhlbSB1cFxuICAgICAgZWxzZSB7XG4gICAgICAgIHVwZGF0ZUJpZ1N0cmVhbXMoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICAkc2NvcGUuYmlnU3RyZWFtcy4kb24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgLy8gY2FsbCB0aGUgZnVuY3Rpb24gdGhhdCBpdGVyYXRlcyBvdmVyIHRoZSBiaWdTdHJlYW1zIGFuZCBzZXRzIHRoZW0gdXBcbiAgICAgIHVwZGF0ZUJpZ1N0cmVhbXMoKTtcbiAgICB9KTtcblxuICAgIHZhciB1cGRhdGVCaWdTdHJlYW1zID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBmbGF0dGVuZWQgbGlzdCBvZiBqdXN0IHRoZSBzdHJlYW1JZCdzIGZvciB0aGUgYmlnIHN0cmVhbXNcbiAgICAgIHZhciBiaWdTdHJlYW1MaXN0ID0gW107XG5cbiAgICAgIC8vIHRoaXMgaXMgY2FsbGVkIGZvciBlYWNoIHN0cmVhbSBpbiB0aGUgc2Vzc2lvbiAoc3Vic2NyaWJlcnMgKyBwdWJsaXNoZXIpXG4gICAgICB2YXIgdXBkYXRlU3RyZWFtID0gZnVuY3Rpb24oc3RyZWFtSWQpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3NlYXJjaGluZyBmb3IgJyArIHN0cmVhbUlkICsgJyBpbicsIGJpZ1N0cmVhbUxpc3QpO1xuXG4gICAgICAgIC8vIEJBRCEgZG9tIHF1ZXJ5aW5nIGdhbG9yZVxuICAgICAgICB2YXIgJGVsID0gJCgnW3N0cmVhbWlkPVxcJycrc3RyZWFtSWQrJ1xcJ10nKTtcbiAgICAgICAgaWYgKCEkZWwubGVuZ3RoKSAkZWwgPSAkKCcjcHVibGlzaGVyJylcblxuICAgICAgICBpZiAoYmlnU3RyZWFtTGlzdC5pbmRleE9mKHN0cmVhbUlkKSA+PSAwKSB7XG4gICAgICAgICAgLy8gc3RyZWFtIHNob3VsZCBiZSBiaWdcbiAgICAgICAgICBjb25zb2xlLmxvZygnbWFrZSAnICsgc3RyZWFtSWQgKyAnIGJpZy4nKTtcbiAgICAgICAgICAkZWwuYWRkQ2xhc3MoJ09UX2JpZycpO1xuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gc3RyZWFtIHNob3VsZCBub3QgYmUgYmlnXG4gICAgICAgICAgY29uc29sZS5sb2coJ21ha2UgJyArIHN0cmVhbUlkICsgJyBzbWFsbC4nKTtcbiAgICAgICAgICAkZWwucmVtb3ZlQ2xhc3MoJ09UX2JpZycpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKE9UU2Vzc2lvbi5zZXNzaW9uLnN0cmVhbXMpO1xuICAgICAgfVxuXG4gICAgICAvLyBnZW5lcmF0ZSBiaWdTdHJlYW1MaXN0XG4gICAgICAkc2NvcGUuYmlnU3RyZWFtcy4kZ2V0SW5kZXgoKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSwgc3RyZWFtSWQpIHtcbiAgICAgICAgYmlnU3RyZWFtTGlzdC5wdXNoKCRzY29wZS5iaWdTdHJlYW1zW2tleV0pO1xuICAgICAgfSk7XG4gICAgICBjb25zb2xlLmxvZygnc2NvcGUgYmlnU3RyZWFtcyBmb3IgdWRwYXRlJywgJHNjb3BlLmJpZ1N0cmVhbXMpO1xuICAgICAgY29uc29sZS5sb2coJ2JpZyBzdHJlYW0gbGlzdCBmb3IgdXBkYXRlJywgYmlnU3RyZWFtTGlzdCk7XG5cbiAgICAgIC8vIGl0ZXJhdGUgb3ZlciBhbGwga25vd24gc3RyZWFtcyBhbmQgY2FsbCB1cGRhdGVTdHJlYW1cbiAgICAgICRzY29wZS5zdHJlYW1zLmZvckVhY2goZnVuY3Rpb24oc3RyZWFtLCBpbmRleCkge1xuICAgICAgICB1cGRhdGVTdHJlYW0oc3RyZWFtLnN0cmVhbUlkKTtcbiAgICAgIH0pO1xuICAgICAgLy8gdGhlcmUgbWlnaHQgYmUgYSByYWNlIGNvbmRpdGlvbiBoZXJlLCBob3BlZnVsbHkgdGhpcyBldmVudCBmaXJlcyBpbW1lZGlhdGVseSBpZlxuICAgICAgLy8gdGhlIHN0cmVhbSB3YXMgYWxyZWFkeSBwcmV2aW91c2x5IGNyZWF0ZWQuXG4gICAgICAvLyRzY29wZS5wdWJsaXNoZXJzWzBdLm9uKCdzdHJlYW1DcmVhdGVkJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgdXBkYXRlU3RyZWFtKCRzY29wZS5wdWJsaXNoZXJzWzBdLnN0cmVhbS5zdHJlYW1JZCk7XG4gICAgICAvL30pO1xuICAgICAgJHNjb3BlLiRlbWl0KFwib3RMYXlvdXRcIik7XG4gICAgfTtcblxuICAgICRzY29wZS5sb2NrZWQgPSB0cnVlO1xuICAgICRzY29wZS4kd2F0Y2goJ2xvY2tlZCcsIGZ1bmN0aW9uKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgY29uc29sZS5sb2coJ2xvY2tlZCBnb2luZyBmcm9tICcgKyBvbGRWYWx1ZSArICcgdG8gJyArIG5ld1ZhbHVlKTtcbiAgICB9KTtcblxuICAgICRodHRwLmdldCgnL2NsYXNzcm9vbScpLnN1Y2Nlc3MoZnVuY3Rpb24oZGF0YSkge1xuICAgICAgT1RTZXNzaW9uLmluaXQoZGF0YS5hcGlLZXksIGRhdGEuc2Vzc2lvbklkLCBkYXRhLnRva2VuLCBmdW5jdGlvbihlcnIsIHNlc3Npb24pIHtcbiAgICAgICAgaWYgKGVycikgdGhyb3cgZXJyO1xuXG4gICAgICAgIHNlc3Npb24ub24oe1xuICAgICAgICAgIHN0YXJ0ZWRUb1RhbGs6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnc3RhcnRlZFRvVGFsayBldmVudCBmaXJlZCcpO1xuICAgICAgICAgICAgZXZlbnQuc3Vic2NyaWJlcnMuZm9yRWFjaChmdW5jdGlvbihzdWJzY3JpYmVyKSB7XG4gICAgICAgICAgICAgIC8vIGlmIG5vdCBsb2NrZWQgYW5kIGkgYW0gYSB0ZWFjaGVyXG4gICAgICAgICAgICAgIGlmICghJHNjb3BlLmxvY2tlZCAmJiAkc2NvcGUudGVhY2hlcikge1xuICAgICAgICAgICAgICAgIC8vIGFkZCB0aGUgc3RyZWFtIHRvIGJpZ1N0cmVhbXNcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnU1BFQUtJTkc6Jywgc3Vic2NyaWJlci5zdHJlYW1JZCk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmJpZ1N0cmVhbXMuJGFkZChzdWJzY3JpYmVyLnN0cmVhbUlkKTtcbiAgICAgICAgICAgICAgICAvL3N1YnNjcmliZXIuZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdPVF9iaWcnKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIHN0b3BwZWRUb1RhbGs6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnc3RvcHBlZFRvVGFsayBldmVudCBmaXJlZCcpO1xuICAgICAgICAgICAgZXZlbnQuc3Vic2NyaWJlcnMuZm9yRWFjaChmdW5jdGlvbihzdWJzY3JpYmVyKSB7XG4gICAgICAgICAgICAgIC8vIGlmIG5vdCBsb2NrZWQgYW5kIGkgYW0gYSB0ZWFjaGVyXG4gICAgICAgICAgICAgIGlmICghJHNjb3BlLmxvY2tlZCAmJiAkc2NvcGUudGVhY2hlcikge1xuICAgICAgICAgICAgICAgICRzY29wZS5iaWdTdHJlYW1zLiRnZXRJbmRleCgpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgICAgICAgICBpZiAoc3Vic2NyaWJlci5zdHJlYW1JZCA9PSAkc2NvcGUuYmlnU3RyZWFtc1trZXldKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTVE9QUEVEIFNQRUFLSU5HOicsIHN1YnNjcmliZXIuc3RyZWFtSWQpO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuYmlnU3RyZWFtcy4kcmVtb3ZlKGtleSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gcmVtb3ZlIHRoZSBzdHJlYW0gZnJvbSBiaWdTdHJlYW1zXG4gICAgICAgICAgICAgIC8vc3Vic2NyaWJlci5lbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoJ09UX2JpZycpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAvLyRzY29wZS4kZW1pdChcIm90TGF5b3V0XCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgIH0pO1xuXG4gICAgICAkc2NvcGUuc3RyZWFtcyA9IE9UU2Vzc2lvbi5zdHJlYW1zO1xuICAgICAgJHNjb3BlLnB1Ymxpc2hlcnMgPSBPVFNlc3Npb24ucHVibGlzaGVycztcblxuICAgIH0pLmVycm9yKGZ1bmN0aW9uKGRhdGEsIHN0YXR1cykge1xuICAgICAgY29uc29sZS5sb2coXCJBbiBlcnJvciBvY2N1cnJlZCB3aGlsZSByZXRyaWV2aW5nIHRoZSBjbGFzc3Jvb20gZGF0YS5cIiwgZGF0YSwgc3RhdHVzKTtcbiAgICB9KTtcblxuICAgIC8vIHRoaXMgaXMgcHJvYmFibHkgdGhlIHdyb25nIHBsYWNlIHRvIGRvIHRoaXMsIG1heWJlIHB1dCB0aGlzIGluIGEgZGlyZWN0aXZlXG4gICAgYW5ndWxhci5lbGVtZW50KCR3aW5kb3cpLmJpbmQoJ3Jlc2l6ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgLy8gQkFEISBhY2Nlc3NpbmcgRE9NIGRpcmVjdGx5XG4gICAgICAvLyBhbHNvIHByb2JhYmx5IHdhbnQgdG8gdGhyb3RsZSB0aGlzXG4gICAgICAkKCcuY2xhc3Nyb29tJykuaGVpZ2h0KCQod2luZG93KS5oZWlnaHQoKSAtICgkKCcjaGVhZGVyJykuaGVpZ2h0KCkgKyAkKCcjY291cnNlLWluZm8nKS5oZWlnaHQoKSArICQoJyNwYWdlRm9vdGVyJykuaGVpZ2h0KCkpKTtcbiAgICAgICRzY29wZS4kZW1pdCgnb3RMYXlvdXQnKTtcbiAgICB9KTtcbiAgfV0pO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBhbmd1bGFyLm1vZHVsZSgnYXBwLmhvbWUnLCBbJ29wZW50b2snLCAnZmlyZWJhc2UnXSk7XG5cbnJlcXVpcmUoJy4vT3BlblRva0N0cmwnKTtcbiIsIlxuYW5ndWxhci5tb2R1bGUoJ2FwcCcsIFtcbiAgcmVxdWlyZSgnLi9ob21lJykubmFtZVxuXSk7XG5cbiJdfQ==
