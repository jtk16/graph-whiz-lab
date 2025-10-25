import { describe, expect, it } from 'vitest';
import { inferType, MathType } from '@/lib/types';

describe('Type inference', () => {
  it('treats constant-left equations as implicit relations', () => {
    const booleanType = inferType('1 = x^2 + y^2', '1 = x^2 + y^2');
    expect(booleanType.type).toBe(MathType.Boolean);
  });

  it('detects 3D surfaces even when the constant is on the left', () => {
    const surfaceType = inferType('1 = x^2 + y^2 + z^2', '1 = x^2 + y^2 + z^2');
    expect(surfaceType.type).toBe(MathType.Surface3D);
  });
});
