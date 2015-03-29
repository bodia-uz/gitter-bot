var util = require('util');

var operators = {
  'u+': {argumentsCount: 1, precedence: 5, associativity: 'Right', eval: function(a) {return +a;}},
  'u-': {argumentsCount: 1, precedence: 5, associativity: 'Right', eval: function(a) {return -a;}},
  '*': {argumentsCount: 2, precedence: 3, associativity: 'Left', eval: function(a, b) {return a * b;}},
  '/': {argumentsCount: 2, precedence: 3, associativity: 'Left', eval: function(a, b) {return a / b;}},
  '+': {argumentsCount: 2, precedence: 2, associativity: 'Left', eval: function(a, b) {return a + b;}},
  '-': {argumentsCount: 2, precedence: 2, associativity: 'Left', eval: function(a, b) {return a - b;}}
};

// allow or disallow NaN and Infinity in result
var ALLOW_INVALID_OPERATION = false; // true | false

var DIGIT_OR_DOT = /[\d\.]/;

var tokenType = {
  NUMBER: 0,
  OPERATOR: 1,
  LEFT_PARENTHESIS: 2,
  RIGHT_PARENTHESIS: 3
};

var errorMessage = {
  UNMATCHED_PARENTHESIS: 'Unmatched parenthesis.',
  UNEXPECTED_TOKEN: 'Unexpected token "%s" at %s',
  UNEXPECTED_NUMBER: 'Unexpected number "%s"',
  INVALID_OPERATION: 'Invalid operation "%s=%s"',
  INVALID_ARITHMETIC_EXPRESSION: 'Invalid arithmetic expression'
};

/**
 * Calculate expression using shunting-yard algorithm
 * Check out {@link http://en.wikipedia.org/wiki/Shunting-yard_algorithm}
 * @param {string} expression - Arithmetic expression
 * @returns {number} - Arithmetic expression result
 */
function shuntingYardCalc(expression) {
  var output = [];
  var stack = [];

  var top;

  // While there are tokens to be read:

  _tokensEach(expression, function(token) {
    var number;
    var o1, o2;

    switch (token.type) {
      case tokenType.NUMBER:

        number = +token.value;

        // check token is valid number
        if (isNaN(number)) {
          throw new Error(util.format(errorMessage.UNEXPECTED_NUMBER, token.value));
        }

        output.push(number);
        break;

      case tokenType.OPERATOR:

        // If the token is an operator, o1, then

        o1 = token.value;

        // while there is an operator token, o2,
        // at the top of the operator stack, and either
        // o1 is left-associative and its precedence is less than or equal to that of o2, or
        // o1 is right associative, and has precedence less than that of o2,
        // then pop o2 off the operator stack
        // and try evaluate with the output queue;

        top = stack.length;

        while (--top >= 0 && (o2 = stack[top]) && o2 !== '(' && (
          _isLeft(o1) && _opPrecedence(o1) <= _opPrecedence(o2) ||
          _isRight(o1) && _opPrecedence(o1) < _opPrecedence(o2)
        )) {

          _evaluate(stack.pop(), output);

        } 

        // push o1 onto the operator stack.

        stack.push(o1);

        break;

      case tokenType.LEFT_PARENTHESIS:

        // If the token is a left parenthesis, then push it onto the stack.

        stack.push(token.value);

        break;

      case tokenType.RIGHT_PARENTHESIS:

        // If the token is a right parenthesis:

        // Until the token at the top of the stack is a left parenthesis,
        // pop operators off the stack onto the output queue.

        top = stack.length;
        while (--top >= 0 && stack[top] !== '(') {

          _evaluate(stack.pop(), output);

        }

        // Pop the left parenthesis from the stack, but not onto the output queue.

        if (stack.pop() !== '(') {

          // If the stack runs out without finding a left parenthesis, then there are mismatched parentheses.

          throw new Error(errorMessage.UNMATCHED_PARENTHESIS);
        }
        break;

      default:
        throw new Error(util.format(errorMessage.UNEXPECTED_TOKEN, token.value, token.index));
    }

  });

  // When there are no more tokens to read
  // While there are still operator tokens in the stack

  top = stack.length;
  while (--top >= 0) {

    if (stack[top] === '(' || stack[top] === ')') {

      // If the operator token on the top of the stack is a parenthesis,
      // then there are mismatched parentheses.

      throw new Error(errorMessage.UNMATCHED_PARENTHESIS);

    } else {

      // Evaluate the operator using the output queue.

      _evaluate(stack.pop(), output);
    }
  }

  return _fixNumber(output[0]);
}

