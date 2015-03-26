// http://en.wikipedia.org/wiki/Shunting-yard_algorithm

var operators = {
  'u+': {argumentsCount: 1, precedence: 5, associativity: 'Right', eval: function(a) {return +a;}},
  'u-': {argumentsCount: 1, precedence: 5, associativity: 'Right', eval: function(a) {return -a;}},
  '^': {argumentsCount: 2, precedence: 4, associativity: 'Right', eval: function(a, b) {return Math.pow(a, b);}},
  '*': {argumentsCount: 2, precedence: 3, associativity: 'Left', eval: function(a, b) {return a * b;}},
  '/': {argumentsCount: 2, precedence: 3, associativity: 'Left', eval: function(a, b) {return a / b;}},
  '+': {argumentsCount: 2, precedence: 2, associativity: 'Left', eval: function(a, b) {return a + b;}},
  '-': {argumentsCount: 2, precedence: 2, associativity: 'Left', eval: function(a, b) {return a - b;}}
};

/**
 * Calculate expression using shunting-yard algorithm
 * @param {string} expression - Arithmetic expression
 * @returns {number} - Arithmetic expression result
 */
function shuntingYardCalc(expression) {
  var output = [];
  var stack = [];

  var prevToken = null;

  var top;

  // While there are tokens to be read:

  _getTokens(expression).forEach(function(token, index) {
    var top, o1, o2;

    if (_isNumber(token)) {
      if (_isNumber(prevToken)) {
        // if previous token also number part
        // concatenate
        output[output.length - 1] = +(output[output.length - 1] + token);
      } else {
        output.push(+token);
      }
    }
    else if (_isOperator(token)) {

      // If the token is an operator, o1, then

      // if token is '+' or '-'
      // and previous token is operator or left parenthesis '('
      // or is expression start
      // then mark operator as unary

      if (_isUnary(token, prevToken)) {
        token = 'u' + token;
      }

      o1 = token;

      top = stack.length;

      while (--top >= 0 && (o2 = stack[top]) && _isOperator(o2) && (
        _isLeft(o1) && _precedence(o1) <= _precedence(o2) ||
        _isRight(o1) && _precedence(o1) < _precedence(o2)
        )) {

        // while there is an operator token, o2,
        // at the top of the operator stack, and either
        // o1 is left-associative and its precedence is less than or equal to that of o2, or
        // o1 is right associative, and has precedence less than that of o2,
        // then pop o2 off the operator stack
        // and try evaluate with the output queue;

        _evaluate(stack.pop(), output);
      }

      // push o1 onto the operator stack.

      stack.push(o1);
    }
    else if (token === '(') {

      // If the token is a left parenthesis, then push it onto the stack.

      stack.push(token);
    }
    else if (token === ')') {

      // If the token is a right parenthesis:

      top = stack.length;
      while (--top >= 0 && stack[top] !== '(') {

        // Until the token at the top of the stack is a left parenthesis,
        // pop operators off the stack onto the output queue.

        _evaluate(stack.pop(), output);
      }

      // Pop the left parenthesis from the stack, but not onto the output queue.

      if (stack.pop() !== '(') {

        // If the stack runs out without finding a left parenthesis, then there are mismatched parentheses.

        throw new Error('Unmatched parenthesis. Character number ' + index);
      }
    }
    else {
      throw new Error('Unexpected token ' + token);
    }

    prevToken = token;

    console.log('token, output, stack', token, output, stack);
  });

  // When there are no more tokens to read

  top = stack.length;

  while (--top >= 0) {

    // While there are still operator tokens in the stack

    if (stack[top] === '(' || stack[top] === ')') {

      //If the operator token on the top of the stack is a parenthesis, then there are mismatched parentheses.

      throw new Error('Unmatched parenthesis.');

    } else {

      // Pop the operator onto the output queue.

      _evaluate(stack.pop(), output);
    }
  }

  return output[0];
}

function _evaluate(token, output) {
  var operator = operators[token];
  var operatorArguments = _arrayPop(output, operator.argumentsCount);

  // evaluate operator
  var operatorResult = operator.eval.apply(null, operatorArguments);

  output.push(operatorResult);
}

function _getTokens(expression) {
  return expression
    .split('')
    .filter(function(c) {
      return c !== ' ';
    });
}

function _isNumber(token) {
  return /[\d\.]/.test(token);
}

function _isOperator(token) {
  return operators.hasOwnProperty(token);
}

function _isLeft(token) {
  return operators[token].associativity === 'Left';
}

function _isRight(token) {
  return operators[token].associativity === 'Right';
}

function _isUnary(token, prevToken) {
  return (token === '+' || token === '-') && (prevToken === null || _isOperator(prevToken) || prevToken === '(')
}

function _precedence(token) {
  return operators[token].precedence;
}

/**
 * pop multiple elements form array
 * @param {Array} array
 * @param {number} popCount - elements count to pop
 * @returns {Array}
 */
function _arrayPop(array, popCount) {
  return array.splice(array.length - popCount, popCount);
}

module.exports = shuntingYardCalc;