import { describe, expect, it } from 'vitest';
import { computeFFT, computeIFFT, convolve } from '@/lib/computation/signal';

const approximatelyEquals = (actual: number[], expected: number[], epsilon = 1e-6) => {
  const digits = Math.max(2, Math.round(-Math.log10(epsilon)));
  expect(actual.length).toBe(expected.length);
  actual.forEach((value, index) => {
    expect(value).toBeCloseTo(expected[index], digits);
  });
};

describe('Signal computation utilities', () => {
  it('round-trips FFT -> IFFT for real signals', () => {
    const signal = [0, 1, 0, -1];
    const fft = computeFFT(signal);
    const reconstructed = computeIFFT(fft).slice(0, signal.length);
    approximatelyEquals(reconstructed, signal);
  });

  it('performs linear convolution via FFT', () => {
    const result = convolve([1, 2, 3], [0, 1]);
    approximatelyEquals(result, [0, 1, 2, 3]);

    const impulseResponse = convolve([1, 0, 0], [0.25, 0.5, 0.25]);
    approximatelyEquals(impulseResponse, [0.25, 0.5, 0.25, 0, 0]);
  });
});
