import { describe, expect, it } from 'vitest';
import '@/lib/operations';
import { registry } from '@/lib/operations';
import { createComplex, createList, createNumber } from '@/lib/runtime/value';
import { computeFFT } from '@/lib/computation/signal';

const toNumberArray = (value: any): number[] => {
  expect(value.kind).toBe('list');
  return value.elements.map((el: any) => {
    expect(el.kind).toBe('number');
    return el.value;
  });
};

const toComplexArray = (value: any): [number, number][] => {
  expect(value.kind).toBe('list');
  return value.elements.map((el: any) => {
    if (el.kind === 'number') {
      return [el.value, 0];
    }
    expect(el.kind).toBe('complex');
    return [el.real, el.imag];
  });
};

const closeArray = (actual: number[], expected: number[], epsilon = 1e-6) => {
  expect(actual.length).toBe(expected.length);
  actual.forEach((value, index) => {
    expect(value).toBeCloseTo(expected[index], 6);
  });
};

const closeComplexArray = (actual: [number, number][], expected: [number, number][], epsilon = 1e-6) => {
  expect(actual.length).toBe(expected.length);
  actual.forEach((value, index) => {
    expect(value[0]).toBeCloseTo(expected[index][0], 6);
    expect(value[1]).toBeCloseTo(expected[index][1], 6);
  });
};

describe('Signal operations registry bindings', () => {
  it('computes FFT magnitude and complex bins', () => {
    const signal = [1, 0, 1, 0];
    const listValue = createList(signal.map(createNumber));

    const fftMagnitude = registry.execute('fft', [listValue]);
    const magnitudeBins = toNumberArray(fftMagnitude);
    const expectedMagnitude = computeFFT(signal).map(([re, im]) => Math.hypot(re, im));
    closeArray(magnitudeBins, expectedMagnitude);

    const fftComplex = registry.execute('fft_complex', [listValue]);
    const complexBins = toComplexArray(fftComplex);
    closeComplexArray(complexBins, computeFFT(signal));
  });

  it('computes IFFT and preserves complex outputs when needed', () => {
    const spectrum = computeFFT([1, 2, 3, 4]);
    const spectrumList = createList(spectrum.map(([re, im]) => createComplex(re, im)));
    const ifftValue = registry.execute('ifft', [spectrumList]);
    const reconstructed = toComplexArray(ifftValue).slice(0, 4);
    closeComplexArray(reconstructed, [
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
    ]);

    const complexSpectrum = createList([
      createComplex(1, 1),
      createComplex(0, -1),
      createComplex(-1, 0.5),
      createComplex(0.5, 0),
    ]);
    const complexSignal = registry.execute('ifft', [complexSpectrum]);
    const complexArray = toComplexArray(complexSignal);
    expect(complexArray.some(([, imag]) => Math.abs(imag) > 1e-6)).toBe(true);
  });

  it('evaluates the Z-transform', () => {
    const sequence = createList([createNumber(1), createNumber(2), createNumber(3)]);
    const result = registry.execute('z_transform', [sequence, createNumber(2)]);
    expect(result.kind).toBe('number');
    expect(result.value).toBeCloseTo(2.75, 6);
  });

  it('evaluates the Laplace transform with default and custom steps', () => {
    const samples = createList([createNumber(1), createNumber(1), createNumber(1)]);
    const defaultStep = registry.execute('laplace_transform', [samples, createNumber(0)]);
    expect(defaultStep.kind).toBe('number');
    expect(defaultStep.value).toBeCloseTo(3, 6);

    const customStep = registry.execute('laplace_transform', [samples, createNumber(1), createNumber(0.5)]);
    expect(customStep.kind).toBe('number');
    const expected = [0, 1, 2].reduce((sum, n) => sum + Math.exp(-n * 0.5) * 0.5, 0);
    expect(customStep.value).toBeCloseTo(expected, 6);
  });
});
