var Gitter = require('node-gitter');
var util = require('util');

var CALC_PATTERN = /^calc (.+)/;
var EXPRESSION_PATTERN = /^[\(\)\*\/\+\-\d\.\s]+$/;

var defaultOptions = {
  calcResultFormat: '>@%s: %s\n\n$$%s=%d$$',
  calcErrorFormat: '>@%s: %s\n\n$$%s$$ - %s',
  botGreetingMessage: false,
  invalidSymbolsUsedMessage: 'invalid symbols used in expression',
  invalidExpressionMessage: 'invalid arithmetic expression'
};

/**
 * Gitter Bot constructor
 * @param {string} token
 * @param {object} config
 * @param {string} [config.botGreetingMessage] - bot greeting message
 * @param {string} [config.calcResultFormat] - calc result format
 * @param {string} [config.calcErrorFormat] - calc error format
 * @param {string} [config.invalidSymbolsUsedMessage] - calc invalid symbols used error message
 * @param {string} [config.invalidExpressionMessage] - calc invalid expression error message
 * @constructor
 */
function GitterBot(token, config) {
  this.gitter = new Gitter(token);

  var _config = {};

  // set config default options
  Object.keys(defaultOptions).forEach(function(key) {
    _config[key] = (config && config[key]) || defaultOptions[key];
  });

  this.config = _config;
}

/**
 * Join to room
 * @param {string} roomName
 * @returns {Object} - room promise
 */
GitterBot.prototype.joinRoom = function(roomName) {
  var gitter = this.gitter;

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
  var gitter = this.gitter;

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

  if (this.config.botGreetingMessage) {
    room.send(this.config.botGreetingMessage);
  }

  return this._listenRoom(room)
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
  var match;
  var expression;
  var expressionResult;

  // check if message text match calc pattern
  match = message.text.match(CALC_PATTERN);

  if (match) {

    // if calc pattern matched
    // check if expression is safe and uses valid symbols
    // and try evaluate

    expression = match[1];

    if (!EXPRESSION_PATTERN.test(expression)) {
      util.log('calc:', expression + ' - ' + this.config.invalidSymbolsUsedMessage);
      room.send(this._formatInvalidExpression(message, expression, this.config.invalidSymbolsUsedMessage));
      return;
    }

    try {
      expressionResult = +eval(expression);

      util.log('calc:', expression + '=' + expressionResult);
      room.send(this._formatExpressionResult(message, expression, expressionResult));

    } catch(e) {
      util.log('calc:', expression + ' - ' + this.config.invalidExpressionMessage);
      room.send(this._formatInvalidExpression(message, expression, this.config.invalidExpressionMessage));
    }
  }
};

/**
 * Format valid arithmetic expression
 * @param {Object} message
 * @param {User} message.fromUser - User that sent the message
 * @param {string} message.fromUser.username - Name of user that sent the message
 * @param {string} message.text - Plain message text
 * @param {string} expression - arithmetic expression
 * @param {number} result - arithmetic expression result
 * @private
 */
GitterBot.prototype._formatExpressionResult = function(message, expression, result) {
  return util.format(this.config.calcResultFormat, message.fromUser.username, message.text, expression, result);
};

/**
 * Format invalid arithmetic expression error message
 * @param {Object} message
 * @param {User} message.fromUser - User that sent the message
 * @param {string} message.fromUser.username - Name of user that sent the message
 * @param {string} message.text - Plain message text
 * @param {string} expression - arithmetic expression
 * @param {string} errorMessage - invalid arithmetic expression error message
 * @private
 */
GitterBot.prototype._formatInvalidExpression = function(message, expression, errorMessage) {
  return util.format(this.config.calcErrorFormat, message.fromUser.username, message.text, expression, errorMessage);
};

module.exports = GitterBot;
