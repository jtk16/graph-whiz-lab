// Main export point for all computation modules
export * from './symbolic';
export * from './numerical';
export * from './signal';
export * from './integration';
export * from './derivatives';

// Re-export key functions
export {
  symbolicDerivative,
  simplifyExpression,
  partialDerivative,
} from './symbolic';

export {
  numericalIntegrate,
} from './numerical';

export {
  computeFFT,
  computeIFFT,
  computeIFFTReal,
  convolve,
} from './signal';

export {
  evaluateZTransform,
  evaluateLaplaceTransform,
} from './transforms';

export {
  integrate,
  doubleIntegral,
  symbolicIntegral,
} from './integration';

export {
  numericalGradient,
  jacobian,
  hessian,
  directionalDerivative,
} from './derivatives';
