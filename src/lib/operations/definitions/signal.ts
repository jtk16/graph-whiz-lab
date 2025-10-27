/**
 * Signal processing operations: FFT, IFFT, spectra, Laplace, and Z-transform
 */

import { registry } from '../registry';
import { MathType } from '../../types';
import {
  RuntimeValue,
  createComplex,
  createList,
  createNumber,
  isComplex,
  isList,
  isNumber,
} from '../../runtime/value';
import { KeyboardCategory } from '../../keyboard/categories';
import { computeFFT, computeIFFT } from '../../computation/signal';
import { evaluateLaplaceTransform, evaluateZTransform } from '../../computation/transforms';
import {
  ComplexTuple,
  complex,
  imagPart,
  isApproximatelyReal,
  magnitudeComplex,
  phaseComplex,
  realPart,
} from '../../math/complex';

const EPSILON = 1e-9;

function runtimeValueToComplex(value: RuntimeValue, opName: string, index?: number): ComplexTuple {
  if (isNumber(value)) return complex(value.value, 0);
  if (isComplex(value)) return complex(value.real, value.imag);
  const position = index != null ? ` (argument ${index + 1})` : '';
  throw new Error(`${opName} expects numbers or complex values${position}`);
}

function listToComplexTuples(list: RuntimeValue, opName: string): ComplexTuple[] {
  if (!isList(list)) {
    throw new Error(`${opName} expects List`);
  }
  return list.elements.map((element, index) => runtimeValueToComplex(element, opName, index));
}

function complexTupleToRuntime(tuple: ComplexTuple): RuntimeValue {
  return isApproximatelyReal(tuple, EPSILON)
    ? createNumber(realPart(tuple))
    : createComplex(realPart(tuple), imagPart(tuple));
}

// FFT (magnitude spectrum)
registry.register({
  id: 'fft',
  name: 'fft',
  syntax: {
    latex: 'fft(#0)',
    normalized: 'fft(#0)',
  },
  parse: { type: 'function' },
  types: {
    signatures: [{ input: [MathType.List], output: MathType.List }],
  },
  runtime: {
    evaluate: args => {
      const [signalArg] = args;
      const signal = listToComplexTuples(signalArg, 'fft');
      const fftResult = computeFFT(signal);
      return createList(fftResult.map(bin => createNumber(magnitudeComplex(bin))));
    },
  },
  ui: {
    description: 'Fast Fourier Transform (magnitude)',
    category: KeyboardCategory.Signal,
    example: 'fft([1,0,1,0])',
  },
});

// FFT returning complex bins
registry.register({
  id: 'fft_complex',
  name: 'fft_complex',
  syntax: {
    latex: 'fft\\_complex(#0)',
    normalized: 'fft_complex(#0)',
  },
  parse: { type: 'function' },
  types: {
    signatures: [{ input: [MathType.List], output: MathType.List }],
  },
  runtime: {
    evaluate: args => {
      const [signalArg] = args;
      const signal = listToComplexTuples(signalArg, 'fft_complex');
      const fftResult = computeFFT(signal);
      return createList(fftResult.map(bin => createComplex(realPart(bin), imagPart(bin))));
    },
  },
  ui: {
    description: 'Fast Fourier Transform (complex bins)',
    category: KeyboardCategory.Signal,
    example: 'fft_complex([1,0,1,0])',
  },
});

// IFFT (returns real or complex depending on content)
registry.register({
  id: 'ifft',
  name: 'ifft',
  syntax: {
    latex: 'ifft(#0)',
    normalized: 'ifft(#0)',
  },
  parse: { type: 'function' },
  types: {
    signatures: [{ input: [MathType.List], output: MathType.List }],
  },
  runtime: {
    evaluate: args => {
      const [spectrumArg] = args;
      const spectrum = listToComplexTuples(spectrumArg, 'ifft');
      const timeDomain = computeIFFT(spectrum);
      return createList(timeDomain.map(complexTupleToRuntime));
    },
  },
  ui: {
    description: 'Inverse Fast Fourier Transform',
    category: KeyboardCategory.Signal,
    example: 'ifft(fft_complex([1,2,3]))',
  },
});

