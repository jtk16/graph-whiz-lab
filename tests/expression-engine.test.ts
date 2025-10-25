import { describe, expect, it } from 'vitest';
import { expressionEngine } from '@/lib/expression';
import { registry } from '@/lib/operations/registry';
import { SurfaceEvaluator } from '@/lib/computation/evaluators/SurfaceEvaluator';
import { cartesianSpace } from '@/lib/computation/spaces/cartesian';

describe('ExpressionEngine', () => {
  it('normalizes LaTeX before parsing', () => {
    const normalized = expressionEngine.normalize('\\frac{1}{2}x + \\sin(\\theta)');
    expect(normalized).toContain('(1)/(2)*x');
    expect(normalized).toContain('sin(theta)');
  });

  it('builds a definition context that exposes constants and functions', () => {
    const context = expressionEngine.buildContext([
      { normalized: 'a = 2' },
      { normalized: 'f(x) = x^2 + a' },
    ]);

    expect(context.variables.a).toBe(2);
    expect(context.functions.f).toBeDefined();
  });

  it('parses and evaluates expressions with registry operations', () => {
    const ast = expressionEngine.parse('sin(pi/2) + 2');
    const result = expressionEngine.evaluate(ast, {}, undefined);
    expect(result.kind).toBe('number');
    expect(result.value).toBeCloseTo(3);
  });

  it('inspects expressions and returns tokenized output', () => {
    const inspection = expressionEngine.inspect('y = x^2 + 1');
    expect(inspection.tokens.length).toBeGreaterThan(0);
    expect(inspection.tokens.some(token => token.value === 'x')).toBe(true);
  });

  it('exposes registered operations for module authors', () => {
    const keyboardItems = registry.getKeyboardItems();
    expect(keyboardItems.length).toBeGreaterThan(0);
  });

  it('produces implicit surfaces for constant-left equations', () => {
    const normalized = expressionEngine.normalize('1 = x^2 + y^2 - z');
    const context = expressionEngine.buildContext([]);
    const ast = expressionEngine.parse(normalized, context, { skipNormalization: true });
    const evaluator = new SurfaceEvaluator(ast, context, cartesianSpace);
    const data = evaluator.evaluateImplicitSurface({
      bounds: { xMin: -3, xMax: 3, yMin: -3, yMax: 3, zMin: -3, zMax: 3 },
      resolution: 12,
      isoValue: 0,
    });
    expect(data.vertices.length).toBeGreaterThan(0);
    expect(data.indices.length).toBeGreaterThan(0);
  });
});

