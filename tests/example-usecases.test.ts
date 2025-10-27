import { describe, expect, it } from 'vitest';
import { expressionEngine } from '@/lib/expression';

const buildContextFromDefinitions = (defs: string[]) =>
  expressionEngine.buildContext(defs.map(normalized => ({ normalized })));

describe('End-to-end example use cases', () => {
  it('lets a graphing workspace combine toolkit definitions and user expressions', () => {
    const toolkitContext = buildContextFromDefinitions([
      'radius = 5',
      'circle(x, y) = x^2 + y^2 - radius^2',
    ]);
    const ast = expressionEngine.parseNormalized('circle(3,4)', toolkitContext);
    const result = expressionEngine.evaluate(ast, {}, toolkitContext);
    expect(result.kind).toBe('number');
    expect(result.value).toBeCloseTo(0);
  });

  it('runs a signal-processing pipeline inside the expression engine', () => {
    const ast = expressionEngine.parseNormalized('magnitude(fft([0, 1, 0, -1]))');
    const result = expressionEngine.evaluate(ast, {}, undefined);
    expect(result.kind).toBe('list');
    expect(result.elements).toHaveLength(4);
    const magnitudes = result.elements.map(el => (el.kind === 'number' ? el.value : NaN));
    expect(magnitudes[1]).toBeGreaterThan(magnitudes[0]);
  });

  it('evaluates complex example expressions for the complex plane tool', () => {
    const baseContext = expressionEngine.buildContext([]);
    const zAst = expressionEngine.parseNormalized(
      '__complex_re_value + (__complex_im_value * i)',
      baseContext
    );

    const contextWithZ = {
      ...baseContext,
      variables: {
        ...baseContext.variables,
        z: zAst,
      },
    };

    const sample = { re: 1.25, im: -0.6 };
    const evaluationVariables = {
      __complex_re_value: sample.re,
      __complex_im_value: sample.im,
      x: sample.re,
      y: sample.im,
      re: sample.re,
      im: sample.im,
    };

    const modulus = Math.hypot(sample.re, sample.im);
    const angle = Math.atan2(sample.im, sample.re);
    const sqrtMagnitude = Math.sqrt(modulus);

    const cases = [
      {
        expression: 'exp(z)',
        expected: {
          real: Math.exp(sample.re) * Math.cos(sample.im),
          imag: Math.exp(sample.re) * Math.sin(sample.im),
        },
      },
      {
        expression: 'sin(z)',
        expected: {
          real: Math.sin(sample.re) * Math.cosh(sample.im),
          imag: Math.cos(sample.re) * Math.sinh(sample.im),
        },
      },
      {
        expression: 'log(z)',
        expected: {
          real: Math.log10(modulus),
          imag: angle / Math.log(10),
        },
      },
      {
        expression: 'sqrt(z)',
        expected: {
          real: sqrtMagnitude * Math.cos(angle / 2),
          imag: sqrtMagnitude * Math.sin(angle / 2),
        },
      },
      {
        expression: 'exp(i * z)',
        expected: {
          real: Math.exp(-sample.im) * Math.cos(sample.re),
          imag: Math.exp(-sample.im) * Math.sin(sample.re),
        },
      },
    ];

    cases.forEach(({ expression, expected }) => {
      const ast = expressionEngine.parseNormalized(expression, contextWithZ);
      const result = expressionEngine.evaluate(ast, evaluationVariables, contextWithZ);
      expect(result.kind).toBe('complex');
      expect(result.real).toBeCloseTo(expected.real, 6);
      expect(result.imag).toBeCloseTo(expected.imag, 6);
    });
  });
});
