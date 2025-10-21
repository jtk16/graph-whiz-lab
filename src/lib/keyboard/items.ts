import { KeyboardCategory } from './categories';
import { getKeyboardItems as getRegisteredKeyboardItems, KeyboardItem } from '../runtime/registry';

// Re-export KeyboardItem for convenience
export type { KeyboardItem };

// Static items that aren't functions (operators, constants, variables, data types)
const STATIC_KEYBOARD_ITEMS: KeyboardItem[] = [
  // ========== OPERATORS (All Implemented) ==========
  { id: 'add', latex: '+', normalized: '+', description: 'Addition', category: KeyboardCategory.Operators },
  { id: 'sub', latex: '-', normalized: '-', description: 'Subtraction', category: KeyboardCategory.Operators },
  { id: 'mul', latex: '\\cdot', normalized: '*', description: 'Multiplication', category: KeyboardCategory.Operators },
  { id: 'div', latex: '\\div', normalized: '/', description: 'Division', category: KeyboardCategory.Operators },
  { id: 'pow', latex: '^{#?}', normalized: '^', description: 'Exponentiation', category: KeyboardCategory.Operators, insertTemplate: '^{#0}' },
  { id: 'mod', latex: '\\bmod', normalized: '%', description: 'Modulo', category: KeyboardCategory.Operators },
  { id: 'lt', latex: '<', normalized: '<', description: 'Less than', category: KeyboardCategory.Operators },
  { id: 'gt', latex: '>', normalized: '>', description: 'Greater than', category: KeyboardCategory.Operators },
  { id: 'lte', latex: '\\le', normalized: '<=', description: 'Less than or equal', category: KeyboardCategory.Operators },
  { id: 'gte', latex: '\\ge', normalized: '>=', description: 'Greater than or equal', category: KeyboardCategory.Operators },
  { id: 'eq', latex: '=', normalized: '==', description: 'Equality', category: KeyboardCategory.Operators },
  { id: 'neq', latex: '\\ne', normalized: '!=', description: 'Not equal', category: KeyboardCategory.Operators },
  { id: 'and', latex: '\\land', normalized: '&&', description: 'Logical AND', category: KeyboardCategory.Operators },
  { id: 'or', latex: '\\lor', normalized: '||', description: 'Logical OR', category: KeyboardCategory.Operators },

  // ========== NON-FUNCTION ITEMS ==========
  { id: 'frac', latex: '\\frac{#?}{#?}', normalized: '/', description: 'Fraction', category: KeyboardCategory.Mathematical, insertTemplate: '\\frac{#0}{#1}' },
  
  // ========== CONSTANTS (Built-in, parsed directly) ==========
  { id: 'pi', latex: '\\pi', normalized: 'pi', description: 'Pi (3.14159...)', category: KeyboardCategory.Constants },
  { id: 'e', latex: 'e', normalized: 'e', description: 'Euler\'s number (2.71828...)', category: KeyboardCategory.Constants },
  { id: 'i', latex: 'i', normalized: 'i', description: 'Imaginary unit (√-1)', category: KeyboardCategory.Constants },

  // ========== COMMON VARIABLES ==========
  { id: 'x', latex: 'x', normalized: 'x', description: 'Variable x', category: KeyboardCategory.Variables },
  { id: 'y', latex: 'y', normalized: 'y', description: 'Variable y', category: KeyboardCategory.Variables },
  { id: 't', latex: 't', normalized: 't', description: 'Variable t (time)', category: KeyboardCategory.Variables },
  { id: 'theta', latex: '\\theta', normalized: 'theta', description: 'Angle theta', category: KeyboardCategory.Variables },

  // ========== DATA TYPE CONSTRUCTORS ==========
  { id: 'point', latex: '(#?,#?)', normalized: '(,)', description: 'Point/Vector', category: KeyboardCategory.DataTypes, insertTemplate: '(#0,#1)', example: '(3,4)' },
  { id: 'list', latex: '[#?]', normalized: '[]', description: 'List', category: KeyboardCategory.DataTypes, insertTemplate: '[#0]', example: '[1,2,3]' },
];

// Combine static items with registered function items
export const KEYBOARD_ITEMS: KeyboardItem[] = [
  ...STATIC_KEYBOARD_ITEMS,
  ...getRegisteredKeyboardItems(),
];

export function getItemsByCategory(category: KeyboardCategory): KeyboardItem[] {
  return KEYBOARD_ITEMS.filter(item => item.category === category);
}

export function getAllCategories(): KeyboardCategory[] {
  return Array.from(new Set(KEYBOARD_ITEMS.map(item => item.category)));
}
