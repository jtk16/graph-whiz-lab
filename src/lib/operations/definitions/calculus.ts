/**
 * Calculus operations: D (derivative), if (conditional), piecewise
 */

import { registry } from '../registry';
import { MathType } from '../../types';
import { isFunction, isBoolean, createFunction } from '../../runtime/value';
import { KeyboardCategory } from '../../keyboard/categories';
import { symbolicDerivativeAST, symbolicPartialAST } from '../../computation/symbolic';

// Derivative operator D
registry.register({
  id: 'derivative',
  name: 'D',
  syntax: {
    latex: 'D(#0)',
    normalized: 'D(#0)'
  },
  parse: {
    type: 'function'
  },
  types: {
    signatures: [
      { input: [MathType.Function], output: MathType.Function }
    ]
  },
  runtime: {
    evaluate: (args, context) => {
      const [arg] = args;
      if (isFunction(arg)) {
        // Get the function's parameter and body
        const param = arg.def.params[0];
        const body = arg.def.body;
        
        // Compute symbolic derivative
        const derivativeBody = symbolicDerivativeAST(body, param);
        
        // Return new function with derivative as body
        return createFunction({
          name: `D(${arg.def.name || 'f'})`,
          params: [param],
          body: derivativeBody
        });
      }
      throw new Error('D expects Function');
    }
  },
  variables: {
    bindsVariables: false
  },
  ui: {
    description: 'Derivative of function',
    category: KeyboardCategory.Calculus,
    example: 'D(x^2)'
  }
});

// Conditional if
registry.register({
  id: 'if',
  name: 'if',
  syntax: {
    latex: 'if(#0, #1, #2)',
    normalized: 'if(#0, #1, #2)'
  },
  parse: {
    type: 'function'
  },
  types: {
    signatures: [
      { input: [MathType.Boolean, MathType.Number, MathType.Number], output: MathType.Number }
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [cond, thenVal, elseVal] = args;
      if (isBoolean(cond)) {
        return cond.value ? thenVal : elseVal;
      }
      throw new Error('if expects Boolean condition');
    }
  },
  ui: {
    description: 'Conditional: if(condition, then, else)',
    category: KeyboardCategory.Conditional,
    example: 'if(x>0, x, -x)'
  }
});

// Piecewise
registry.register({
  id: 'piecewise',
  name: 'piecewise',
  syntax: {
    latex: 'piecewise(#0)',
    normalized: 'piecewise(#0)'
  },
  parse: {
    type: 'function'
  },
  types: {
    signatures: [
      { input: [MathType.List], output: MathType.Number }
    ]
  },
  runtime: {
    evaluate: (args) => {
      // Piecewise evaluation handled in evaluator
      // This is a placeholder
      throw new Error('Piecewise evaluation not yet implemented in new system');
    }
  },
  ui: {
    description: 'Piecewise function',
    category: KeyboardCategory.Conditional,
    example: 'piecewise(x<0, -x, x)'
  }
});
