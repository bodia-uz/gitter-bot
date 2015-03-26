var EXPRESSION_PATTERN = /^[\(\)\*\/\+\-\d\.\s]+$/;

/**
 * Calculate expression using JS eval function
 * @param {string} expression - Arithmetic expression
 * @returns {number} - Arithmetic expression result
 */
function evalCalc(expression) {
  // check if expression is safe and use valid symbols
  if (!EXPRESSION_PATTERN.test(expression)) {
    throw new Error('Unexpected token used in expression');
  }

  try {

    // try evaluate using eval function
    return +eval(expression);

  } catch(e) {

    throw new Error('Invalid arithmetic expression');
  }
}

module.exports = evalCalc;