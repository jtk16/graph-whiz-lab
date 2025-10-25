import '../operations'; // Ensure all operations are registered
import '../runtime'; // Initialize runtime side effects (higher-order, etc.)
import '../tools'; // Register visualization tools
import '../toolkits'; // Register toolkits through the store

import { ExpressionEngine, ExpressionModule } from './engine';

export const expressionEngine = new ExpressionEngine();

/**
 * Built-in module metadata. Additional modules can be registered at runtime by
 * calling registerExpressionModule().
 */
const coreModule: ExpressionModule = {
  id: 'core-environment',
  description: 'Initializes the built-in normalization pipeline and registries',
};

expressionEngine.registerModule(coreModule);

export function registerExpressionModule(module: ExpressionModule): void {
  expressionEngine.registerModule(module);
}

export * from './engine';
