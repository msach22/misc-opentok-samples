/* -----------------------------------------------------------------------------------------------
 * Chat View
 * ----------------------------------------------------------------------------------------------*/
/* global jQuery, Backbone, _, log */
/* global Chat */
/* exported ChatView */

// Declare dependencies and prevent leaking into global scope
(function(
           exports,                 // Environment
           $, Backbone, _, log,     // External libraries
           Chat,                    // Application modules
           undefined
         ) {


  exports.ChatView = Backbone.View.extend({

    className: 'panel panel-default',

    events: {
      'click .end-button': 'endButtonClicked'
    },

    initialize: function(options) {
      if (!options.dispatcher) {
        log.error('ChatView: initialize() cannot be called without a dispatcher');
        return;
      }
      this.dispatcher = options.dispatcher;

      if (!options.localUser) {
        log.error('ChatView: initialize() cannot be called without a local user');
        return;
      }
      this.localUser = options.localUser;

      this.dispatcher.on('invitationAccepted', this.invitationAccepted, this);
    },

    template: _.template($('#tpl-chat').html()),

    render: function() {
      var templateData = this.model ? this.model.attributes : { subscriberName: false };
      this.$el.html(this.template(templateData));
      return this;
    },

    invitationAccepted: function(invitation) {

      // Create a chat based on this invitation, and store it as the model for this view
      this.model = new Chat({}, {
        localUser: this.localUser,
        invitation: invitation
      });

      // The DOM elements required for the chat should appear on the page
      this.render();
      this.model.on('started', this.chatStarted, this);
      this.model.on('subscriberJoined', this.subscriberJoined, this);
      this.model.on('ended', this.chatEnded, this);
      this.model.start(this.$('.publisher')[0], this.$('.subscriber')[0]);
    },

    chatStarted: function() {
      // TODO: remove waiting to start blurb from DOM
    },

    subscriberJoined: function() {
      // TODO: remove waiting for subscriberName blurb from DOM
    },

    chatEnded: function() {
      this.model.off('started', this.chatStarted);
      this.model.off('ended', this.chatEnded);
      this.model = null;
      this.render();
      this.dispatcher.trigger('chatEnded');
      // TODO: maybe show something for a couple seconds to explain that the chat just ended
    },

    endButtonClicked: function() {
      this.model.end();
    }

  });

}(window, jQuery, Backbone, _, log, Chat));
