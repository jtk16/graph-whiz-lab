// Numerical functions using unified registry
import { MathType } from '../types';
import { RuntimeValue, createNumber, isNumber } from '../runtime/value';
import { KeyboardCategory } from '../keyboard/categories';
import { registerFunction } from '../runtime/registry';

// Error function (approximation)
registerFunction({
  name: 'erf',
  signatures: [{
    paramType: MathType.Number,
    returnType: MathType.Number,
    execute: (arg) => {
      if (!isNumber(arg)) throw new Error('erf expects Number');
      // Abramowitz and Stegun approximation
      const x = arg.value;
      const sign = x >= 0 ? 1 : -1;
      const absX = Math.abs(x);
      
      const t = 1 / (1 + 0.3275911 * absX);
      const a1 = 0.254829592;
      const a2 = -0.284496736;
      const a3 = 1.421413741;
      const a4 = -1.453152027;
      const a5 = 1.061405429;
      
      const erf = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
      return createNumber(sign * erf);
    }
  }],
  metadata: {
    latex: 'erf(#?)',
    description: 'Error function',
    category: KeyboardCategory.Mathematical,
    example: 'erf(1)',
    insertTemplate: 'erf(#0)'
  }
});

// Gamma function
registerFunction({
  name: 'gamma',
  signatures: [{
    paramType: MathType.Number,
    returnType: MathType.Number,
    execute: (arg) => {
      if (!isNumber(arg)) throw new Error('gamma expects Number');
      const x = arg.value;
      
      // Lanczos approximation
      const g = 7;
      const C = [
        0.99999999999980993, 676.5203681218851, -1259.1392167224028,
        771.32342877765313, -176.61502916214059, 12.507343278686905,
        -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
      ];
      
      if (x < 0.5) {
        return createNumber(Math.PI / (Math.sin(Math.PI * x) * computeGamma(1 - x)));
      }
      
      const z = x - 1;
      let Ag = C[0];
      for (let i = 1; i < g + 2; i++) {
        Ag += C[i] / (z + i);
      }
      
      const t = z + g + 0.5;
      const result = Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * Ag;
      return createNumber(result);
    }
  }],
  metadata: {
    latex: '\\Gamma(#?)',
    description: 'Gamma function',
    category: KeyboardCategory.Mathematical,
    example: 'gamma(5)',
    insertTemplate: 'gamma(#0)'
  }
});

// Helper function for gamma computation
function computeGamma(x: number): number {
  const g = 7;
  const C = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
  ];
  
  if (x < 0.5) {
    return Math.PI / (Math.sin(Math.PI * x) * computeGamma(1 - x));
  }
  
  const z = x - 1;
  let Ag = C[0];
  for (let i = 1; i < g + 2; i++) {
    Ag += C[i] / (z + i);
  }
  
  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * Ag;
}
