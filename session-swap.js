TB.setLogLevel(TB.DEBUG);

// When the page loads, start a detached publisher
var publisher = TB.initPublisher(apiKey, 'pubContainer');

// Initialize both sessions
var sessions = {
	"1" : TB.initSession(configSessions["1"].id),
	"2" : TB.initSession(configSessions["2"].id)
};

// Data structure to hold onto subscriber objects
var mySubscribers = {
	"1" : {},
	"2" : {}
};

for (var sessionNum in sessions) {
	if(sessions.hasOwnProperty(sessionNum)) {
		var thisSession = sessions[sessionNum];

		// Attach default handlers
		thisSession.addEventListener("sessionConnected", function(event) {
			var thisSessionNum = sessionNum;
			sessionConnectedHandler(event, thisSessionNum);
		});
		thisSession.addEventListener("sessionDisconnected", function(event) {
			var thisSessionNum = sessionNum;
			sessionDisconnectedHandler(event, thisSessionNum);
		});
		thisSession.addEventListener("streamCreated", function(event) {
			var thisSessionNum = sessionNum;
			streamCreatedHandler(event, thisSessionNum);
		});
		thisSession.addEventListener("streamDestroyed", function(event) {
			var thisSessionNum = sessionNum;
			streamDestroyedHandler(event, thisSessionNum);
		});
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
	for (var streamId in mySubscribers[sessionNum]) {
		if (mySubscribers[sessionNum].hasOwnProperty(streamId)) {
			sessions[sessionNum].unsubscribe(sessions[sessionNum][streamId]);
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
	mySubscribers[sessionNum][stream.streamId] = thisSession.subscribe(stream, divId);
}

// Document ready, attach click handlers
$(function() {
	$('.startBtn').click(function(event) {
		event.preventDefault();
		sessionNum = $(this).hasClass('1') ? "1" : "2";
		publishToSession(sessionNum);
	});
});
