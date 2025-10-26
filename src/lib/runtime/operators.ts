// Operator overloading registry

import { MathType } from '../types';
import { RuntimeValue, createNumber, createBoolean, createPoint, createList, createComplex, isNumber, isPoint, isList, isComplex } from './value';

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

type ComplexTuple = { real: number; imag: number };

const COMPLEX_ZERO_EPSILON = 1e-12;

const toComplexTuple = (value: RuntimeValue): ComplexTuple => {
  if (isComplex(value)) {
    return { real: value.real, imag: value.imag };
  }
  if (isNumber(value)) {
    return { real: value.value, imag: 0 };
  }
  throw new Error('Type mismatch');
};

const registerComplexBinaryOperator = (
  operator: string,
  resultType: MathType,
  executor: (left: ComplexTuple, right: ComplexTuple) => RuntimeValue
) => {
  const wrap = (leftValue: RuntimeValue, rightValue: RuntimeValue) => {
    return executor(toComplexTuple(leftValue), toComplexTuple(rightValue));
  };

  const combos: Array<[MathType, MathType]> = [
    [MathType.Complex, MathType.Complex],
    [MathType.Complex, MathType.Number],
    [MathType.Number, MathType.Complex],
  ];

  combos.forEach(([leftType, rightType]) => {
    registerOperator(leftType, operator, rightType, resultType, wrap);
  });
};

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

registerOperator(MathType.Number, '%', MathType.Number, MathType.Number,
  (l, r) => {
    if (!isNumber(l) || !isNumber(r)) throw new Error('Type mismatch');
    return createNumber(l.value % r.value);
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

// ============= COMPLEX OPERATORS =============

registerComplexBinaryOperator('+', MathType.Complex, (l, r) =>
  createComplex(l.real + r.real, l.imag + r.imag));

registerComplexBinaryOperator('-', MathType.Complex, (l, r) =>
  createComplex(l.real - r.real, l.imag - r.imag));

registerComplexBinaryOperator('*', MathType.Complex, (l, r) =>
  createComplex(
    l.real * r.real - l.imag * r.imag,
    l.real * r.imag + l.imag * r.real
  ));

registerComplexBinaryOperator('/', MathType.Complex, (l, r) => {
  const denom = r.real * r.real + r.imag * r.imag;
  if (Math.abs(denom) < COMPLEX_ZERO_EPSILON) {
    throw new Error('Division by zero');
  }
  return createComplex(
    (l.real * r.real + l.imag * r.imag) / denom,
    (l.imag * r.real - l.real * r.imag) / denom
  );
});

const complexPow = (base: ComplexTuple, exponent: ComplexTuple) => {
  const magnitude = Math.sqrt(base.real * base.real + base.imag * base.imag);
  const angle = Math.atan2(base.imag, base.real);

  if (magnitude < COMPLEX_ZERO_EPSILON && Math.abs(angle) < COMPLEX_ZERO_EPSILON) {
    if (Math.abs(exponent.real) < COMPLEX_ZERO_EPSILON && Math.abs(exponent.imag) < COMPLEX_ZERO_EPSILON) {
      return createComplex(1, 0);
    }
    if (Math.abs(exponent.imag) < COMPLEX_ZERO_EPSILON && exponent.real > 0) {
      return createComplex(0, 0);
    }
    throw new Error('0 cannot be raised to a complex exponent');
  }

  const lnMag = Math.log(magnitude);
  const newMagnitude = Math.exp(exponent.real * lnMag - exponent.imag * angle);
  const newAngle = exponent.real * angle + exponent.imag * lnMag;
  return createComplex(
    newMagnitude * Math.cos(newAngle),
    newMagnitude * Math.sin(newAngle)
  );
};

registerComplexBinaryOperator('^', MathType.Complex, complexPow);

registerComplexBinaryOperator('==', MathType.Boolean, (l, r) =>
  createBoolean(l.real === r.real && l.imag === r.imag));

registerComplexBinaryOperator('!=', MathType.Boolean, (l, r) =>
  createBoolean(l.real !== r.real || l.imag !== r.imag));

