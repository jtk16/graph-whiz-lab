/**
 * Operation Descriptor - Single source of truth for all mathematical operations
 * 
 * Each operation (function, operator, etc.) is defined once with all its properties:
 * - Syntax (LaTeX, normalization rules)
 * - Parsing (how to recognize and parse it)
 * - Type system (input/output types)
 * - Runtime execution (how to evaluate it)
 * - Variable analysis (how variables are bound/detected)
 * - UI metadata (keyboard, tooltips, examples)
 */

import { MathType } from '../types';
import { RuntimeValue } from '../runtime/value';
import { DefinitionContext } from '../definitionContext';
import { ASTNode } from '../parser';
import { KeyboardCategory } from '../keyboard/categories';

/**
 * Type signature for an operation
 */
export interface OperationSignature {
  input: MathType | MathType[];  // Single type or array of types for multiple params
  output: MathType;               // Return type
  symbolic?: boolean;             // Can create symbolic functions (e.g., abs(x) → function)
}

/**
 * Normalization rule for converting LaTeX to normalized form
 */
export interface NormalizationRule {
  pattern: RegExp;
  replacement: string | ((match: string, ...groups: string[]) => string);
  priority?: number;  // Lower = higher priority (applied first)
}

/**
 * Complete descriptor for a mathematical operation
 */
export interface OperationDescriptor {
  // Identity
  id: string;                      // Unique identifier (e.g., 'abs', 'sin', 'add')
  name: string;                    // Normalized name (e.g., 'abs', 'sin', '+')
  
  // Syntax and normalization
  syntax: {
    latex: string;                 // LaTeX template (e.g., '\\abs{#0}', '\\sin(#0)')
    normalized: string;            // Normalized form template (e.g., 'abs(#0)', 'sin(#0)')
    aliases?: NormalizationRule[]; // Alternative LaTeX forms (e.g., \left|#0\right| → abs)
    insertTemplate?: string;       // What keyboard inserts (defaults to latex)
  };
  
  // Parsing
  parse: {
    type: 'function' | 'binary' | 'unary' | 'special';
    precedence?: number;           // For operators
    associativity?: 'left' | 'right';
  };
  
  // Type system
  types: {
    signatures: OperationSignature[];
  };
  
  // Runtime execution
  runtime: {
    evaluate: (args: RuntimeValue[], context?: DefinitionContext) => RuntimeValue;
  };
  
  // Variable analysis (for functions like d/dx that bind variables)
  variables?: {
    bindsVariables?: boolean;      // Does this operation bind variables?
    customDetector?: (node: ASTNode, context?: DefinitionContext) => boolean;
  };
  
  // UI metadata
  ui: {
    description: string;
    category: KeyboardCategory;
    example?: string;
    hidden?: boolean;              // Don't show in keyboard
  };
}
