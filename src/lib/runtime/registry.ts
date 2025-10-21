// Unified function registry - single source of truth for all functions
import { MathType } from '../types';
import { RuntimeValue } from './value';
import { KeyboardCategory } from '../keyboard/categories';

// Keyboard item definition (moved here to break circular dependency)
export interface KeyboardItem {
  id: string;
  latex: string;
  normalized: string;
  description: string;
  category: KeyboardCategory;
  insertTemplate?: string;
  example?: string;
}

// Function signature definition
interface FunctionSignature {
  paramType: MathType;
  returnType: MathType;
  execute: (arg: RuntimeValue) => RuntimeValue;
}

// Complete function descriptor with runtime and UI metadata
export interface FunctionDescriptor {
  name: string;
  signatures: FunctionSignature[];
  metadata: {
    latex: string;
    description: string;
    category: KeyboardCategory;
    example?: string;
    insertTemplate?: string;
  };
}

// Central registry
export const FUNCTION_REGISTRY = new Map<string, FunctionDescriptor>();

// Auto-generated set for parser
export const BUILTIN_FUNCTIONS = new Set<string>();

// Register a function with all metadata
export function registerFunction(descriptor: FunctionDescriptor): void {
  FUNCTION_REGISTRY.set(descriptor.name, descriptor);
  BUILTIN_FUNCTIONS.add(descriptor.name);
}

// Generate keyboard items from registry
export function getKeyboardItems(): KeyboardItem[] {
  return Array.from(FUNCTION_REGISTRY.values()).map(desc => ({
    id: desc.name,
    latex: desc.metadata.latex,
    normalized: desc.name,
    description: desc.metadata.description,
    category: desc.metadata.category,
    example: desc.metadata.example,
    insertTemplate: desc.metadata.insertTemplate,
  }));
}

// Get function signature for runtime execution
export function getFunctionSignature(
  name: string,
  paramType: MathType
): FunctionSignature | undefined {
  const descriptor = FUNCTION_REGISTRY.get(name);
  if (!descriptor) return undefined;
  
  return descriptor.signatures.find(sig => sig.paramType === paramType);
}

// Check if a name is a registered function
export function isRegisteredFunction(name: string): boolean {
  return BUILTIN_FUNCTIONS.has(name);
}
