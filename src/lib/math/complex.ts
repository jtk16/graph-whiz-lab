export type ComplexTuple = [number, number];

export const complex = (real: number, imag = 0): ComplexTuple => [real, imag];

export const ZERO_COMPLEX: ComplexTuple = [0, 0];
export const ONE_COMPLEX: ComplexTuple = [1, 0];

export function addComplex(a: ComplexTuple, b: ComplexTuple): ComplexTuple {
  return [a[0] + b[0], a[1] + b[1]];
}

export function subComplex(a: ComplexTuple, b: ComplexTuple): ComplexTuple {
  return [a[0] - b[0], a[1] - b[1]];
}

export function mulComplex(a: ComplexTuple, b: ComplexTuple): ComplexTuple {
  return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
}

export function scaleComplex(a: ComplexTuple, scale: number): ComplexTuple {
  return [a[0] * scale, a[1] * scale];
}

export function magnitudeComplex(a: ComplexTuple): number {
  return Math.hypot(a[0], a[1]);
}

export function phaseComplex(a: ComplexTuple): number {
  return Math.atan2(a[1], a[0]);
}

export function conjugateComplex(a: ComplexTuple): ComplexTuple {
  return [a[0], -a[1]];
}

export function inverseComplex(a: ComplexTuple): ComplexTuple {
  const denom = a[0] * a[0] + a[1] * a[1];
  if (denom === 0) {
    throw new Error("Cannot invert zero complex number");
  }
  return [a[0] / denom, -a[1] / denom];
}

export function powComplexInt(base: ComplexTuple, exponent: number): ComplexTuple {
  if (exponent === 0) return ONE_COMPLEX;
  if (exponent < 0) {
    return powComplexInt(inverseComplex(base), -exponent);
  }
  let result: ComplexTuple = ONE_COMPLEX;
  let power: ComplexTuple = base;
  let exp = exponent;
  while (exp > 0) {
    if (exp & 1) {
      result = mulComplex(result, power);
    }
    power = mulComplex(power, power);
    exp >>= 1;
  }
  return result;
}

export function expComplex(a: ComplexTuple): ComplexTuple {
  const expReal = Math.exp(a[0]);
  return [expReal * Math.cos(a[1]), expReal * Math.sin(a[1])];
}

export function toComplexTuple(value: number | ComplexTuple): ComplexTuple {
  if (Array.isArray(value) && value.length === 2) {
    return [value[0], value[1]];
  }
  return [value as number, 0];
}

export function isApproximatelyReal(value: ComplexTuple, epsilon = 1e-9): boolean {
  return Math.abs(value[1]) <= epsilon;
}

export function realPart(value: ComplexTuple): number {
  return value[0];
}

export function imagPart(value: ComplexTuple): number {
  return value[1];
}
