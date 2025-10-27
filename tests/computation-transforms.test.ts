import { describe, expect, it } from 'vitest';
import { evaluateZTransform, evaluateLaplaceTransform } from '@/lib/computation/transforms';

const expectComplexClose = (
  actual: [number, number],
  expected: [number, number],
  epsilon = 1e-6
) => {
  const digits = Math.max(2, Math.round(-Math.log10(epsilon)));
  expect(actual[0]).toBeCloseTo(expected[0], digits);
  expect(actual[1]).toBeCloseTo(expected[1], digits);
};

const addComplex = (a: [number, number], b: [number, number]): [number, number] => [a[0] + b[0], a[1] + b[1]];
const mulComplex = (a: [number, number], b: [number, number]): [number, number] => [
  a[0] * b[0] - a[1] * b[1],
  a[0] * b[1] + a[1] * b[0],
];

const powComplexInt = (base: [number, number], exponent: number): [number, number] => {
  if (exponent === 0) return [1, 0];
  if (exponent < 0) {
    const denom = base[0] * base[0] + base[1] * base[1];
    if (denom === 0) throw new Error('Cannot raise zero to negative power');
    return powComplexInt([base[0] / denom, -base[1] / denom], -exponent);
  }
  let result: [number, number] = [1, 0];
  let power: [number, number] = [...base];
  let exp = exponent;
  while (exp > 0) {
    if (exp & 1) result = mulComplex(result, power);
    power = mulComplex(power, power);
    exp >>= 1;
  }
  return result;
};

describe('Transform evaluators', () => {
  it('evaluates the z-transform of real and complex sequences', () => {
    const sequence = [1, 2, 3];
    const zOne = evaluateZTransform(sequence, 1);
    expectComplexClose(zOne, [6, 0]);

    const zTwo = evaluateZTransform(sequence, 2);
    expectComplexClose(zTwo, [2.75, 0]);

    const complexSequence: [number, number][] = [
      [1, 1],
      [0.5, -0.5],
      [0, 1],
    ];
    const zValue: [number, number] = [Math.SQRT1_2, Math.SQRT1_2];
    const expected = complexSequence.reduce<[number, number]>((sum, sample, index) => {
      const zPower = powComplexInt(zValue, -index);
      return addComplex(sum, mulComplex(sample, zPower));
    }, [0, 0]);
    const evaluated = evaluateZTransform(complexSequence, zValue);
    expectComplexClose(evaluated, expected, 1e-5);
  });

  it('evaluates the discrete Laplace transform with configurable step', () => {
    const samples = [1, 1, 1];
    const sZero = evaluateLaplaceTransform(samples, 0, 1);
    expectComplexClose(sZero, [3, 0]);

    const step = 0.5;
    const sOne = evaluateLaplaceTransform(samples, 1, step);
    const expected = samples.reduce<[number, number]>((sum, value, index) => {
      const t = index * step;
      const realContribution = value * Math.exp(-1 * t) * step;
      return addComplex(sum, [realContribution, 0]);
    }, [0, 0]);
    expectComplexClose(sOne, expected);
  });
});