// Magnitude helper
registry.register({
  id: 'magnitude',
  name: 'magnitude',
  syntax: {
    latex: 'magnitude(#0)',
    normalized: 'magnitude(#0)',
  },
  parse: { type: 'function' },
  types: {
    signatures: [{ input: [MathType.List], output: MathType.List }],
  },
  runtime: {
    evaluate: args => {
      const [listArg] = args;
      if (!isList(listArg)) throw new Error('magnitude expects List');
      return createList(
        listArg.elements.map((element, index) => {
          if (isComplex(element)) {
            return createNumber(magnitudeComplex(complex(element.real, element.imag)));
          }
          if (isNumber(element)) return createNumber(Math.abs(element.value));
          throw new Error(`magnitude list index ${index} must be number or complex`);
        })
      );
    },
  },
  ui: {
    description: 'Magnitude of complex sequence',
    category: KeyboardCategory.Signal,
    example: 'magnitude(fft_complex([1,2,3]))',
  },
});

// Phase helper
registry.register({
  id: 'phase',
  name: 'phase',
  syntax: {
    latex: 'phase(#0)',
    normalized: 'phase(#0)',
  },
  parse: { type: 'function' },
  types: {
    signatures: [{ input: [MathType.List], output: MathType.List }],
  },
  runtime: {
    evaluate: args => {
      const [listArg] = args;
      if (!isList(listArg)) throw new Error('phase expects List');
      return createList(
        listArg.elements.map((element, index) => {
          if (isComplex(element)) {
            return createNumber(phaseComplex(complex(element.real, element.imag)));
          }
          if (isNumber(element)) {
            return createNumber(element.value >= 0 ? 0 : Math.PI);
          }
          throw new Error(`phase list index ${index} must be number or complex`);
        })
      );
    },
  },
  ui: {
    description: 'Phase of complex sequence',
    category: KeyboardCategory.Signal,
    example: 'phase(fft_complex([1,2,3]))',
  },
});

// Z-transform evaluation
registry.register({
  id: 'z_transform',
  name: 'z_transform',
  syntax: {
    latex: 'z\\_transform(#0,#1)',
    normalized: 'z_transform(#0,#1)',
  },
  parse: { type: 'function' },
  types: {
    signatures: [
      { input: [MathType.List, MathType.Complex], output: MathType.Complex },
    ],
  },
  runtime: {
    evaluate: args => {
      const [sequenceArg, zArg] = args;
      const sequence = listToComplexTuples(sequenceArg, 'z_transform');
      const zValue = runtimeValueToComplex(zArg, 'z_transform');
      const result = evaluateZTransform(sequence, zValue);
      return complexTupleToRuntime(result);
    },
  },
  ui: {
    description: 'Evaluate Z-transform at z',
    category: KeyboardCategory.Signal,
    example: 'z_transform([1,2,3], 0.9)',
  },
});

// Laplace transform (discrete approximation)
registry.register({
  id: 'laplace_transform',
  name: 'laplace_transform',
  syntax: {
    latex: 'laplace\\_transform(#0,#1,#2)',
    normalized: 'laplace_transform(#0,#1,#2)',
    insertTemplate: 'laplace_transform(#0,#1,1)',
  },
  parse: { type: 'function' },
  types: {
    signatures: [
      { input: [MathType.List, MathType.Complex], output: MathType.Complex },
      { input: [MathType.List, MathType.Complex, MathType.Number], output: MathType.Complex },
    ],
  },
  runtime: {
    evaluate: args => {
      const [samplesArg, sArg, maybeStep] = args;
      const samples = listToComplexTuples(samplesArg, 'laplace_transform');
      const sValue = runtimeValueToComplex(sArg, 'laplace_transform', 1);
      let step = 1;
      if (maybeStep !== undefined) {
        if (!isNumber(maybeStep)) {
          throw new Error('laplace_transform step must be a number');
        }
        step = maybeStep.value;
      }
      const result = evaluateLaplaceTransform(samples, sValue, step);
      return complexTupleToRuntime(result);
    },
  },
  ui: {
    description: 'Discrete Laplace transform (dt default 1)',
    category: KeyboardCategory.Signal,
    example: 'laplace_transform([1,1,1], 1+2i, 0.1)',
  },
});
