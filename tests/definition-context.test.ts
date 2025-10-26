import { describe, expect, it } from 'vitest';
import { buildDefinitionContext, isImplicitRelation } from '@/lib/definitionContext';
import { expressionEngine } from '@/lib/expression';

describe('Definition context builder', () => {
  it('registers constants and functions for downstream tools', () => {
    const context = buildDefinitionContext([
      { normalized: 'scale = 2' },
      { normalized: 'offset = -1' },
      { normalized: 'curve(t) = scale * t + offset' },
    ]);

    expect(context.variables.scale).toBe(2);
    expect(context.variables.offset).toBe(-1);
    expect(context.functions.curve).toBeTruthy();

    const ast = expressionEngine.parseNormalized('curve(3)', context);
    const result = expressionEngine.evaluate(ast, {}, context);
    expect(result.kind).toBe('number');
    expect(result.value).toBeCloseTo(5);
  });

  it('ignores implicit relations and reserved identifiers', () => {
    const definitions = [
      { normalized: 'x^2 + y^2 = 25' },
      { normalized: 'x = 10' },
      { normalized: 'custom(t) = t^2' },
    ];
    const context = buildDefinitionContext(definitions);
    expect(isImplicitRelation(definitions[0].normalized)).toBe(true);
    expect(context.variables).not.toHaveProperty('x^2 + y^2');
    expect(context.variables).not.toHaveProperty('x');
    expect(context.functions.custom).toBeDefined();
  });
});
