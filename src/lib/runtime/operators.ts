// Operator overloading registry

import { MathType } from '../types';
import { RuntimeValue, createNumber, createBoolean, createPoint, createList, isNumber, isPoint, isList } from './value';

type OperatorSignature = `${MathType}_${string}_${MathType}`;

interface OperatorDefinition {
  signature: OperatorSignature;
  execute: (left: RuntimeValue, right: RuntimeValue) => RuntimeValue;
  resultType: MathType;
}

const OPERATORS = new Map<OperatorSignature, OperatorDefinition>();

// Register an operator
export function registerOperator(
  leftType: MathType,
  operator: string,
  rightType: MathType,
  resultType: MathType,
  execute: (left: RuntimeValue, right: RuntimeValue) => RuntimeValue
): void {
  const sig: OperatorSignature = `${leftType}_${operator}_${rightType}`;
  OPERATORS.set(sig, { signature: sig, execute, resultType });
}

// Lookup an operator
export function getOperator(
  leftType: MathType,
  operator: string,
  rightType: MathType
): OperatorDefinition | undefined {
  const sig: OperatorSignature = `${leftType}_${operator}_${rightType}`;
  return OPERATORS.get(sig);
}

// ============= NUMBER OPERATORS =============

// Number arithmetic
registerOperator(MathType.Number, '+', MathType.Number, MathType.Number,
  (l, r) => {
    if (!isNumber(l) || !isNumber(r)) throw new Error('Type mismatch');
    return createNumber(l.value + r.value);
  });

registerOperator(MathType.Number, '-', MathType.Number, MathType.Number,
  (l, r) => {
    if (!isNumber(l) || !isNumber(r)) throw new Error('Type mismatch');
    return createNumber(l.value - r.value);
  });

registerOperator(MathType.Number, '*', MathType.Number, MathType.Number,
  (l, r) => {
    if (!isNumber(l) || !isNumber(r)) throw new Error('Type mismatch');
    return createNumber(l.value * r.value);
  });

registerOperator(MathType.Number, '/', MathType.Number, MathType.Number,
  (l, r) => {
    if (!isNumber(l) || !isNumber(r)) throw new Error('Type mismatch');
    return createNumber(l.value / r.value);
  });

registerOperator(MathType.Number, '^', MathType.Number, MathType.Number,
  (l, r) => {
    if (!isNumber(l) || !isNumber(r)) throw new Error('Type mismatch');
    return createNumber(Math.pow(l.value, r.value));
  });

// Number comparisons
registerOperator(MathType.Number, '<', MathType.Number, MathType.Boolean,
  (l, r) => {
    if (!isNumber(l) || !isNumber(r)) throw new Error('Type mismatch');
    return createBoolean(l.value < r.value);
  });

registerOperator(MathType.Number, '>', MathType.Number, MathType.Boolean,
  (l, r) => {
    if (!isNumber(l) || !isNumber(r)) throw new Error('Type mismatch');
    return createBoolean(l.value > r.value);
  });

registerOperator(MathType.Number, '<=', MathType.Number, MathType.Boolean,
  (l, r) => {
    if (!isNumber(l) || !isNumber(r)) throw new Error('Type mismatch');
    return createBoolean(l.value <= r.value);
  });

registerOperator(MathType.Number, '>=', MathType.Number, MathType.Boolean,
  (l, r) => {
    if (!isNumber(l) || !isNumber(r)) throw new Error('Type mismatch');
    return createBoolean(l.value >= r.value);
  });

registerOperator(MathType.Number, '==', MathType.Number, MathType.Boolean,
  (l, r) => {
    if (!isNumber(l) || !isNumber(r)) throw new Error('Type mismatch');
    return createBoolean(l.value === r.value);
  });

registerOperator(MathType.Number, '!=', MathType.Number, MathType.Boolean,
  (l, r) => {
    if (!isNumber(l) || !isNumber(r)) throw new Error('Type mismatch');
    return createBoolean(l.value !== r.value);
  });

// ============= POINT OPERATORS =============