/**
 * Evaluate operator `token` using arguments from `output` array.
 * Pop operator arguments from output array and push operator result
 * @param {string} token
 * @param {Array} output
 * @private
 */
function _evaluate(token, output) {
  var operator = operators[token];
  var operatorArguments = _arrayPop(output, operator.argumentsCount);

  // evaluate operator
  var operatorResult = operator.eval.apply(null, operatorArguments);

  if (!isFinite(operatorResult) && !ALLOW_INVALID_OPERATION) {
    // prevent zero division
    throw new Error(util.format(
      errorMessage.INVALID_OPERATION,
      operatorArguments.map(_fixNumber).join(token),
      operatorResult
    ));
  }

  output.push(operatorResult);
}

/**
 * Iterates over tokens of `expression` invoking `iteratee` for each token.
 * @param {string} expression
 * @param {Function} iteratee
 * @private
 */
function _tokensEach(expression, iteratee) {
  _getTokens(expression).forEach(iteratee);
}

/**
 * Convert string to token array
 * @param {string} expression
 * @returns {Array<string>} tokens array
 * @private
 */
function _getTokens(expression) {
  var tokens = [];

  expression.split('').forEach(function(char, index) {
    var prevToken = tokens[tokens.length - 1];

    if (DIGIT_OR_DOT.test(char)) {

      // if is digit or dot

      if (prevToken && prevToken.type === tokenType.NUMBER) {

        // if previous token also number part
        // concatenate
        prevToken.value += char;

      } else {

        // push number
        tokens.push({
          value: char,
          type: tokenType.NUMBER,
          index: index
        });
      }

    } else if (operators.hasOwnProperty(char)) {

      // if +, -, *, / etc.

      // NOTE: if token is '+' or '-'
      // and previous token is operator or left parenthesis '('
      // or is expression start
      // then mark operator as unary

      tokens.push({
        value: _isUnaryOperator(char, prevToken) ? 'u' + char : char,
        type: tokenType.OPERATOR,
        index: index
      });

    } else if (char === '(') {

      if (prevToken && prevToken.type !== tokenType.OPERATOR) {
        // insert multiplier
        tokens.push({
          value: '*',
          type: tokenType.OPERATOR,
          index: index
        });
      }

      tokens.push({
        value: char,
        type: tokenType.LEFT_PARENTHESIS,
        index: index
      });

    } else if (char === ')') {

      if (prevToken.type === tokenType.LEFT_PARENTHESIS) {
        // skip empty parenthesis
        throw new Error(util.format(errorMessage.INVALID_ARITHMETIC_EXPRESSION));
      }

      tokens.push({
        value: char,
        type: tokenType.RIGHT_PARENTHESIS,
        index: index
      });

    } else if (char !== ' ') {
      throw new Error(util.format(errorMessage.UNEXPECTED_TOKEN, char, index));
    }

  });

  return tokens;
}

/**
 * Check if token char in unary operation
 * @param {Object} char - current token char
 * @param {Object} tokenBefore - previous token
 * @returns {boolean}
 * @private
 */
function _isUnaryOperator(char, tokenBefore) {
  return (
    (char === '+' || char === '-') &&
    (!tokenBefore || tokenBefore.type === tokenType.OPERATOR || tokenBefore.type === tokenType.LEFT_PARENTHESIS)
  );
}

function _isLeft(token) {
  return operators[token].associativity === 'Left';
}

function _isRight(token) {
  return operators[token].associativity === 'Right';
}

function _opPrecedence(token) {
  return operators[token].precedence;
}

/**
 * Convert result as 0.020000000000000004 to 0.02
 * @param {Number} num
 * @returns {Number}
 * @private
 */
function _fixNumber(num) {
  return num && parseFloat(num.toPrecision(12));
}

/**
 * Pop multiple elements form `array`
 * @param {Array} array
 * @param {number} popCount - elements count to pop
 * @returns {Array} - return elements that was pop put
 * @private
 */
function _arrayPop(array, popCount) {
  return array.splice(array.length - popCount, popCount);
}

module.exports = shuntingYardCalc;