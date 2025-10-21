// Point/vector functions using unified registry
import { MathType } from '../types';
import { RuntimeValue, createNumber, isPoint } from './value';
import { KeyboardCategory } from '../keyboard/categories';
import { registerFunction } from './registry';

// Vector magnitude (overload of length)
registerFunction({
  name: 'length',
  signatures: [{
    paramType: MathType.Point,
    returnType: MathType.Number,
    execute: (arg) => {
      if (!isPoint(arg)) throw new Error('length expects Point');
      return createNumber(Math.sqrt(arg.x * arg.x + arg.y * arg.y));
    }
  }],
  metadata: {
    latex: 'length(p)',
    description: 'Vector magnitude',
    category: KeyboardCategory.Points,
    example: 'length((3,4))'
  }
});
