// Expression validation system

import { DefinitionContext, RESERVED_NAMES, CONSTANTS } from '../definitionContext';
import { BUILTIN_FUNCTIONS } from '../runtime/callables';
import { UndefinedIdentifierError, CircularDependencyError } from '../errors/RuntimeError';
import { getSuggestions } from './suggestions';

export interface ValidationError {
  type: 'undefined_identifier' | 'circular_dependency' | 'parse_error';
  message: string;
  identifier?: string;
  suggestions?: string[];
}

export function validateExpression(
  normalized: string,
  context: DefinitionContext,
  currentId?: string
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!normalized || !normalized.trim()) {
    return errors;
  }

  // For definitions, only validate the RHS
  let expressionToValidate = normalized;
  const localParameters = new Set<string>();
  
  if (normalized.includes('=')) {
    const parts = normalized.split('=');
    if (parts.length === 2) {
      expressionToValidate = parts[1].trim(); // Only validate RHS
      
      // Extract function parameters if this is a function definition
      // e.g., f(t,x) = ... should extract [t, x]
      const funcDefMatch = parts[0].match(/^[a-zA-Z][a-zA-Z0-9_]*\(([^)]+)\)/);
      if (funcDefMatch) {
        const paramsStr = funcDefMatch[1];
        const params = paramsStr.split(',').map(p => p.trim());
        params.forEach(p => localParameters.add(p));
      }
    }
  }

  // Extract all identifiers from the expression (RHS only for definitions)
  const identifierRegex = /\b([a-zA-Z][a-zA-Z0-9_]*)\b/g;
  const matches = expressionToValidate.matchAll(identifierRegex);
  
  for (const match of matches) {
    const identifier = match[1];
    
    console.log(`  Checking identifier: '${identifier}'`);
    
    // Skip local parameters (function arguments)
    if (localParameters.has(identifier)) {
      console.log(`    ✓ Skipped (local parameter)`);
      continue;
    }
    
    // Skip built-in functions and reserved names
    if (BUILTIN_FUNCTIONS.has(identifier) || RESERVED_NAMES.includes(identifier)) {
      console.log(`    ✓ Skipped (builtin/reserved)`);
      continue;
    }
    
    // Skip constants
    if (identifier in CONSTANTS) {
      console.log(`    ✓ Skipped (constant)`);
      continue;
    }
    
    // Check if identifier exists in context
    const existsAsVariable = identifier in context.variables;
    const existsAsFunction = identifier in context.functions;
    
    console.log(`    Variable? ${existsAsVariable}, Function? ${existsAsFunction}`);
    console.log(`    Available functions:`, Object.keys(context.functions));
    console.log(`    Available variables:`, Object.keys(context.variables));
    
    if (!existsAsVariable && !existsAsFunction) {
      console.log(`    ❌ UNDEFINED`);
      const suggestions = getSuggestions(identifier, context);
      errors.push({
        type: 'undefined_identifier',
        message: `'${identifier}' is not defined`,
        identifier,
        suggestions,
      });
    } else {
      console.log(`    ✓ Valid`);
    }
  }
  
  return errors;
}

export function detectCircularDependency(
  normalized: string,
  allExpressions: Array<{ id: string; normalized: string }>,
  currentId: string,
  visited = new Set<string>()
): string | null {
  // Add current to visited set
  if (visited.has(currentId)) {
    return currentId; // Circular dependency found
  }
  
  visited.add(currentId);
  
  // Extract identifier from LHS if it's a definition
  const defMatch = normalized.match(/^([a-zA-Z][a-zA-Z0-9_]*)\s*(?:\([^)]*\))?\s*=/);
  if (!defMatch) {
    visited.delete(currentId);
    return null; // Not a definition, no circular dependency possible
  }
  
  const definedIdentifier = defMatch[1];
  
  // Extract all identifiers used in RHS
  const identifierRegex = /\b([a-zA-Z][a-zA-Z0-9_]*)\b/g;
  const rhs = normalized.split('=')[1] || '';
  const usedIdentifiers = new Set<string>();
  
  const matches = rhs.matchAll(identifierRegex);
  for (const match of matches) {
    const identifier = match[1];
    if (!BUILTIN_FUNCTIONS.has(identifier) && !RESERVED_NAMES.includes(identifier)) {
      usedIdentifiers.add(identifier);
    }
  }
  
  // Check each used identifier
  for (const usedId of usedIdentifiers) {
    // Find the expression that defines this identifier
    const definingExpr = allExpressions.find(expr => {
      const match = expr.normalized.match(/^([a-zA-Z][a-zA-Z0-9_]*)\s*(?:\([^)]*\))?\s*=/);
      return match && match[1] === usedId;
    });
    
    if (definingExpr && definingExpr.id !== currentId) {
      const cycle = detectCircularDependency(
        definingExpr.normalized,
        allExpressions,
        definingExpr.id,
        new Set(visited)
      );
      
      if (cycle) {
        visited.delete(currentId);
        return cycle;
      }
    }
  }
  
  visited.delete(currentId);
  return null;
}
