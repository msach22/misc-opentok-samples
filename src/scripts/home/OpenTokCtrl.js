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
