import { KeyboardCategory } from './categories';

export interface KeyboardItem {
  id: string;
  latex: string;
  normalized: string;
  description: string;
  category: KeyboardCategory;
  insertTemplate?: string;
  example?: string;
}

export const KEYBOARD_ITEMS: KeyboardItem[] = [
  // Operators
  { id: 'add', latex: '+', normalized: '+', description: 'Addition', category: KeyboardCategory.Operators },
  { id: 'sub', latex: '-', normalized: '-', description: 'Subtraction', category: KeyboardCategory.Operators },
  { id: 'mul', latex: '\\cdot', normalized: '*', description: 'Multiplication', category: KeyboardCategory.Operators },
  { id: 'div', latex: '\\div', normalized: '/', description: 'Division', category: KeyboardCategory.Operators },
  { id: 'pow', latex: '^{#?}', normalized: '^', description: 'Exponentiation', category: KeyboardCategory.Operators, insertTemplate: '^{#0}' },
  { id: 'mod', latex: '\\bmod', normalized: '%', description: 'Modulo', category: KeyboardCategory.Operators },
  { id: 'lt', latex: '<', normalized: '<', description: 'Less than', category: KeyboardCategory.Operators },
  { id: 'gt', latex: '>', normalized: '>', description: 'Greater than', category: KeyboardCategory.Operators },
  { id: 'lte', latex: '\\le', normalized: '<=', description: 'Less than or equal', category: KeyboardCategory.Operators },
  { id: 'gte', latex: '\\ge', normalized: '>=', description: 'Greater than or equal', category: KeyboardCategory.Operators },
  { id: 'eq', latex: '=', normalized: '==', description: 'Equality', category: KeyboardCategory.Operators },
  { id: 'neq', latex: '\\ne', normalized: '!=', description: 'Not equal', category: KeyboardCategory.Operators },
  { id: 'and', latex: '\\land', normalized: '&&', description: 'Logical AND', category: KeyboardCategory.Operators },
  { id: 'or', latex: '\\lor', normalized: '||', description: 'Logical OR', category: KeyboardCategory.Operators },

  // Trigonometric
  { id: 'sin', latex: '\\sin(#?)', normalized: 'sin', description: 'Sine function', category: KeyboardCategory.Trigonometric, insertTemplate: '\\sin(#0)', example: 'sin(x)' },
  { id: 'cos', latex: '\\cos(#?)', normalized: 'cos', description: 'Cosine function', category: KeyboardCategory.Trigonometric, insertTemplate: '\\cos(#0)', example: 'cos(x)' },
  { id: 'tan', latex: '\\tan(#?)', normalized: 'tan', description: 'Tangent function', category: KeyboardCategory.Trigonometric, insertTemplate: '\\tan(#0)', example: 'tan(x)' },

  // Mathematical Functions
  { id: 'sqrt', latex: '\\sqrt{#?}', normalized: 'sqrt', description: 'Square root', category: KeyboardCategory.Mathematical, insertTemplate: '\\sqrt{#0}', example: 'sqrt(x)' },
  { id: 'abs', latex: '\\left|#?\\right|', normalized: 'abs', description: 'Absolute value', category: KeyboardCategory.Mathematical, insertTemplate: '\\left|#0\\right|', example: 'abs(x)' },
  { id: 'exp', latex: 'e^{#?}', normalized: 'exp', description: 'Exponential (e^x)', category: KeyboardCategory.Mathematical, insertTemplate: 'e^{#0}', example: 'exp(x)' },
  { id: 'ln', latex: '\\ln(#?)', normalized: 'ln', description: 'Natural logarithm', category: KeyboardCategory.Mathematical, insertTemplate: '\\ln(#0)', example: 'ln(x)' },
  { id: 'log', latex: '\\log(#?)', normalized: 'log', description: 'Logarithm base 10', category: KeyboardCategory.Mathematical, insertTemplate: '\\log(#0)', example: 'log(x)' },
  { id: 'floor', latex: '\\lfloor#?\\rfloor', normalized: 'floor', description: 'Floor function', category: KeyboardCategory.Mathematical, insertTemplate: '\\lfloor#0\\rfloor', example: 'floor(x)' },
  { id: 'ceil', latex: '\\lceil#?\\rceil', normalized: 'ceil', description: 'Ceiling function', category: KeyboardCategory.Mathematical, insertTemplate: '\\lceil#0\\rceil', example: 'ceil(x)' },
  { id: 'round', latex: 'round(#?)', normalized: 'round', description: 'Round to nearest integer', category: KeyboardCategory.Mathematical, insertTemplate: 'round(#0)', example: 'round(x)' },
  { id: 'frac', latex: '\\frac{#?}{#?}', normalized: '/', description: 'Fraction', category: KeyboardCategory.Mathematical, insertTemplate: '\\frac{#0}{#1}' },

  // List Functions
  { id: 'sum', latex: 'sum(#?)', normalized: 'sum', description: 'Sum of list elements', category: KeyboardCategory.Lists, insertTemplate: 'sum(#0)', example: 'sum([1,2,3])' },
  { id: 'mean', latex: 'mean(#?)', normalized: 'mean', description: 'Mean of list', category: KeyboardCategory.Lists, insertTemplate: 'mean(#0)', example: 'mean([1,2,3])' },
  { id: 'min', latex: 'min(#?)', normalized: 'min', description: 'Minimum value', category: KeyboardCategory.Lists, insertTemplate: 'min(#0)', example: 'min([1,2,3])' },
  { id: 'max', latex: 'max(#?)', normalized: 'max', description: 'Maximum value', category: KeyboardCategory.Lists, insertTemplate: 'max(#0)', example: 'max([1,2,3])' },
  { id: 'length', latex: 'length(#?)', normalized: 'length', description: 'Length/magnitude', category: KeyboardCategory.Lists, insertTemplate: 'length(#0)', example: 'length([1,2,3])' },
  { id: 'variance', latex: 'variance(#?)', normalized: 'variance', description: 'Variance of list', category: KeyboardCategory.Lists, insertTemplate: 'variance(#0)', example: 'variance([1,2,3])' },
  { id: 'stdev', latex: 'stdev(#?)', normalized: 'stdev', description: 'Standard deviation', category: KeyboardCategory.Lists, insertTemplate: 'stdev(#0)', example: 'stdev([1,2,3])' },

  // Complex Functions
  { id: 'cabs', latex: '|z|', normalized: 'abs', description: 'Complex magnitude', category: KeyboardCategory.Complex, example: 'abs(1+2i)' },
  { id: 'arg', latex: 'arg(#?)', normalized: 'arg', description: 'Complex argument', category: KeyboardCategory.Complex, insertTemplate: 'arg(#0)', example: 'arg(1+2i)' },
  { id: 'real', latex: 'Re(#?)', normalized: 'real', description: 'Real part', category: KeyboardCategory.Complex, insertTemplate: 'real(#0)', example: 'real(1+2i)' },
  { id: 'imag', latex: 'Im(#?)', normalized: 'imag', description: 'Imaginary part', category: KeyboardCategory.Complex, insertTemplate: 'imag(#0)', example: 'imag(1+2i)' },
  { id: 'conj', latex: '\\overline{#?}', normalized: 'conj', description: 'Complex conjugate', category: KeyboardCategory.Complex, insertTemplate: '\\overline{#0}', example: 'conj(1+2i)' },

  // Point/Vector Functions
  { id: 'plength', latex: 'length(p)', normalized: 'length', description: 'Vector magnitude', category: KeyboardCategory.Points, example: 'length((3,4))' },

  // Conditional Functions
  { id: 'if', latex: 'if(#?,#?,#?)', normalized: 'if', description: 'If-then-else', category: KeyboardCategory.Conditional, insertTemplate: 'if(#0,#1,#2)', example: 'if(x>0,1,-1)' },
  { id: 'piecewise', latex: '\\begin{cases}#?\\end{cases}', normalized: 'piecewise', description: 'Piecewise function', category: KeyboardCategory.Conditional, insertTemplate: 'piecewise(#0,#1,#2)', example: 'piecewise(x>0,1,-1)' },

  // Signal Processing
  { id: 'fft', latex: 'fft(#?)', normalized: 'fft', description: 'Fast Fourier Transform', category: KeyboardCategory.Signal, insertTemplate: 'fft(#0)', example: 'fft([1,2,3,4])' },
  { id: 'ifft', latex: 'ifft(#?)', normalized: 'ifft', description: 'Inverse FFT', category: KeyboardCategory.Signal, insertTemplate: 'ifft(#0)', example: 'ifft(fft([1,2,3,4]))' },
  { id: 'magnitude', latex: 'magnitude(#?)', normalized: 'magnitude', description: 'FFT magnitude', category: KeyboardCategory.Signal, insertTemplate: 'magnitude(#0)', example: 'magnitude(fft([1,2,3]))' },
  { id: 'phase', latex: 'phase(#?)', normalized: 'phase', description: 'FFT phase', category: KeyboardCategory.Signal, insertTemplate: 'phase(#0)', example: 'phase(fft([1,2,3]))' },
  { id: 'sq', latex: 'sq(#?)', normalized: 'sq', description: 'Square wave', category: KeyboardCategory.Signal, insertTemplate: 'sq(#0)', example: 'sq(t)' },
  { id: 'saw', latex: 'saw(#?)', normalized: 'saw', description: 'Sawtooth wave', category: KeyboardCategory.Signal, insertTemplate: 'saw(#0)', example: 'saw(t)' },
  { id: 'tri', latex: 'tri(#?)', normalized: 'tri', description: 'Triangle wave', category: KeyboardCategory.Signal, insertTemplate: 'tri(#0)', example: 'tri(t)' },

  // Calculus
  { id: 'D', latex: 'D(#?)', normalized: 'D', description: 'Derivative operator', category: KeyboardCategory.Calculus, insertTemplate: 'D(#0)', example: 'D(f)' },

  // Constants
  { id: 'pi', latex: '\\pi', normalized: 'pi', description: 'Pi (3.14159...)', category: KeyboardCategory.Constants },
  { id: 'e', latex: 'e', normalized: 'e', description: 'Euler\'s number (2.71828...)', category: KeyboardCategory.Constants },
  { id: 'i', latex: 'i', normalized: 'i', description: 'Imaginary unit (√-1)', category: KeyboardCategory.Constants },

  // Variables
  { id: 'x', latex: 'x', normalized: 'x', description: 'Variable x', category: KeyboardCategory.Variables },
  { id: 'y', latex: 'y', normalized: 'y', description: 'Variable y', category: KeyboardCategory.Variables },
  { id: 't', latex: 't', normalized: 't', description: 'Variable t (time)', category: KeyboardCategory.Variables },
  { id: 'theta', latex: '\\theta', normalized: 'theta', description: 'Angle theta', category: KeyboardCategory.Variables },
  { id: 'alpha', latex: '\\alpha', normalized: 'alpha', description: 'Alpha', category: KeyboardCategory.Variables },
  { id: 'beta', latex: '\\beta', normalized: 'beta', description: 'Beta', category: KeyboardCategory.Variables },

  // Data Types
  { id: 'point', latex: '(#?,#?)', normalized: '(,)', description: 'Point/Vector', category: KeyboardCategory.DataTypes, insertTemplate: '(#0,#1)', example: '(3,4)' },
  { id: 'list', latex: '[#?]', normalized: '[]', description: 'List', category: KeyboardCategory.DataTypes, insertTemplate: '[#0]', example: '[1,2,3]' },
];

export function getItemsByCategory(category: KeyboardCategory): KeyboardItem[] {
  return KEYBOARD_ITEMS.filter(item => item.category === category);
}

export function getAllCategories(): KeyboardCategory[] {
  return Array.from(new Set(KEYBOARD_ITEMS.map(item => item.category)));
}
