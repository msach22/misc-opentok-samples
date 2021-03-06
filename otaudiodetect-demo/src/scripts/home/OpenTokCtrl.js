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
    $scope.muted = false;

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

    $scope.toggleMute = function() {
      $scope.muted = !$scope.muted;
      $scope.publishers[0].publishAudio(!$scope.muted);
    };
  }]);
