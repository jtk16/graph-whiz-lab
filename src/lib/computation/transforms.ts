import {
  ComplexTuple,
  ZERO_COMPLEX,
  addComplex,
  complex,
  expComplex,
  mulComplex,
  powComplexInt,
  scaleComplex,
  toComplexTuple,
} from '../math/complex';

function normalizeSequence(sequence: Array<number | ComplexTuple>): ComplexTuple[] {
  return sequence.map(value => toComplexTuple(Array.isArray(value) ? value : value as number));
}

export function evaluateZTransform(
  sequence: Array<number | ComplexTuple>,
  zValue: number | ComplexTuple
): ComplexTuple {
  const z = toComplexTuple(Array.isArray(zValue) ? zValue : zValue as number);
  const samples = normalizeSequence(sequence);

  let result: ComplexTuple = [...ZERO_COMPLEX];
  for (let n = 0; n < samples.length; n++) {
    const zPower = powComplexInt(z, -n);
    result = addComplex(result, mulComplex(samples[n], zPower));
  }
  return result;
}

export function evaluateLaplaceTransform(
  samples: Array<number | ComplexTuple>,
  sValue: number | ComplexTuple,
  step = 1
): ComplexTuple {
  if (step <= 0) {
    throw new Error('Laplace transform step must be positive');
  }

  const s = toComplexTuple(Array.isArray(sValue) ? sValue : sValue as number);
  const normalizedSamples = normalizeSequence(samples);

  let result: ComplexTuple = [...ZERO_COMPLEX];
  for (let n = 0; n < normalizedSamples.length; n++) {
    const t = n * step;
    const exponent = scaleComplex(s, -t);
    const kernel = expComplex(exponent);
    const contribution = mulComplex(normalizedSamples[n], scaleComplex(kernel, step));
    result = addComplex(result, contribution);
  }
  return result;
}
