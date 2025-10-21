// Numerical methods using stdlib.js
import { MathType } from '../types';
import { RuntimeValue, createNumber, isList, isNumber } from '../runtime/value';
import { registerCallable } from '../runtime/functions';

// Import specific stdlib modules as needed
// Using dynamic imports to keep bundle size manageable

// Initialize numerical computation capabilities
export function registerNumericalFunctions() {
  // Error function
  registerCallable('erf', MathType.Number, MathType.Number, (arg) => {
    if (!isNumber(arg)) throw new Error('erf expects Number');
    // Will implement with stdlib import
    return createNumber(Math.tanh(arg.value)); // Placeholder approximation
  });

  // Gamma function
  registerCallable('gamma', MathType.Number, MathType.Number, (arg) => {
    if (!isNumber(arg)) throw new Error('gamma expects Number');
    // Will implement with stdlib import
    // Placeholder: use Sterling's approximation for large values
    const x = arg.value;
    if (x < 0.5) {
      return createNumber(Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x)));
    }
    // Sterling approximation
    const g = 7;
    const C = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
    ];
    
    let z = x - 1;
    let Ag = C[0];
    for (let i = 1; i < g + 2; i++) {
      Ag += C[i] / (z + i);
    }
    
    const t = z + g + 0.5;
    const result = Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * Ag;
    return createNumber(result);
  });

  // Variance (for lists)
  registerCallable('variance', MathType.List, MathType.Number, (arg) => {
    if (!isList(arg)) throw new Error('variance expects List');
    const values = arg.elements.map(el => {
      if (!isNumber(el)) throw new Error('variance expects List of Numbers');
      return el.value;
    });
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return createNumber(variance);
  });

  // Standard deviation
  registerCallable('stdev', MathType.List, MathType.Number, (arg) => {
    if (!isList(arg)) throw new Error('stdev expects List');
    const values = arg.elements.map(el => {
      if (!isNumber(el)) throw new Error('stdev expects List of Numbers');
      return el.value;
    });
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return createNumber(Math.sqrt(variance));
  });
}

// Numerical integration using adaptive quadrature
export function numericalIntegrate(
  f: (x: number) => number,
  a: number,
  b: number,
  tolerance: number = 1e-6
): number {
  // Simpson's rule with adaptive refinement
  const h = (b - a) / 2;
  const fa = f(a);
  const fb = f(b);
  const fc = f(a + h);
  
  const s1 = (h / 3) * (fa + 4 * fc + fb);
  
  // Refine by splitting interval
  const h2 = h / 2;
  const fc1 = f(a + h2);
  const fc2 = f(a + h + h2);
  const s2 = (h2 / 3) * (fa + 4 * fc1 + 2 * fc + 4 * fc2 + fb);
  
  if (Math.abs(s2 - s1) < tolerance) {
    return s2;
  }
  
  // Recurse on sub-intervals
  return numericalIntegrate(f, a, a + h, tolerance / 2) +
         numericalIntegrate(f, a + h, b, tolerance / 2);
}

// Helper to compute gamma function
function gamma(x: number): number {
  const g = 7;
  const C = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
  ];
  
  if (x < 0.5) {
    return Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x));
  }
  
  let z = x - 1;
  let Ag = C[0];
  for (let i = 1; i < g + 2; i++) {
    Ag += C[i] / (z + i);
  }
  
  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * Ag;
}

// Initialize on module load
registerNumericalFunctions();
