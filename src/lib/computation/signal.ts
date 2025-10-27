// Signal processing using fft.js
import FFT from 'fft.js';
import { MathType } from '../types';
import {
  RuntimeValue,
  createComplex,
  createList,
  createNumber,
  isComplex,
  isList,
  isNumber,
} from '../runtime/value';
import { registerCallable } from '../runtime/functions';
import {
  ComplexTuple,
  ZERO_COMPLEX,
  complex,
  imagPart,
  isApproximatelyReal,
  magnitudeComplex,
  mulComplex,
  phaseComplex,
  realPart,
  toComplexTuple,
} from '../math/complex';

const EPSILON = 1e-9;

// Helper: normalize runtime list into complex tuple array
function runtimeListToComplexArray(arg: RuntimeValue, opName: string): ComplexTuple[] {
  if (!isList(arg)) {
    throw new Error(`${opName} expects List`);
  }
  return arg.elements.map((element, index) => {
    if (isNumber(element)) return complex(element.value, 0);
    if (isComplex(element)) return complex(element.real, element.imag);
    throw new Error(`${opName} list index ${index} must be a number or complex value`);
  });
}

// Helper: convert complex tuple to minimal runtime value
function complexTupleToRuntime(tuple: ComplexTuple): RuntimeValue {
  return isApproximatelyReal(tuple, EPSILON)
    ? createNumber(realPart(tuple))
    : createComplex(realPart(tuple), imagPart(tuple));
}

// Initialize signal processing capabilities (legacy callable registration)
export function registerSignalFunctions() {
  registerCallable('fft', MathType.List, MathType.List, arg => {
    const signal = runtimeListToComplexArray(arg, 'fft');
    const fftResult = computeFFT(signal);
    return createList(fftResult.map(bin => createNumber(magnitudeComplex(bin))));
  });

  registerCallable('ifft', MathType.List, MathType.List, arg => {
    const spectrum = runtimeListToComplexArray(arg, 'ifft');
    const signal = computeIFFT(spectrum);
    return createList(signal.map(complexTupleToRuntime));
  });

  // Placeholder for future multi-argument callable (kept for compatibility)
  registerCallable('convolve', MathType.List, MathType.List, arg => {
    if (!isList(arg)) throw new Error('convolve expects List');
    return arg;
  });

  registerCallable('fft_complex', MathType.List, MathType.List, arg => {
    const signal = runtimeListToComplexArray(arg, 'fft_complex');
    const fftResult = computeFFT(signal);
    return createList(fftResult.map(bin => createComplex(realPart(bin), imagPart(bin))));
  });

  registerCallable('magnitude', MathType.List, MathType.List, arg => {
    if (!isList(arg)) throw new Error('magnitude expects List');
    return createList(
      arg.elements.map((element, index) => {
        if (isComplex(element)) {
          return createNumber(magnitudeComplex(complex(element.real, element.imag)));
        }
        if (isNumber(element)) {
          return createNumber(Math.abs(element.value));
        }
        throw new Error(`magnitude list index ${index} must be number or complex`);
      })
    );
  });

  registerCallable('phase', MathType.List, MathType.List, arg => {
    if (!isList(arg)) throw new Error('phase expects List');
    return createList(
      arg.elements.map((element, index) => {
        if (isComplex(element)) {
          return createNumber(phaseComplex(complex(element.real, element.imag)));
        }
        if (isNumber(element)) {
          return createNumber(element.value >= 0 ? 0 : Math.PI);
        }
        throw new Error(`phase list index ${index} must be number or complex`);
      })
    );
  });
}

function normalizeSignal(signal: Array<number | ComplexTuple>): ComplexTuple[] {
  return signal.map(value => toComplexTuple(Array.isArray(value) ? value : value as number));
}

// Compute FFT of real or complex signal
export function computeFFT(signal: Array<number | ComplexTuple>): ComplexTuple[] {
  const normalized = normalizeSignal(signal);
  const size = nextPowerOf2(normalized.length);
  const fft = new FFT(size);
  const out = fft.createComplexArray();
  const input = fft.createComplexArray();

  for (let i = 0; i < size; i++) {
    const value = i < normalized.length ? normalized[i] : ZERO_COMPLEX;
    input[i * 2] = value[0];
    input[i * 2 + 1] = value[1];
  }

  fft.transform(out, input);

  const result: ComplexTuple[] = [];
  for (let i = 0; i < out.length; i += 2) {
    result.push([out[i], out[i + 1]]);
  }
  return result;
}

// Compute IFFT and return complex-valued sequence
export function computeIFFT(spectrum: ComplexTuple[]): ComplexTuple[] {
  const size = nextPowerOf2(spectrum.length);
  const fft = new FFT(size);
  const input = fft.createComplexArray();
  const out = fft.createComplexArray();

  for (let i = 0; i < size; i++) {
    const value = i < spectrum.length ? spectrum[i] : ZERO_COMPLEX;
    input[i * 2] = value[0];
    input[i * 2 + 1] = value[1];
  }

  fft.inverseTransform(out, input);

  const result: ComplexTuple[] = [];
  for (let i = 0; i < out.length; i += 2) {
    result.push([out[i], out[i + 1]]);
  }
  return result;
}

export function computeIFFTReal(spectrum: ComplexTuple[]): number[] {
  return computeIFFT(spectrum).map(tuple => tuple[0]);
}

// Convolution via FFT (real sequences)
export function convolve(signal1: number[], signal2: number[]): number[] {
  const size = nextPowerOf2(signal1.length + signal2.length - 1);
  const padded1 = [...signal1, ...new Array(size - signal1.length).fill(0)];
  const padded2 = [...signal2, ...new Array(size - signal2.length).fill(0)];
  const fft1 = computeFFT(padded1);
  const fft2 = computeFFT(padded2);
  const product: ComplexTuple[] = [];

  for (let i = 0; i < fft1.length; i++) {
    product.push(mulComplex(fft1[i], fft2[i]));
  }

  return computeIFFTReal(product)
    .slice(0, signal1.length + signal2.length - 1);
}

// Utility: next power of 2
function nextPowerOf2(n: number): number {
  return Math.pow(2, Math.ceil(Math.log2(Math.max(1, n))));
}

// Initialize on module load
registerSignalFunctions();
