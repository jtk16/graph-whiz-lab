// Signal processing using fft.js
import FFT from 'fft.js';
import { MathType } from '../types';
import { RuntimeValue, createList, createNumber, createComplex, isList, isNumber, isComplex } from '../runtime/value';
import { registerCallable } from '../runtime/functions';

// Initialize signal processing capabilities
export function registerSignalFunctions() {
  // FFT: Convert time-domain signal to frequency domain
  registerCallable('fft', MathType.List, MathType.List, (arg) => {
    if (!isList(arg)) throw new Error('fft expects List');
    
    const signal = arg.elements.map(el => {
      if (!isNumber(el)) throw new Error('fft expects List of Numbers');
      return el.value;
    });
    
    const fftResult = computeFFT(signal);
    
    // Return list of magnitudes (absolute values of complex numbers)
    return createList(
      fftResult.map(([real, imag]) => 
        createNumber(Math.sqrt(real * real + imag * imag))
      )
    );
  });

  // IFFT: Convert frequency-domain back to time domain
  registerCallable('ifft', MathType.List, MathType.List, (arg) => {
    if (!isList(arg)) throw new Error('ifft expects List');
    
    const spectrum = arg.elements.map(el => {
      if (!isNumber(el)) throw new Error('ifft expects List of Numbers');
      return el.value;
    });
    
    // For now, treat as real-valued spectrum
    const complexSpectrum: [number, number][] = spectrum.map(v => [v, 0]);
    const signal = computeIFFT(complexSpectrum);
    
    return createList(signal.map(v => createNumber(v)));
  });

  // Convolution using FFT
  registerCallable('convolve', MathType.List, MathType.List, (arg) => {
    // This would need two arguments - will implement with proper multi-arg support
    if (!isList(arg)) throw new Error('convolve expects List');
    return arg; // Placeholder
  });

  // FFT returning complex values
  registerCallable('fft_complex', MathType.List, MathType.List, (arg) => {
    if (!isList(arg)) throw new Error('fft_complex expects List');
    
    const signal = arg.elements.map(el => {
      if (!isNumber(el)) throw new Error('fft_complex expects List of Numbers');
      return el.value;
    });
    
    const fftResult = computeFFT(signal);
    
    // Return list of complex numbers
    return createList(
      fftResult.map(([real, imag]) => createComplex(real, imag))
    );
  });

  // magnitude spectrum
  registerCallable('magnitude', MathType.List, MathType.List, (arg) => {
    if (!isList(arg)) throw new Error('magnitude expects List');
    
    return createList(
      arg.elements.map(el => {
        if (isComplex(el)) {
          return createNumber(Math.sqrt(el.real * el.real + el.imag * el.imag));
        } else if (isNumber(el)) {
          return createNumber(Math.abs(el.value));
        }
        throw new Error('magnitude expects List of Complex or Number');
      })
    );
  });

  // phase spectrum
  registerCallable('phase', MathType.List, MathType.List, (arg) => {
    if (!isList(arg)) throw new Error('phase expects List');
    
    return createList(
      arg.elements.map(el => {
        if (isComplex(el)) {
          return createNumber(Math.atan2(el.imag, el.real));
        } else if (isNumber(el)) {
          return createNumber(el.value >= 0 ? 0 : Math.PI);
        }
        throw new Error('phase expects List of Complex or Number');
      })
    );
  });
}

// Compute FFT of real-valued signal
export function computeFFT(signal: number[]): [number, number][] {
  // Pad to power of 2
  const size = nextPowerOf2(signal.length);
  const padded = [...signal, ...new Array(size - signal.length).fill(0)];

  const fft = new FFT(size);
  const out = fft.createComplexArray();
  const input = fft.createComplexArray();

  for (let i = 0; i < size; i++) {
    input[i * 2] = padded[i];
    input[i * 2 + 1] = 0;
  }

  fft.transform(out, input);

  // Convert to array of [real, imaginary] pairs
  const result: [number, number][] = [];
  for (let i = 0; i < out.length; i += 2) {
    result.push([out[i], out[i + 1]]);
  }
  
  return result;
}

// Compute IFFT
export function computeIFFT(spectrum: [number, number][]): number[] {
  const size = spectrum.length;
  const fft = new FFT(size);
  const input = fft.createComplexArray();
  const out = fft.createComplexArray();

  for (let i = 0; i < spectrum.length; i++) {
    input[i * 2] = spectrum[i][0];
    input[i * 2 + 1] = spectrum[i][1];
  }

  fft.inverseTransform(out, input);

  const result: number[] = [];
  for (let i = 0; i < out.length; i += 2) {
    result.push(out[i]);
  }

  return result;
}

// Convolution via FFT
export function convolve(signal1: number[], signal2: number[]): number[] {
  const size = nextPowerOf2(signal1.length + signal2.length - 1);
  
  // Pad both signals
  const padded1 = [...signal1, ...new Array(size - signal1.length).fill(0)];
  const padded2 = [...signal2, ...new Array(size - signal2.length).fill(0)];
  
  // Compute FFTs
  const fft1 = computeFFT(padded1);
  const fft2 = computeFFT(padded2);
  
  // Multiply in frequency domain
  const product: [number, number][] = [];
  for (let i = 0; i < fft1.length; i++) {
    const [r1, i1] = fft1[i];
    const [r2, i2] = fft2[i];
    // Complex multiplication: (a + bi)(c + di) = (ac - bd) + (ad + bc)i
    product.push([
      r1 * r2 - i1 * i2,
      r1 * i2 + i1 * r2
    ]);
  }
  
  // IFFT to get result
  return computeIFFT(product).slice(0, signal1.length + signal2.length - 1);
}

// Utility: next power of 2
function nextPowerOf2(n: number): number {
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

// Initialize on module load
registerSignalFunctions();

