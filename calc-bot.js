var GitterBot = require('./bot.js');
var util = require('util');
var shuntingYardCalc = require('./calc/shunting-yard-calc.js');
var evalCalc = require('./calc/eval-calc.js');

var greetingMessage =
  '###Hello! I am Calc bot.\n' +
  'Type:\n' +
  '`calc: ...` to evaluate arithmetic expression using shunting yard algorithm.\n' +
  '`eval: ...` to evaluate arithmetic expression using JS eval function.\n' +
  'Use `()*/+-.` symbols only in expression.';

function GitterCalcBot(token, config) {
  var listeners = [
    {
      name: 'calc',
      pattern: /^calc (.+)/,
      eval: shuntingYardCalc
    },
    {
      name: 'eval',
      pattern: /^eval (.+)/,
      eval: evalCalc
    }
  ];

  config = config || {};
  config.botGreetingMessage = config.botGreetingMessage || greetingMessage;

  GitterBot.call(this, token, config, listeners);
}

util.inherits(GitterCalcBot, GitterBot);

module.exports = GitterCalcBot;


