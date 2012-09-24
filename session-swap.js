TB.setLogLevel(TB.DEBUG);

// When the page loads, start a detached publisher
var publisher = TB.initPublisher(apiKey, 'pubContainer');

// Initialize both sessions
var sessions = {
	"1" : TB.initSession(configSessions["1"].id),
	"2" : TB.initSession(configSessions["2"].id)
};

// Data structure to hold onto subscriber objects
var subscribers = {
	"1" : {},
	"2" : {}
};

// Attach event handlers for each session
for (var sessionNum in sessions) {
	if(sessions.hasOwnProperty(sessionNum)) {
		var thisSession = sessions[sessionNum];

		thisSession.addEventListener("sessionConnected", parameterizeFunc(sessionConnectedHandler, sessionNum));
		//thisSession.addEventListener("sessionConnected", function(sessionNum) {
		//	return function(event) {
		//		sessionConnectedHandler(event, sessionNum);
		//	};
		//}(sessionNum));
		thisSession.addEventListener("sessionDisconnected", function(sessionNum) {
			return function(event) {
				sessionDisconnectedHandler(event, sessionNum);
			};
		}(sessionNum));
		thisSession.addEventListener("streamCreated", function(sessionNum) {
			return function(event) {
				streamCreatedHandler(event, sessionNum);
			};
		}(sessionNum));
		thisSession.addEventListener("streamDestroyed", function(sessionNum) {
			return function(event) {
				streamDestroyedHandler(event, sessionNum);
			};
		}(sessionNum));
	}
}

function sessionConnectedHandler(event, sessionNum) {
	// Publish
	sessions[sessionNum].publish(publisher);
	
	// Subscribe to all streams
	for (var i = 0; i < event.streams.length; i++) {
		addStream(event.streams[i], sessionNum);
	}
	
	// TODO: set status in DOM
}

function sessionDisconnectedHandler(event, sessionNum) {
	// TODO: why is sessionNum "2" when it should be "1"?
	event.preventDefault();
	// TODO: clean up subscribers?
	for (var streamId in subscribers[sessionNum]) {
		if (subscribers[sessionNum].hasOwnProperty(streamId)) {
			sessions[sessionNum].unsubscribe(subscribers[sessionNum][streamId]);
		}
	}

	// TODO: set status in DOM
}

function streamCreatedHandler(event, sessionNum) {
	// Subscribe to all streams
	for (var i = 0; i < event.streams.length; i++) {
		addStream(event.streams[i], sessionNum);
	}
}

function streamDestroyedHandler(event, sessionNum) {
}

// Helper functions

function publishToSession(sessionNum) {
	var otherSessionNum;
	if (sessions[sessionNum].connected) {
		console.log("Already connected to session " + sessionNum);
	} else {
		otherSessionNum = (sessionNum === "1") ? "2" : "1";
		// WARNING: using undocumented property session.connected
		if (sessions[otherSessionNum].connected) {
			// Disconnect the other session
			sessions[otherSessionNum].disconnect();
		}
		// TODO: does it matter if the asynchronous disconnect completes first?
		sessions[sessionNum].connect(apiKey, configSessions[sessionNum].token);
	}
}

function addStream(stream, sessionNum) {
	var thisSession = sessions[sessionNum];
	if (stream.connection.connectionId == thisSession.connection.connectionId) {
		return;
	}
	var div = document.createElement('div');
	var divId = stream.streamId;
	div.setAttribute('id', divId);
	$('#session'+sessionNum+' .subContainer').append(div);
	subscribers[sessionNum][stream.streamId] = thisSession.subscribe(stream, divId);
}

function parameterizeFunc(handlerFunc, sugar) {
	return function(event) {
		handlerFunc(event, sugar);
	};
}

// Document ready, attach click handlers
$(function() {
	$('.startBtn').click(function(event) {
		event.preventDefault();
		var sessionNum = $(this).hasClass('1') ? "1" : "2";
		publishToSession(sessionNum);
	});
});
