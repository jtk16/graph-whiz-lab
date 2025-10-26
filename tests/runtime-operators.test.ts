import { describe, expect, it } from 'vitest';
import { expressionEngine } from '@/lib/expression';

const evaluateComplex = (expression: string) => {
  const context = expressionEngine.buildContext([]);
  const ast = expressionEngine.parseNormalized(expression, context);
  return expressionEngine.evaluate(ast, {}, context);
};

describe('Runtime operators (complex support)', () => {
  it('adds and subtracts complex numbers in any combination', () => {
    const sum = evaluateComplex('(3 + 4*i) + (2 - i)');
    expect(sum.kind).toBe('complex');
    expect(sum.real).toBeCloseTo(5);
    expect(sum.imag).toBeCloseTo(3);

    const difference = evaluateComplex('(3 + 4*i) - 2');
    expect(difference.kind).toBe('complex');
    expect(difference.real).toBeCloseTo(1);
    expect(difference.imag).toBeCloseTo(4);
  });

  it('multiplies and divides complex values and numbers', () => {
    const product = evaluateComplex('(1 + 2*i) * (3 - i)');
    expect(product.kind).toBe('complex');
    expect(product.real).toBeCloseTo(5);
    expect(product.imag).toBeCloseTo(5);

    const division = evaluateComplex('(1 + 2*i) / (3 - i)');
    expect(division.kind).toBe('complex');
    expect(division.real).toBeCloseTo(0.1, 6);
    expect(division.imag).toBeCloseTo(0.7, 6);

    const numberOverComplex = evaluateComplex('3 / i');
    expect(numberOverComplex.kind).toBe('complex');
    expect(numberOverComplex.real).toBeCloseTo(0);
    expect(numberOverComplex.imag).toBeCloseTo(-3);
  });

  it('supports complex exponentiation with complex exponents', () => {
    const result = evaluateComplex('(1 + i)^(1 - i)');
    expect(result.kind).toBe('complex');
    // Expected value computed analytically
    const magnitude = Math.sqrt(2);
    const angle = Math.PI / 4;
    const lnMag = Math.log(magnitude);
    const expectedMagnitude = Math.exp(1 * lnMag - (-1) * angle);
    const expectedAngle = 1 * angle + (-1) * lnMag;
    expect(result.real).toBeCloseTo(expectedMagnitude * Math.cos(expectedAngle), 5);
    expect(result.imag).toBeCloseTo(expectedMagnitude * Math.sin(expectedAngle), 5);
  });

  it('compares complex numbers for equality', () => {
    const equalResult = evaluateComplex('(1 + i) == (1 + i)');
    expect(equalResult.kind).toBe('boolean');
    expect(equalResult.value).toBe(true);

    const notEqualResult = evaluateComplex('i == -i');
    expect(notEqualResult.kind).toBe('boolean');
    expect(notEqualResult.value).toBe(false);
  });
});
