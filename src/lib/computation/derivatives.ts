// Enhanced derivative computation (symbolic + numerical)
import { symbolicDerivative, partialDerivative } from './symbolic';
import { MathType } from '../types';
import { RuntimeValue, createNumber, createList, createFunction, isNumber, isFunction } from '../runtime/value';
import { registerCallable } from '../runtime/functions';
import { FunctionDefinition } from '../definitionContext';
import { numericalDerivative } from '../runtime/higherOrderFunctions';

// Initialize enhanced derivative capabilities
export function registerDerivativeFunctions() {
  // Gradient: Returns list of partial derivatives
  registerCallable('gradient', MathType.Function, MathType.List, (arg) => {
    if (!isFunction(arg)) throw new Error('gradient expects Function');
    
    // For multi-variable functions, return vector of partial derivatives
    // For now, return empty list - needs multi-variable support
    return createList([]);
  });

  // Partial derivative operator
  // This would be: partial(f, variable_index)
  registerCallable('partial', MathType.Function, MathType.Function, (arg) => {
    if (!isFunction(arg)) throw new Error('partial expects Function');
    
    // Return a function representing the partial derivative
    return arg; // Placeholder
  });
}

// Compute gradient numerically
export function numericalGradient(
  f: (vars: number[]) => number,
  point: number[],
  h: number = 1e-5
): number[] {
  const gradient: number[] = [];
  
  for (let i = 0; i < point.length; i++) {
    const pointPlus = [...point];
    const pointMinus = [...point];
    pointPlus[i] += h;
    pointMinus[i] -= h;
    
    const derivative = (f(pointPlus) - f(pointMinus)) / (2 * h);
    gradient.push(derivative);
  }
  
  return gradient;
}

// Compute Jacobian matrix for vector-valued functions
export function jacobian(
  f: (vars: number[]) => number[],
  point: number[],
  h: number = 1e-5
): number[][] {
  const fValue = f(point);
  const m = fValue.length; // Number of outputs
  const n = point.length; // Number of inputs
  
  const J: number[][] = [];
  
  for (let i = 0; i < m; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      const pointPlus = [...point];
      const pointMinus = [...point];
      pointPlus[j] += h;
      pointMinus[j] -= h;
      
      const derivative = (f(pointPlus)[i] - f(pointMinus)[i]) / (2 * h);
      row.push(derivative);
    }
    J.push(row);
  }
  
  return J;
}

// Hessian matrix (second derivatives)
export function hessian(
  f: (vars: number[]) => number,
  point: number[],
  h: number = 1e-5
): number[][] {
  const n = point.length;
  const H: number[][] = [];
  
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      // Compute second partial derivative ∂²f/∂xi∂xj
      const pointPP = [...point];
      const pointPM = [...point];
      const pointMP = [...point];
      const pointMM = [...point];
      
      pointPP[i] += h;
      pointPP[j] += h;
      pointPM[i] += h;
      pointPM[j] -= h;
      pointMP[i] -= h;
      pointMP[j] += h;
      pointMM[i] -= h;
      pointMM[j] -= h;
      
      const secondDerivative =
        (f(pointPP) - f(pointPM) - f(pointMP) + f(pointMM)) / (4 * h * h);
      
      row.push(secondDerivative);
    }
    H.push(row);
  }
  
  return H;
}

// Directional derivative
export function directionalDerivative(
  f: (vars: number[]) => number,
  point: number[],
  direction: number[],
  h: number = 1e-5
): number {
  // Normalize direction vector
  const magnitude = Math.sqrt(direction.reduce((sum, d) => sum + d * d, 0));
  const normalized = direction.map(d => d / magnitude);
  
  // Compute derivative in direction
  const pointPlus = point.map((p, i) => p + h * normalized[i]);
  const pointMinus = point.map((p, i) => p - h * normalized[i]);
  
  return (f(pointPlus) - f(pointMinus)) / (2 * h);
}

// Initialize on module load
registerDerivativeFunctions();
