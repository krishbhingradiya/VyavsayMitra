/**
 * VYAVSAYMITRA — Safe Mathematical Expression AST Engine
 * 
 * Implements a strict, whitelisted tokenizer, recursive descent parser, and AST evaluator.
 * 
 * CRITICAL SAFETY RULES:
 * - ZERO eval()
 * - ZERO new Function()
 * - ZERO arbitrary code execution (no VM, no Python/JS eval)
 * - Whitelisted operators ONLY: +, -, *, /, %
 * - Whitelisted math functions ONLY: min, max, abs, round
 * - Strict division-by-zero checks
 * - Strict unknown identifier rejection
 * - Strict non-numeric input validation
 */

const WHITELISTED_FUNCTIONS = ['min', 'max', 'abs', 'round'];

// Token Types
const TOKEN_TYPES = {
  NUMBER: 'NUMBER',
  IDENTIFIER: 'IDENTIFIER',
  OPERATOR: 'OPERATOR',
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  COMMA: 'COMMA',
  EOF: 'EOF'
};

/**
 * Tokenizes a mathematical expression safely
 * 
 * @param {string} expr - Expression string
 * @returns {Array<{ type: string, value: any, pos: number }>}
 */
function tokenize(expr) {
  if (typeof expr !== 'string') {
    throw new Error('Expression must be a string');
  }

  // Pre-screen against forbidden JavaScript / shell injection patterns
  const forbiddenPatterns = [
    /eval\b/i,
    /function\b/i,
    /=>/,
    /process\b/i,
    /global\b/i,
    /window\b/i,
    /require\b/i,
    /import\b/i,
    /__proto__/i,
    /constructor/i,
    /prototype/i,
    /;/,
    /`/,
    /\${/,
    /\[/,
    /\]/,
    /\{/,
    /\}/,
    /=/
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(expr)) {
      throw new Error(`Unsafe expression rejected: forbidden pattern '${pattern.source}' detected`);
    }
  }

  const tokens = [];
  let i = 0;
  const len = expr.length;

  while (i < len) {
    const ch = expr[i];

    // Whitespace
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Number literals (including decimal points)
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(expr[i + 1] || ''))) {
      let numStr = '';
      let hasDot = false;
      const startPos = i;
      while (i < len && (/[0-9]/.test(expr[i]) || expr[i] === '.')) {
        if (expr[i] === '.') {
          if (hasDot) throw new Error(`Malformed number at position ${i}: multiple decimal points`);
          hasDot = true;
        }
        numStr += expr[i];
        i++;
      }
      tokens.push({ type: TOKEN_TYPES.NUMBER, value: parseFloat(numStr), pos: startPos });
      continue;
    }

    // Identifiers (variable names & whitelisted function names)
    if (/[a-zA-Z_]/.test(ch)) {
      let idStr = '';
      const startPos = i;
      while (i < len && /[a-zA-Z0-9_]/.test(expr[i])) {
        idStr += expr[i];
        i++;
      }
      tokens.push({ type: TOKEN_TYPES.IDENTIFIER, value: idStr, pos: startPos });
      continue;
    }

    // Operators
    if (['+', '-', '*', '/', '%'].includes(ch)) {
      tokens.push({ type: TOKEN_TYPES.OPERATOR, value: ch, pos: i });
      i++;
      continue;
    }

    // Parentheses
    if (ch === '(') {
      tokens.push({ type: TOKEN_TYPES.LPAREN, value: '(', pos: i });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: TOKEN_TYPES.RPAREN, value: ')', pos: i });
      i++;
      continue;
    }

    // Argument separator
    if (ch === ',') {
      tokens.push({ type: TOKEN_TYPES.COMMA, value: ',', pos: i });
      i++;
      continue;
    }

    throw new Error(`Unexpected character '${ch}' at position ${i} in expression`);
  }

  tokens.push({ type: TOKEN_TYPES.EOF, value: null, pos: len });
  return tokens;
}

/**
 * Recursive Descent Parser for safe mathematical grammar
 */
class ExpressionParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.current = 0;
  }

  peek() {
    return this.tokens[this.current] || { type: TOKEN_TYPES.EOF, value: null };
  }

  consume(expectedType, expectedValue = null) {
    const token = this.peek();
    if (token.type !== expectedType || (expectedValue !== null && token.value !== expectedValue)) {
      throw new Error(
        `Syntax Error: Expected ${expectedType}${expectedValue ? ` '${expectedValue}'` : ''} but found ${token.type} '${token.value}' at position ${token.pos}`
      );
    }
    this.current++;
    return token;
  }

  parse() {
    const ast = this.parseExpression();
    if (this.peek().type !== TOKEN_TYPES.EOF) {
      throw new Error(`Unexpected trailing token '${this.peek().value}' at position ${this.peek().pos}`);
    }
    return ast;
  }

  parseExpression() {
    return this.parseAdditive();
  }

  parseAdditive() {
    let node = this.parseMultiplicative();

    while (this.peek().type === TOKEN_TYPES.OPERATOR && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.consume(TOKEN_TYPES.OPERATOR).value;
      const right = this.parseMultiplicative();
      node = {
        type: 'BinaryExpression',
        operator: op,
        left: node,
        right: right
      };
    }

    return node;
  }

  parseMultiplicative() {
    let node = this.parseUnary();

    while (this.peek().type === TOKEN_TYPES.OPERATOR && (this.peek().value === '*' || this.peek().value === '/' || this.peek().value === '%')) {
      const op = this.consume(TOKEN_TYPES.OPERATOR).value;
      const right = this.parseUnary();
      node = {
        type: 'BinaryExpression',
        operator: op,
        left: node,
        right: right
      };
    }

    return node;
  }

  parseUnary() {
    if (this.peek().type === TOKEN_TYPES.OPERATOR && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.consume(TOKEN_TYPES.OPERATOR).value;
      const argument = this.parseUnary();
      return {
        type: 'UnaryExpression',
        operator: op,
        argument: argument
      };
    }

    return this.parsePrimary();
  }

  parsePrimary() {
    const token = this.peek();

    // Number literal
    if (token.type === TOKEN_TYPES.NUMBER) {
      this.consume(TOKEN_TYPES.NUMBER);
      return { type: 'NumberLiteral', value: token.value };
    }

    // Identifiers or Function Calls
    if (token.type === TOKEN_TYPES.IDENTIFIER) {
      const idToken = this.consume(TOKEN_TYPES.IDENTIFIER);

      // Check if it's a function call e.g. min(...)
      if (this.peek().type === TOKEN_TYPES.LPAREN) {
        const funcName = idToken.value.toLowerCase();
        if (!WHITELISTED_FUNCTIONS.includes(funcName)) {
          throw new Error(`Forbidden function call '${idToken.value}'. Only [${WHITELISTED_FUNCTIONS.join(', ')}] are permitted`);
        }

        this.consume(TOKEN_TYPES.LPAREN);
        const args = [];
        if (this.peek().type !== TOKEN_TYPES.RPAREN) {
          args.push(this.parseExpression());
          while (this.peek().type === TOKEN_TYPES.COMMA) {
            this.consume(TOKEN_TYPES.COMMA);
            args.push(this.parseExpression());
          }
        }
        this.consume(TOKEN_TYPES.RPAREN);

        return {
          type: 'CallExpression',
          callee: funcName,
          arguments: args
        };
      }

      // Regular Variable Identifier
      return { type: 'Identifier', name: idToken.value };
    }

    // Grouping: (Expression)
    if (token.type === TOKEN_TYPES.LPAREN) {
      this.consume(TOKEN_TYPES.LPAREN);
      const expr = this.parseExpression();
      this.consume(TOKEN_TYPES.RPAREN);
      return expr;
    }

    throw new Error(`Syntax Error: Unexpected token '${token.value || token.type}' at position ${token.pos}`);
  }
}

/**
 * Extracts all unique variable names from an AST
 * 
 * @param {Object} ast - AST root
 * @returns {string[]} List of variable names
 */
function extractVariables(ast) {
  const vars = new Set();

  function walk(node) {
    if (!node) return;
    if (node.type === 'Identifier') {
      vars.add(node.name);
    } else if (node.type === 'BinaryExpression') {
      walk(node.left);
      walk(node.right);
    } else if (node.type === 'UnaryExpression') {
      walk(node.argument);
    } else if (node.type === 'CallExpression') {
      for (const arg of node.arguments) {
        walk(arg);
      }
    }
  }

  walk(ast);
  return Array.from(vars);
}

/**
 * Safely evaluates an AST given a context of variable values
 * 
 * @param {Object} ast - AST root
 * @param {Object} context - Map of parameterId -> numeric value
 * @returns {number} Evaluated result
 */
function evaluateAst(ast, context = {}) {
  if (!ast) {
    throw new Error('Cannot evaluate empty AST');
  }

  switch (ast.type) {
    case 'NumberLiteral':
      return ast.value;

    case 'Identifier': {
      if (!(ast.name in context)) {
        throw new Error(`Unknown variable '${ast.name}' referenced in formula expression`);
      }
      const rawVal = context[ast.name];
      if (rawVal === undefined || rawVal === null) {
        throw new Error(`Missing value for required variable '${ast.name}'`);
      }
      const num = Number(rawVal);
      if (isNaN(num)) {
        throw new Error(`Variable '${ast.name}' has non-numeric value '${rawVal}'`);
      }
      return num;
    }

    case 'UnaryExpression': {
      const val = evaluateAst(ast.argument, context);
      return ast.operator === '-' ? -val : val;
    }

    case 'BinaryExpression': {
      const leftVal = evaluateAst(ast.left, context);
      const rightVal = evaluateAst(ast.right, context);

      switch (ast.operator) {
        case '+':
          return leftVal + rightVal;
        case '-':
          return leftVal - rightVal;
        case '*':
          return leftVal * rightVal;
        case '/':
          if (rightVal === 0) {
            throw new Error(`Division by zero encountered in formula execution (dividing ${leftVal} by 0)`);
          }
          return leftVal / rightVal;
        case '%':
          if (rightVal === 0) {
            throw new Error(`Modulo by zero encountered in formula execution`);
          }
          return leftVal % rightVal;
        default:
          throw new Error(`Unsupported binary operator '${ast.operator}'`);
      }
    }

    case 'CallExpression': {
      const evaluatedArgs = ast.arguments.map(arg => evaluateAst(arg, context));

      switch (ast.callee) {
        case 'min':
          if (evaluatedArgs.length === 0) throw new Error("Function 'min' requires at least 1 argument");
          return Math.min(...evaluatedArgs);
        case 'max':
          if (evaluatedArgs.length === 0) throw new Error("Function 'max' requires at least 1 argument");
          return Math.max(...evaluatedArgs);
        case 'abs':
          if (evaluatedArgs.length !== 1) throw new Error("Function 'abs' requires exactly 1 argument");
          return Math.abs(evaluatedArgs[0]);
        case 'round':
          if (evaluatedArgs.length === 1) {
            return Math.round(evaluatedArgs[0]);
          } else if (evaluatedArgs.length === 2) {
            const factor = Math.pow(10, evaluatedArgs[1]);
            return Math.round(evaluatedArgs[0] * factor) / factor;
          }
          throw new Error("Function 'round' requires 1 or 2 arguments");
        default:
          throw new Error(`Unsupported function call '${ast.callee}'`);
      }
    }

    default:
      throw new Error(`Unknown AST node type '${ast.type}'`);
  }
}

/**
 * End-to-end safe formula parser & evaluator helper
 * 
 * @param {string} expression - Mathematical formula expression
 * @param {Object} context - Input variables
 * @returns {{ result: number, variables: string[], ast: Object }}
 */
function safeEvaluateExpression(expression, context = {}) {
  const tokens = tokenize(expression);
  const parser = new ExpressionParser(tokens);
  const ast = parser.parse();
  const variables = extractVariables(ast);
  const result = evaluateAst(ast, context);

  return {
    result,
    variables,
    ast
  };
}

module.exports = {
  WHITELISTED_FUNCTIONS,
  tokenize,
  ExpressionParser,
  extractVariables,
  evaluateAst,
  safeEvaluateExpression
};
