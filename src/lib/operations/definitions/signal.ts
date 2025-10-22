/**
 * Signal processing operations: fft, ifft, magnitude, phase
 */

import { registry } from '../registry';
import { MathType } from '../../types';
import { isList, createList, createNumber, isNumber } from '../../runtime/value';
import { KeyboardCategory } from '../../keyboard/categories';
import { computeFFT, computeIFFT } from '../../computation/signal';

// FFT
registry.register({
  id: 'fft',
  name: 'fft',
  syntax: {
    latex: 'fft(#0)',
    normalized: 'fft(#0)'
  },
  parse: {
    type: 'function'
  },
  types: {
    signatures: [
      { input: [MathType.List], output: MathType.List }
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [arg] = args;
      if (isList(arg)) {
        const values = arg.elements.map(el => {
          if (isNumber(el)) return el.value;
          throw new Error('FFT requires list of numbers');
        });
        const result = computeFFT(values);
        return createList(result.map(val => createNumber(val)));
      }
      throw new Error('fft expects List');
    }
  },
  ui: {
    description: 'Fast Fourier Transform',
    category: KeyboardCategory.Signal,
    example: 'fft([1,0,1,0])'
  }
});

// IFFT
registry.register({
  id: 'ifft',
  name: 'ifft',
  syntax: {
    latex: 'ifft(#0)',
    normalized: 'ifft(#0)'
  },
  parse: {
    type: 'function'
  },
  types: {
    signatures: [
      { input: [MathType.List], output: MathType.List }
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [arg] = args;
      if (isList(arg)) {
        const values = arg.elements.map(el => {
          if (isNumber(el)) return el.value;
          throw new Error('IFFT requires list of numbers');
        });
        const result = computeIFFT(values);
        return createList(result.map(val => createNumber(val)));
      }
      throw new Error('ifft expects List');
    }
  },
  ui: {
    description: 'Inverse Fast Fourier Transform',
    category: KeyboardCategory.Signal,
    example: 'ifft(fft([1,2,3]))'
  }
});

// Magnitude (of complex FFT result)
registry.register({
  id: 'magnitude',
  name: 'magnitude',
  syntax: {
    latex: 'magnitude(#0)',
    normalized: 'magnitude(#0)'
  },
  parse: {
    type: 'function'
  },
  types: {
    signatures: [
      { input: [MathType.List], output: MathType.List }
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [arg] = args;
      if (isList(arg)) {
        // For now, just return absolute values
        const magnitudes = arg.elements.map(el => {
          if (isNumber(el)) return createNumber(Math.abs(el.value));
          throw new Error('magnitude requires list of numbers');
        });
        return createList(magnitudes);
      }
      throw new Error('magnitude expects List');
    }
  },
  ui: {
    description: 'Magnitude of signal',
    category: KeyboardCategory.Signal,
    example: 'magnitude(fft([1,2,3]))'
  }
});

// Phase
registry.register({
  id: 'phase',
  name: 'phase',
  syntax: {
    latex: 'phase(#0)',
    normalized: 'phase(#0)'
  },
  parse: {
    type: 'function'
  },
  types: {
    signatures: [
      { input: [MathType.List], output: MathType.List }
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [arg] = args;
      if (isList(arg)) {
        // Placeholder: return zeros
        const phases = arg.elements.map(() => createNumber(0));
        return createList(phases);
      }
      throw new Error('phase expects List');
    }
  },
  ui: {
    description: 'Phase of signal',
    category: KeyboardCategory.Signal,
    example: 'phase(fft([1,2,3]))'
  }
});
