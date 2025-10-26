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
});
