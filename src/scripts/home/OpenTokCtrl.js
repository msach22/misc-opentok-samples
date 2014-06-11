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
