// Runtime initialization - ensures all operations are registered
import '../operations'; // Load unified operation system (auto-registers all operations)
import './registry'; // Legacy registry wrapper for backwards compatibility
import './higherOrderFunctions'; // Higher-order functions

// Re-export core APIs
export * from './registry';
export * from './value';
export * from './evaluator';
export * from './operators';
