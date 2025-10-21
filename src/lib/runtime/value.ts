// Runtime value representation for the type system

import { FunctionDefinition } from '../definitionContext';
import { MathType } from '../types';

export type RuntimeValue = 
  | { kind: 'number'; value: number }
  | { kind: 'complex'; real: number; imag: number }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'point'; x: number; y: number }
  | { kind: 'list'; elements: RuntimeValue[]; elementType?: MathType }
  | { kind: 'function'; def: FunctionDefinition; boundParams?: Record<string, number> }
  | { kind: 'polygon'; points: RuntimeValue[] }
  | { kind: 'distribution'; params: Record<string, number> }
  | { kind: 'action'; name: string; handler: () => void };

// Helper functions to create runtime values
export function createNumber(value: number): RuntimeValue {
  return { kind: 'number', value };
}

export function createBoolean(value: boolean): RuntimeValue {
  return { kind: 'boolean', value };
}

export function createPoint(x: number, y: number): RuntimeValue {
  return { kind: 'point', x, y };
}

export function createList(elements: RuntimeValue[], elementType?: MathType): RuntimeValue {
  return { kind: 'list', elements, elementType };
}

export function createFunction(def: FunctionDefinition, boundParams?: Record<string, number>): RuntimeValue {
  return { kind: 'function', def, boundParams };
}

export function createComplex(real: number, imag: number): RuntimeValue {
  return { kind: 'complex', real, imag };
}

// Type guards
export function isNumber(value: RuntimeValue): value is { kind: 'number'; value: number } {
  return value.kind === 'number';
}

export function isBoolean(value: RuntimeValue): value is { kind: 'boolean'; value: boolean } {
  return value.kind === 'boolean';
}

export function isPoint(value: RuntimeValue): value is { kind: 'point'; x: number; y: number } {
  return value.kind === 'point';
}

export function isList(value: RuntimeValue): value is { kind: 'list'; elements: RuntimeValue[]; elementType?: MathType } {
  return value.kind === 'list';
}

export function isFunction(value: RuntimeValue): value is { kind: 'function'; def: FunctionDefinition; boundParams?: Record<string, number> } {
  return value.kind === 'function';
}

export function isComplex(value: RuntimeValue): value is { kind: 'complex'; real: number; imag: number } {
  return value.kind === 'complex';
}

// Convert RuntimeValue kind to MathType
export function kindToMathType(kind: string): MathType {
  switch (kind) {
    case 'number': return MathType.Number;
    case 'complex': return MathType.Complex;
    case 'boolean': return MathType.Boolean;
    case 'point': return MathType.Point;
    case 'list': return MathType.List;
    case 'function': return MathType.Function;
    case 'polygon': return MathType.Polygon;
    case 'distribution': return MathType.Distribution;
    case 'action': return MathType.Action;
    default: return MathType.Unknown;
  }
}