// Point + Point (vector addition)
registerOperator(MathType.Point, '+', MathType.Point, MathType.Point,
  (l, r) => {
    if (!isPoint(l) || !isPoint(r)) throw new Error('Type mismatch');
    return createPoint(l.x + r.x, l.y + r.y);
  });

// Point - Point (vector subtraction)
registerOperator(MathType.Point, '-', MathType.Point, MathType.Point,
  (l, r) => {
    if (!isPoint(l) || !isPoint(r)) throw new Error('Type mismatch');
    return createPoint(l.x - r.x, l.y - r.y);
  });

// Number * Point (scalar multiplication)
registerOperator(MathType.Number, '*', MathType.Point, MathType.Point,
  (l, r) => {
    if (!isNumber(l) || !isPoint(r)) throw new Error('Type mismatch');
    return createPoint(l.value * r.x, l.value * r.y);
  });

// Point * Number (commutative scalar multiplication)
registerOperator(MathType.Point, '*', MathType.Number, MathType.Point,
  (l, r) => {
    if (!isPoint(l) || !isNumber(r)) throw new Error('Type mismatch');
    return createPoint(l.x * r.value, l.y * r.value);
  });

// Point / Number (scalar division)
registerOperator(MathType.Point, '/', MathType.Number, MathType.Point,
  (l, r) => {
    if (!isPoint(l) || !isNumber(r)) throw new Error('Type mismatch');
    return createPoint(l.x / r.value, l.y / r.value);
  });

// Point equality
registerOperator(MathType.Point, '==', MathType.Point, MathType.Boolean,
  (l, r) => {
    if (!isPoint(l) || !isPoint(r)) throw new Error('Type mismatch');
    return createBoolean(l.x === r.x && l.y === r.y);
  });

// ============= LIST OPERATORS =============

// List + List (concatenation)
registerOperator(MathType.List, '+', MathType.List, MathType.List,
  (l, r) => {
    if (!isList(l) || !isList(r)) throw new Error('Type mismatch');
    return createList([...l.elements, ...r.elements]);
  });

// Number * List (broadcast scalar multiplication)
registerOperator(MathType.Number, '*', MathType.List, MathType.List,
  (l, r) => {
    if (!isNumber(l) || !isList(r)) throw new Error('Type mismatch');
    return createList(
      r.elements.map(el => {
        if (isNumber(el)) {
          return createNumber(l.value * el.value);
        }
        // Try to find operator for this element type
        const op = getOperator(MathType.Number, '*', el.kind as any);
        if (op) {
          return op.execute(l, el);
        }
        throw new Error(`Cannot multiply Number with ${el.kind}`);
      })
    );
  });

// List * Number (commutative)
registerOperator(MathType.List, '*', MathType.Number, MathType.List,
  (l, r) => {
    if (!isList(l) || !isNumber(r)) throw new Error('Type mismatch');
    return createList(
      l.elements.map(el => {
        if (isNumber(el)) {
          return createNumber(el.value * r.value);
        }
        const op = getOperator(el.kind as any, '*', MathType.Number);
        if (op) {
          return op.execute(el, r);
        }
        throw new Error(`Cannot multiply ${el.kind} with Number`);
      })
    );
  });

// ============= BOOLEAN OPERATORS =============

registerOperator(MathType.Boolean, '&&', MathType.Boolean, MathType.Boolean,
  (l, r) => {
    if (l.kind !== 'boolean' || r.kind !== 'boolean') throw new Error('Type mismatch');
    return createBoolean(l.value && r.value);
  });

registerOperator(MathType.Boolean, '||', MathType.Boolean, MathType.Boolean,
  (l, r) => {
    if (l.kind !== 'boolean' || r.kind !== 'boolean') throw new Error('Type mismatch');
    return createBoolean(l.value || r.value);
  });

registerOperator(MathType.Boolean, '==', MathType.Boolean, MathType.Boolean,
  (l, r) => {
    if (l.kind !== 'boolean' || r.kind !== 'boolean') throw new Error('Type mismatch');
    return createBoolean(l.value === r.value);
  });
