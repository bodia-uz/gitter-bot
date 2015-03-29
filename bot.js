var Gitter = require('node-gitter');
var util = require('util');

var defaultOptions = {
  botGreetingMessage: false,
  evalResultFormat: '>@%s: %s\n\n$$%s=%d$$',
  evalErrorFormat: '>@%s: %s\n\n$$%s$$ - %s'
};

/**
 * Gitter Bot constructor
 * @param {string} token
 * @param {object} config
 * @param {string} [config.botGreetingMessage] - bot greeting message
 * @param {string} [config.evalResultFormat] - eval result format
 * @param {string} [config.evalErrorFormat] - eval error format
 * @param {Array<Object>} listeners
 * @constructor
 */
function GitterBot(token, config, listeners) {
  this._gitter = new Gitter(token);

  // set config default options
  this._config = {};
  for (var option in defaultOptions) {
    if (defaultOptions.hasOwnProperty(option)) {
      this._config[option] = (config && config[option]) || defaultOptions[option];
    }
  }

  this._listeners = [];

  if (listeners && listeners.length) {
    this.setListeners(listeners);
  }
}

GitterBot.prototype.setListeners = function(listeners) {
  this._listeners = [];
  listeners.forEach(this.registerMessageListener.bind(this));
};

/**
 * Register room message listener
 * @param {Object} listener
 * @param {string} listener.name
 * @param {RegExp} listener.pattern
 * @param {Function} listener.eval
 */
GitterBot.prototype.registerMessageListener = function(listener) {
  if (typeof listener.name !== 'string') {
    throw Error('Message listener not provided.');
  }

  if (!(listener.pattern instanceof RegExp)) {
    throw Error('Message listener pattern is not RegExp.');
  }

  if (!(listener.eval instanceof Function)) {
    throw Error('Message listener eval is not Function.');
  }

  this._listeners.push(listener);
};

/**
 * Join to room
 * @param {string} roomName
 * @returns {Object} - room promise
 */
GitterBot.prototype.joinRoom = function(roomName) {
  var gitter = this._gitter;

  if (!this._listeners.length) {
    throw Error('There are no message listeners for bot');
  }

  return gitter.rooms.join(roomName)
    .then(function(room) {
      return [gitter.currentUser(), room];
    })
    .spread(this._handleBotJoined.bind(this))
    .fail(function(err) {
      util.log('Not possible to join the room: ', err);
    });
};

/**
 * Leave a room
 * @param {string} roomName
 * @returns {Object} - room leave promise
 */
GitterBot.prototype.leaveRoom = function(roomName) {
  var gitter = this._gitter;

  return gitter.currentUser()
    .then(function(botUser) {
      return [botUser, botUser.rooms()];
    })
    .spread(function(botUser, rooms) {
      var room;

      // check if bot user is in room with roomName as name

      for (var i = 0, len = rooms.length; i < len; i++) {
        if (rooms[i].name === roomName) {
          room = rooms[i];
          break;
        }
      }

      return [botUser, room && gitter.rooms.find(room.id)];
    })
    .spread(function(botUser, room) {
      // if bot user is in room
      // leave room
      if (room) {
        room.removeUser(botUser.id);

        util.log('Gitter bot ' + botUser.username + ' leave room ' + roomName);
      } else {
        util.log('Gitter bot ' + botUser.username + ' is not in room ' + roomName);
      }

    })
    .fail(function(err) {
      util.log('An error occurred when bot try to leave the room: ', err);
    });
};

/**
 * Start listen room
 * @param {User} botUser
 * @param {string} botUser.username
 * @param {Room} room
 * @param {string} room.name
 * @returns {Room}
 * @private
 */
GitterBot.prototype._handleBotJoined = function(botUser, room) {
  util.log('Gitter bot ' + botUser.username + ' in room ' + room.name);

  if (this._config.botGreetingMessage) {
    room.send(this._config.botGreetingMessage);
  }

  return this._listenRoom(room);
};

/**
 * Start listen room
 * @param {Room} room
 * @returns {Room}
 * @private
 */
GitterBot.prototype._listenRoom = function(room) {
  util.log('Start listening room for new messages');

  room.listen().on('message', this._handleRoomMessage.bind(this, room));

  return room;
};

/**
 * Handle room message
 * @param {Room} room
 * @param {Object} message
 * @param {string} message.fromUser - User that sent the message
 * @param {string} message.text - Plain message text
 * @private
 */
GitterBot.prototype._handleRoomMessage = function(room, message) {
  var self = this;

  this._listeners.forEach(function(listener) {
    var match;
    var expression;
    var expressionResult;

    // check if message text match listener pattern
    match = message.text.match(listener.pattern);

    if (match) {

      // if listener pattern matched
      // and try evaluate

      expression = match[1];

      try {
        expressionResult = listener.eval(expression);

        util.log(listener.name + ': ' + expression + ' - ' + expressionResult);
        room.send(self._formatExpressionResult(message, expression, expressionResult));

      } catch(e) {
        util.log(listener.name + ': ' + expression + ' - ' + e.message);
        room.send(self._formatInvalidExpression(message, expression, e.message));
      }
    }
  });
};

/**
 * Format valid arithmetic expression
 * @param {Object} message
 * @param {User} message.fromUser - User that sent the message
 * @param {string} message.fromUser.username - Name of user that sent the message
 * @param {string} message.text - Plain message text
 * @param {string} expression
 * @param {number} result
 * @private
 */
GitterBot.prototype._formatExpressionResult = function(message, expression, result) {
  return util.format(this._config.evalResultFormat, message.fromUser.username, message.text, expression, result);
};

/**
 * Format invalid arithmetic expression error message
 * @param {Object} message
 * @param {User} message.fromUser - User that sent the message
 * @param {string} message.fromUser.username - Name of user that sent the message
 * @param {string} message.text - Plain message text
 * @param {string} expression
 * @param {string} errorMessage
 * @private
 */
GitterBot.prototype._formatInvalidExpression = function(message, expression, errorMessage) {
  return util.format(this._config.evalErrorFormat, message.fromUser.username, message.text, expression, errorMessage);
};

module.exports = GitterBot;
