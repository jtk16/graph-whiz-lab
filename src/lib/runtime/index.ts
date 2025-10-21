// Runtime initialization - ensures all functions are registered
import './registry'; // Core registry infrastructure
import './coreFunctions'; // Trig and math functions
import './listFunctions'; // List operations
import './complexFunctions'; // Complex number functions
import './pointFunctions'; // Point/vector functions
import './signalFunctions'; // Signal processing
import './calculusFunctions'; // Calculus and conditionals
import '../computation/numericalFunctions'; // Numerical methods
import '../computation/derivativeFunctions'; // Advanced derivatives

// Re-export core APIs
export * from './registry';
export * from './value';
export * from './evaluator';
export * from './operators';
