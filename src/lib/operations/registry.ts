/**
 * Central Operation Registry - Single source of truth
 * 
 * All mathematical operations are registered here and distributed to subsystems:
 * - Parser (what functions/operators exist)
 * - Normalizer (LaTeX → normalized form)
 * - Type system (what types operations accept/return)
 * - Evaluator (how to execute operations)
 * - Variable detector (how variables are bound)
 * - Keyboard (what to show users)
 */

import { OperationDescriptor, NormalizationRule } from './descriptor';
import { KeyboardCategory } from '../keyboard/categories';
import { MathType } from '../types';
import { RuntimeValue } from '../runtime/value';
import { DefinitionContext } from '../definitionContext';

/**
 * Check if a provided type is compatible with an expected type
 * Handles subset relationships (e.g., Number ⊂ Complex)
 * 
 * @extensibility When adding new type relationships, add them here:
 * 
 * This function defines mathematical subset relationships that allow automatic
 * type coercion during operation resolution. When adding new relationships:
 * 
 * 1. Ensure mathematical correctness - the coercion must be semantically valid
 * 2. Document WHY the coercion is valid (mathematical basis)
 * 3. Add corresponding promotion helpers in src/lib/runtime/value.ts if needed
 * 4. Update affected operations to handle the new type in their runtime.evaluate
 * 
 * Examples of future extensions:
 *   • Integers ⊂ Reals (if integer type is added)
 *     Mathematical basis: ℤ ⊂ ℝ
 *   
 *   • Scalars ⊂ Vectors (for scalar multiplication, broadcasting)
 *     Mathematical basis: scalar can be promoted to single-element vector
 *   
 *   • Single values ⊂ Lists (automatic wrapping)
 *     Mathematical basis: any value can be treated as a singleton list
 *   
 *   • 2D Points ⊂ 3D Points (extend with z=0)
 *     Mathematical basis: ℝ² ⊂ ℝ³ via embedding (x,y) → (x,y,0)
 * 
 * Current relationships:
 *   • Number ⊂ Complex: Any real number r can be represented as r + 0i (ℝ ⊂ ℂ)
 *   • Unknown matches anything: For flexibility during type inference
 */
function isTypeCompatible(provided: MathType, expected: MathType): boolean {
  if (provided === expected) return true;
  
  // Real numbers are a subset of complex numbers
  // Mathematical basis: ℝ ⊂ ℂ where any real r = r + 0i
  if (expected === MathType.Complex && provided === MathType.Number) return true;
  if (expected === MathType.List && (provided === MathType.Point || provided === MathType.Point3D)) return true;
  
  // Unknown can match anything (for flexibility during type inference)
  if (expected === MathType.Unknown || provided === MathType.Unknown) return true;
  
  // TODO: Add more subset relationships here as needed
  // Example: if (expected === MathType.Vector3D && provided === MathType.Point2D) return true;
  
  return false;
}

export interface KeyboardItem {
  id: string;
  latex: string;
  normalized: string;
  description: string;
  category: KeyboardCategory;
  example?: string;
  insertTemplate?: string;
}

class OperationRegistry {
  private operations = new Map<string, OperationDescriptor>();
  
  /**
   * Register an operation
   */
  register(descriptor: OperationDescriptor): void {
    this.operations.set(descriptor.id, descriptor);
  }
  
  /**
   * Get operation by ID
   */
  get(id: string): OperationDescriptor | undefined {
    return this.operations.get(id);
  }
  
  /**
   * Get all operations
   */
  getAll(): OperationDescriptor[] {
    return Array.from(this.operations.values());
  }
  
  /**
   * Get all function names (for parser)
   */
  getBuiltinFunctions(): Set<string> {
    const functions = new Set<string>();
    for (const op of this.operations.values()) {
      if (op.parse.type === 'function') {
        functions.add(op.name);
      }
    }
    return functions;
  }
  
  /**
   * Get all normalization rules (for normalizer)
   */
  getNormalizationRules(): NormalizationRule[] {
    const rules: NormalizationRule[] = [];
    
    for (const op of this.operations.values()) {
      // Add aliases
      if (op.syntax.aliases) {
        rules.push(...op.syntax.aliases);
      }
      
      // Add main LaTeX → normalized rule (only if different)
      if (op.syntax.latex !== op.syntax.normalized) {
        // Convert template to regex
        const latexPattern = op.syntax.latex
          .replace(/\\/g, '\\\\')
          .replace(/\{/g, '\\{')
          .replace(/\}/g, '\\}')
          .replace(/#(\d+)/g, '([^}]+)');
        
        const normalizedTemplate = op.syntax.normalized
          .replace(/#(\d+)/g, '$$$1');
        
        rules.push({
          pattern: new RegExp(latexPattern, 'g'),
          replacement: normalizedTemplate,
          priority: 50
        });
      }
    }
    
    // Sort by priority (lower = higher priority)
    return rules.sort((a, b) => (a.priority ?? 50) - (b.priority ?? 50));
  }
  
  /**
   * Get keyboard items (for UI)
   */
  getKeyboardItems(): KeyboardItem[] {
    return Array.from(this.operations.values())
      .filter(op => !op.ui.hidden)
      .map(op => ({
        id: op.id,
        latex: op.syntax.insertTemplate || op.syntax.latex,
        normalized: op.name,
        description: op.ui.description,
        category: op.ui.category,
        example: op.ui.example,
        insertTemplate: op.syntax.insertTemplate || op.syntax.latex
      }));
  }
  
  /**
   * Find operation signature for runtime execution
   */
  findSignature(
    operationId: string,
    argTypes: MathType[]
  ): { operation: OperationDescriptor; signatureIndex: number } | undefined {
    const op = this.operations.get(operationId);
    if (!op) return undefined;
    
    // Find matching signature
    for (let i = 0; i < op.types.signatures.length; i++) {
      const sig = op.types.signatures[i];
      const inputTypes = Array.isArray(sig.input) ? sig.input : [sig.input];
      
      if (argTypes.length !== inputTypes.length) continue;
      
      // Check if all argument types are compatible
      const matches = argTypes.every((argType, idx) => {
        return isTypeCompatible(argType, inputTypes[idx]);
      });
      
      if (matches) {
        return { operation: op, signatureIndex: i };
      }
    }
    
    return undefined;
  }
  
  /**
   * Execute an operation
   */
  execute(
    operationId: string,
    args: RuntimeValue[],
    context?: DefinitionContext
  ): RuntimeValue {
    const op = this.operations.get(operationId);
    if (!op) {
      throw new Error(`Unknown operation: ${operationId}`);
    }
    
    return op.runtime.evaluate(args, context);
  }
}

// Singleton registry instance
export const registry = new OperationRegistry();
