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
  
  // Convert LaTeX functions to shorthand
  // Trig functions with space: \sin x → sin(x)
  normalized = normalized.replace(/\\sin\s+([a-zA-Z0-9])/g, 'sin($1)');
  normalized = normalized.replace(/\\cos\s+([a-zA-Z0-9])/g, 'cos($1)');
  normalized = normalized.replace(/\\tan\s+([a-zA-Z0-9])/g, 'tan($1)');
  
  // Trig functions with parentheses or directly: \sin(x) → sin(x), \cos → cos
  normalized = normalized.replace(/\\sin/g, 'sin');
  normalized = normalized.replace(/\\cos/g, 'cos');
  normalized = normalized.replace(/\\tan/g, 'tan');
  normalized = normalized.replace(/\\ln/g, 'ln');
  normalized = normalized.replace(/\\log/g, 'log');
  normalized = normalized.replace(/\\exp/g, 'exp');
  normalized = normalized.replace(/\\abs/g, 'abs');
  
  // Square root: \sqrt{x} → sqrt(x)
  normalized = normalized.replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)');
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
  normalized = normalized.replace(/\^?\{([^}]+)\}/g, '^$1');
  
  // Subscripts: f_{1} → f_1, f_a → f_a
  normalized = normalized.replace(/_\{([^}]+)\}/g, '_$1');
  // Already handles single-char subscripts like f_1
  
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
  // Closing paren followed by opening paren
  normalized = normalized.replace(/\)(\()/g, ')*$1');
  // Closing paren followed by letter (identifier or function): (x)y → (x)*y, (x-2)sqrt(x) → (x-2)*sqrt(x)
  normalized = normalized.replace(/\)([a-zA-Z])/g, ')*$1');
  // Note: We DON'T handle letter(paren) → letter*(paren) because that's function call syntax
  // For multiplication, users should write c*(x) explicitly
  
  // Single-character implicit multiplication: tx → t*x, xy → x*y
  // BUT preserve multi-char identifiers like floor, theta, sin
  normalized = normalized.replace(/\b([a-z])([a-z])\b/gi, '$1*$2');
  
  return normalized;
}
