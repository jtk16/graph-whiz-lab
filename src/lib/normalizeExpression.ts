/**
 * Normalization Layer: LaTeX → Calculator Shorthand
 * 
 * Converts LaTeX notation to the shorthand format expected by our parser.
 * This is the bridge between the visual LaTeX editor and our custom parser.
 */

export function normalizeExpression(latex: string): string {
  if (!latex) return '';
  
  let normalized = latex;
  
  // Remove y = prefix if present (common in graphing)
  normalized = normalized.replace(/^y\s*=\s*/, '');
  
  // Convert LaTeX functions to shorthand
  // Trig functions: \sin x → sin(x)
  normalized = normalized.replace(/\\sin\s+([a-zA-Z0-9])/g, 'sin($1)');
  normalized = normalized.replace(/\\cos\s+([a-zA-Z0-9])/g, 'cos($1)');
  normalized = normalized.replace(/\\tan\s+([a-zA-Z0-9])/g, 'tan($1)');
  
  // Square root: \sqrt{x} → sqrt(x)
  normalized = normalized.replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)');
  
  // Fractions: \frac{a}{b} → (a)/(b)
  normalized = normalized.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
  
  // Greek letters → names
  normalized = normalized.replace(/\\theta/g, 'theta');
  normalized = normalized.replace(/\\pi/g, 'pi');
  normalized = normalized.replace(/\\alpha/g, 'alpha');
  normalized = normalized.replace(/\\beta/g, 'beta');
  normalized = normalized.replace(/\\gamma/g, 'gamma');
  
  // Exponents: x^{2} → x^2
  normalized = normalized.replace(/\^?\{([^}]+)\}/g, '^$1');
  
  // Subscripts (for now, just remove them - can be enhanced later)
  normalized = normalized.replace(/_\{([^}]+)\}/g, '');
  
  // Common LaTeX commands to remove
  normalized = normalized.replace(/\\left/g, '');
  normalized = normalized.replace(/\\right/g, '');
  normalized = normalized.replace(/\\cdot/g, '*');
  normalized = normalized.replace(/\\times/g, '*');
  
  // Clean up whitespace
  normalized = normalized.trim();
  
  // Handle implicit multiplication (e.g., 2x → 2*x, 2sin(x) → 2*sin(x))
  // Number followed by letter
  normalized = normalized.replace(/(\d)([a-zA-Z])/g, '$1*$2');
  // Closing paren followed by opening paren or letter
  normalized = normalized.replace(/\)(\()/g, ')*$1');
  normalized = normalized.replace(/\)([a-zA-Z])/g, ')*$1');
  
  return normalized;
}
