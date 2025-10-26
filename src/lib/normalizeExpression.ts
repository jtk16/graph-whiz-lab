import { tokenize, Token, TokenType } from './parser/tokenizer';

/**
 * Normalization Layer: LaTeX → Calculator Shorthand
 * 
 * Converts LaTeX notation to the shorthand format expected by our parser.
 * This is the bridge between the visual LaTeX editor and our custom parser.
 */

export function normalizeExpression(latex: string): string {
  if (!latex) return '';
  
  let normalized = latex;
  
  // === DERIVATIVE OPERATORS (must come first) ===
  
  // Ordinary derivatives: \frac{d}{dx} → d/d{x}
  // Also handles \frac{df}{dx} (ignores the f in numerator)
  normalized = normalized.replace(
    /\\frac\{d(?:[a-zA-Z])?\}\{d([a-zA-Z]+)\}/g,
    'd/d{$1}'
  );
  
  // Partial derivatives: \frac{\partial}{\partial x} → ∂/∂{x}
  // Also handles \frac{\partial f}{\partial x}
  normalized = normalized.replace(
    /\\frac\{\\partial(?:\s*[a-zA-Z])?\}\{\\partial\s*([a-zA-Z]+)\}/g,
    '∂/∂{$1}'
  );
  
  // Higher-order ordinary: \frac{d^2}{dx^2} → d/d{x}(d/d{x}(...))
  normalized = normalized.replace(
    /\\frac\{d\^(\d+)\}\{d([a-zA-Z]+)\^(\d+)\}/g,
    (match, order, varName) => {
      const n = parseInt(order);
      let result = '';
      for (let i = 0; i < n; i++) {
        result = `d/d{${varName}}(` + result;
      }
      return result; // Opening parens, content follows, user needs to close them
    }
  );
  
  // Mixed partials: \frac{\partial^2}{\partial x \partial y} → ∂/∂{y}(∂/∂{x}(...))
  normalized = normalized.replace(
    /\\frac\{\\partial\^2\}\{\\partial\s*([a-zA-Z]+)\\s*\\partial\s*([a-zA-Z]+)\}/g,
    '∂/∂{$2}(∂/∂{$1}('
  );
  
  // Remove y = prefix if present (common in graphing)
  normalized = normalized.replace(/^y\s*=\s*/, '');
  
  // Convert LaTeX piecewise notation to piecewise() function
  // Pattern: \begin{cases} val1 & cond1 \\ val2 & cond2 \\ ... \\ default \end{cases}
  const piecewiseMatch = normalized.match(/\\begin\{cases\}(.+?)\\end\{cases\}/s);
  if (piecewiseMatch) {
    const content = piecewiseMatch[1];
    // Split by \\ and parse each line
    const cases = content.split('\\\\').map(c => c.trim()).filter(c => c);
    const args: string[] = [];
    
    for (const caseStr of cases) {
      const parts = caseStr.split('&').map(p => p.trim());
      if (parts.length === 2) {
        // condition & value format -> add as (condition, value)
        args.push(parts[1], parts[0]); // condition, value
      } else if (parts.length === 1) {
        // default value (no condition)
        args.push(parts[0]);
      }
    }
    
    // Build piecewise(cond1, val1, cond2, val2, ..., default)
    normalized = normalized.replace(piecewiseMatch[0], `piecewise(${args.join(',')})`);
  }
  
  // Note: LaTeX normalization is now handled by the operations registry
  // But we keep some common patterns here for bootstrap/compatibility
  // Trig functions
  normalized = normalized.replace(/\\sin/g, 'sin');
  normalized = normalized.replace(/\\cos/g, 'cos');
  normalized = normalized.replace(/\\tan/g, 'tan');
  normalized = normalized.replace(/\\ln/g, 'ln');
  normalized = normalized.replace(/\\log/g, 'log');
  normalized = normalized.replace(/\\exp/g, 'exp');
  normalized = normalized.replace(/\\abs/g, 'abs');
  normalized = normalized.replace(/\\sqrt/g, 'sqrt');
  
  // Fractions: \frac{a}{b} → (a)/(b)
  normalized = normalized.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
  
  // Greek letters → names
  normalized = normalized.replace(/\\theta/g, 'theta');
  normalized = normalized.replace(/\\pi/g, 'pi');
  normalized = normalized.replace(/\\alpha/g, 'alpha');
  normalized = normalized.replace(/\\beta/g, 'beta');
  normalized = normalized.replace(/\\gamma/g, 'gamma');
  
  // Exponents: x^{2} → x^2
  normalized = normalized.replace(/\^\{([^}]+)\}/g, '^($1)');
  
  // Subscripts: f_{1} → f_1, f_a → f_a
  normalized = normalized.replace(/_\{([^}]+)\}/g, '_$1');
  // Already handles single-char subscripts like f_1
  
  // Floor notation: ⌊x⌋ → floor(x)
  normalized = normalized.replace(/\\lfloor\s*([^\\]+?)\\rfloor/g, 'floor($1)');
  
  // Ceiling notation: ⌈x⌉ → ceil(x)
  normalized = normalized.replace(/\\lceil\s*([^\\]+?)\\rceil/g, 'ceil($1)');
  
  // Common LaTeX commands to remove
  normalized = normalized.replace(/\\left/g, '');
  normalized = normalized.replace(/\\right/g, '');
  normalized = normalized.replace(/\\cdot/g, '*');
  normalized = normalized.replace(/\\times/g, '*');
  normalized = normalized.replace(/\\bmod/g, '%');
  normalized = normalized.replace(/\\mod/g, '%');
  
  // Clean up whitespace
  normalized = normalized.trim();
  
  // Final pass: re-tokenize to enforce explicit multiplication (e.g., i*z) and emit a canonical form.
  let finalExpr = tokensToExpression(tokenize(normalized));
  finalExpr = finalExpr.replace(/(^|[^a-zA-Z0-9_])i(?=[xyztrXYZTR])/g, '$1i*');
  return finalExpr;
}

function tokensToExpression(tokens: Token[]): string {
  return tokens
    .map(token => {
      switch (token.type) {
        case TokenType.Number:
        case TokenType.Identifier:
        case TokenType.Operator:
        case TokenType.Imaginary:
          return token.value;
        case TokenType.ParenthesisOpen:
          return '(';
        case TokenType.ParenthesisClose:
          return ')';
        case TokenType.BracketOpen:
          return '[';
        case TokenType.BracketClose:
          return ']';
        case TokenType.BraceOpen:
          return '{';
        case TokenType.BraceClose:
          return '}';
        case TokenType.Comma:
          return ',';
        default:
          return token.value;
      }
    })
    .join('');
}
