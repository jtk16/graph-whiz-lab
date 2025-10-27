import { describe, expect, it } from 'vitest';
import { computeFFT, computeIFFT, computeIFFTReal, convolve } from '@/lib/computation/signal';

const expectRealListClose = (actual: number[], expected: number[], epsilon = 1e-6) => {
  const digits = Math.max(2, Math.round(-Math.log10(epsilon)));
  expect(actual.length).toBe(expected.length);
  actual.forEach((value, index) => {
    expect(value).toBeCloseTo(expected[index], digits);
  });
};

const expectComplexListClose = (
  actual: [number, number][],
  expected: [number, number][],
  epsilon = 1e-6
) => {
  const digits = Math.max(2, Math.round(-Math.log10(epsilon)));
  expect(actual.length).toBe(expected.length);
  actual.forEach((value, index) => {
    expect(value[0]).toBeCloseTo(expected[index][0], digits);
    expect(value[1]).toBeCloseTo(expected[index][1], digits);
  });
};

describe('Signal computation utilities', () => {
  it('round-trips FFT -> IFFT for real signals', () => {
    const signal = [0, 1, 0, -1];
    const fft = computeFFT(signal);
    const reconstructed = computeIFFT(fft)
      .slice(0, signal.length)
      .map(bin => bin[0]);
    expectRealListClose(reconstructed, signal);
  });

  it('round-trips FFT -> IFFT for complex signals', () => {
    const signal: [number, number][] = [
      [1, 2],
      [0, 0],
      [-0.5, 0.75],
      [0, 0],
    ];
    const fft = computeFFT(signal);
    const reconstructed = computeIFFT(fft).slice(0, signal.length);
    expectComplexListClose(reconstructed, signal, 1e-6);
  });

  it('provides real-only shortcut for IFFT output', () => {
    const signal = [1, 2, 3, 4];
    const spectrum = computeFFT(signal);
    const reconstructed = computeIFFTReal(spectrum).slice(0, signal.length);
    expectRealListClose(reconstructed, signal);
  });

  it('performs linear convolution via FFT', () => {
    const result = convolve([1, 2, 3], [0, 1]);
    expectRealListClose(result, [0, 1, 2, 3]);

    const impulseResponse = convolve([1, 0, 0], [0.25, 0.5, 0.25]);
    expectRealListClose(impulseResponse, [0.25, 0.5, 0.25, 0, 0]);
  });
});
