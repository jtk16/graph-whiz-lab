// Suggestion system for undefined identifiers

import { DefinitionContext, CONSTANTS, RESERVED_NAMES } from '../definitionContext';
import { getBuiltinFunctions } from '../runtime/callables';

// Calculate Levenshtein distance between two strings
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

export function getSuggestions(
  undefinedId: string,
  context: DefinitionContext
): string[] {
  const allIdentifiers: string[] = [
    ...Array.from(getBuiltinFunctions()),
    ...RESERVED_NAMES,
    ...Object.keys(CONSTANTS),
    ...Object.keys(context.variables),
    ...Object.keys(context.functions),
  ];
  
  // Calculate distances and filter by threshold
  const threshold = 3; // Maximum edit distance to consider
  const candidates = allIdentifiers
    .map(id => ({
      id,
      distance: levenshteinDistance(undefinedId.toLowerCase(), id.toLowerCase()),
    }))
    .filter(({ distance }) => distance <= threshold)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3) // Top 3 suggestions
    .map(({ id }) => id);
  
  return candidates;
}

export function getAllAvailableIdentifiers(context: DefinitionContext): string[] {
  return [
    ...Array.from(getBuiltinFunctions()),
    ...RESERVED_NAMES,
    ...Object.keys(CONSTANTS),
    ...Object.keys(context.variables),
    ...Object.keys(context.functions),
  ].sort();
}
