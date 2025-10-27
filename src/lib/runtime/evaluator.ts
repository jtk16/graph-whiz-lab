// Type-aware expression evaluator using operator overloading

import { ASTNode } from '../parser';
import { DefinitionContext, FunctionDefinition } from '../definitionContext';
import { RuntimeValue, createNumber, createComplex, createFunction, kindToMathType, isNumber, isBoolean, createBoolean, createList, createPoint, createPoint3D } from './value';
import { getOperator } from './operators';
import { registry } from '../operations/registry';
import { evaluateConditional } from './functions';
import './higherOrderFunctions'; // Initialize higher-order functions
import { symbolicDerivativeAST, symbolicPartialAST } from '../computation/symbolic';
import { hasUnboundVariables } from './variableDetector';
import { MathType } from '../types';

// Helper to extract variable names from an AST node
function extractVariables(node: ASTNode, context?: DefinitionContext): string[] {
  const vars = new Set<string>();
  
  function walk(n: ASTNode): void {
    switch (n.type) {
      case 'variable':
        // Only include if not a constant or defined function
        const varName = String(n.value);
        if (varName !== 'pi' && varName !== 'e' && varName !== 'i') {
          if (!context?.functions || !(varName in context.functions)) {
            vars.add(varName);
          }
        }
        break;
      case 'binary':
        if (n.left) walk(n.left);
        if (n.right) walk(n.right);
        break;
      case 'unary':
        if (n.left) walk(n.left);
        if (n.right) walk(n.right);
        break;
      case 'call':
        n.args?.forEach(walk);
        break;
      case 'list':
        n.elements?.forEach(walk);
        break;
      case 'derivative':
      case 'partial':
        // Don't include the differentiation variable
        if (n.operand) walk(n.operand);
        break;
    }
  }
  
  walk(node);
  return Array.from(vars);
}


export function evaluate(
  node: ASTNode,
  variables: Record<string, number>,
  context?: DefinitionContext
): RuntimeValue {
  switch (node.type) {
    case 'number':
      return createNumber(node.value as number);

    case 'list':
      const elements = node.elements!.map(elem => evaluate(elem, variables, context));
      
      // Check if this is a point literal (tuple of numbers)
      if (elements.length === 2 && elements.every(isNumber)) {
        return createPoint(elements[0].value, elements[1].value);
      }
      if (elements.length === 3 && elements.every(isNumber)) {
        return createPoint3D(elements[0].value, elements[1].value, elements[2].value);
      }
      
      return createList(elements);

    case 'variable':
      const varName = node.value as string;
      
      // Check local variables first (e.g., x, y in function evaluation)
      if (varName in variables) {
        return createNumber(variables[varName]);
      }
      
      // Check context variables (defined constants or list ASTs)
      if (context?.variables && varName in context.variables) {
        const varValue = context.variables[varName];
        // If it's an AST node (for lists), evaluate it
        if (typeof varValue === 'object' && 'type' in varValue) {
          return evaluate(varValue as ASTNode, variables, context);
        }
        return createNumber(varValue);
      }
      
      // Check for built-in constants
      if (varName === 'pi') return createNumber(Math.PI);
      if (varName === 'e') return createNumber(Math.E);
      if (varName === 'i') return createComplex(0, 1);
      
      // Check if it's a function definition
      if (context?.functions && varName in context.functions) {
        return createFunction(context.functions[varName]);
      }
      
      throw new Error(`Unknown variable: ${varName}`);

    case 'binary':
      const left = evaluate(node.left!, variables, context);
      const right = evaluate(node.right!, variables, context);
      
      // Lookup operator based on runtime types
      const leftType = kindToMathType(left.kind);
      const rightType = kindToMathType(right.kind);
      const op = getOperator(leftType, node.operator!, rightType);
      
      if (!op) {
        throw new Error(
          `No operator '${node.operator}' for ${leftType} and ${rightType}`
        );
      }
      
      return op.execute(left, right);

    case 'unary': {
      const operand = evaluate(node.right!, variables, context);

      if (node.operator === '-') {
        if (operand.kind === 'number') {
          return createNumber(-operand.value);
        }
        if (operand.kind === 'complex') {
          return createComplex(-operand.real, -operand.imag);
        }
        throw new Error(`Unary minus not supported for ${operand.kind}`);
      }

      if (node.operator === 'not') {
        if (operand.kind === 'boolean') {
          return createBoolean(!operand.value);
        }
        if (operand.kind === 'number') {
          return createBoolean(operand.value === 0);
        }
        throw new Error('not expects Boolean or Number operand');
      }

      return operand; // Unary plus
    }

    case 'derivative':
      return evaluateDerivative(node, variables, context);

    case 'partial':
      return evaluatePartial(node, variables, context);

    case 'call':
      // Special handling for if(condition, trueValue, falseValue)
      if (node.name === 'if' && node.args && node.args.length === 3) {
        const condition = evaluate(node.args[0], variables, context);
        
        // Accept both numbers (0=false, non-zero=true) and booleans
        let conditionIsTrue = false;
        if (isNumber(condition)) {
          conditionIsTrue = condition.value !== 0;
        } else if (isBoolean(condition)) {
          conditionIsTrue = condition.value;
        } else {
          throw new Error('if() condition must evaluate to a number or boolean');
        }
        
        // Short-circuit evaluation: only evaluate the branch that will be taken
        if (conditionIsTrue) {
          return evaluate(node.args[1], variables, context);
        } else {
          return evaluate(node.args[2], variables, context);
        }
      }
      
      // Special handling for piecewise(cond1, val1, cond2, val2, ..., default)
      if (node.name === 'piecewise' && node.args && node.args.length >= 3) {
        // Must have odd number of args: pairs of (condition, value) + default
        if (node.args.length % 2 === 0) {
          throw new Error('piecewise() requires odd number of arguments: condition, value pairs, then default');
        }
        
        // Evaluate conditions in order with short-circuit
        for (let i = 0; i < node.args.length - 1; i += 2) {
          const condition = evaluate(node.args[i], variables, context);
          
          // Accept both numbers (0=false, non-zero=true) and booleans
          let conditionIsTrue = false;
          if (isNumber(condition)) {
            conditionIsTrue = condition.value !== 0;
          } else if (isBoolean(condition)) {
            conditionIsTrue = condition.value;
          } else {
            throw new Error('piecewise() conditions must evaluate to numbers or booleans');
          }
          
          // If condition is true, return this value
          if (conditionIsTrue) {
            const result = evaluate(node.args[i + 1], variables, context);
            return result;
          }
        }
        
        // No condition matched, return default (last argument)
        const defaultResult = evaluate(node.args[node.args.length - 1], variables, context);
        return defaultResult;
      }
      
      // Check if it's a user-defined function
      if (context?.functions && node.name && node.name in context.functions) {
        const funcDef = context.functions[node.name];
        
        if (!node.args) {
          throw new Error(`Function ${node.name} requires arguments`);
        }
        
        // Multi-parameter function support
        if (node.args.length === funcDef.params.length) {
          // Full application - all parameters provided
          const argValues = node.args.map(arg => evaluate(arg, variables, context));
          
          // Check all arguments are numbers
          const paramBindings: Record<string, number> = {};
          funcDef.params.forEach((param, i) => {
            if (!isNumber(argValues[i])) {
              throw new Error(`Function ${node.name} expects Number arguments`);
            }
            paramBindings[param] = argValues[i].value;
          });
          
          // Evaluate function body with all parameters bound
          const result = evaluate(funcDef.body, paramBindings, context);
          return result;
        }
        
        // Partial application - fewer args than params
        if (node.args.length < funcDef.params.length) {
          const argValues = node.args.map(arg => evaluate(arg, variables, context));
          
          // Bind provided arguments
          const boundParams: Record<string, number> = {};
          for (let i = 0; i < node.args.length; i++) {
            const argVal = argValues[i];
            if (!isNumber(argVal)) {
              throw new Error(`Function ${node.name} expects Number arguments`);
            }
            boundParams[funcDef.params[i]] = argVal.value;
          }
          
          // Return a partially applied function
          // For now, evaluate with bound params and remaining params from variables
          const mergedVars = { ...boundParams, ...variables };
          return evaluate(funcDef.body, mergedVars, context);
        }
        
        throw new Error(`Function ${node.name} expects ${funcDef.params.length} argument(s), got ${node.args.length}`);
      }
      
      // Built-in function
      if (!node.args || node.args.length === 0) {
        throw new Error(`Function ${node.name} requires arguments`);
      }
      
      if (node.args.length === 1) {
        const argNode = node.args[0];
        const argHasVariables = hasUnboundVariables(argNode, context);
        
        if (argHasVariables) {
          // Keep as symbolic function - check if operation supports it
          const match = registry.findSignature(node.name!, [MathType.Function]);
          
          if (match && match.operation.types.signatures[match.signatureIndex].symbolic) {
            return createFunction({
              name: node.name!,
              params: extractVariables(argNode, context),
              body: node
            });
          }
        }
      }
      
      const evaluatedArgs = node.args.map(arg => evaluate(arg, variables, context));
      const argTypes = evaluatedArgs.map(arg => kindToMathType(arg.kind));
      const match = registry.findSignature(node.name!, argTypes);
      
      if (!match) {
        throw new Error(`No function '${node.name}' for ${argTypes.join(', ')}`);
      }
      
      return registry.execute(node.name!, evaluatedArgs, context);

    default:
      throw new Error(`Unknown node type: ${(node as any).type}`);
  }
}

// Helper to evaluate and extract number (for backward compatibility with graphing)
export function evaluateToNumber(
  node: ASTNode,
  x: number,
  context?: DefinitionContext
): number {
  const result = evaluate(node, { x }, context);
  
  if (!isNumber(result)) {
    throw new Error(`Expression must return a number, got ${result.kind}`);
  }
  
  return result.value;
}

function evaluateDerivative(
  node: ASTNode,
  variables: Record<string, number>,
  context?: DefinitionContext
): RuntimeValue {
  const variable = node.variable!;
  const operand = node.operand!;
  
  // Use symbolic differentiation to transform the operand AST
  const derivativeAST = symbolicDerivativeAST(operand, variable);
  
  // Create a new function with the derivative body
  const derivativeDef: FunctionDefinition = {
    name: `d/d${variable}`,
    params: [variable],
    body: derivativeAST
  };
  
  return createFunction(derivativeDef);
}

function evaluatePartial(
  node: ASTNode,
  variables: Record<string, number>,
  context?: DefinitionContext
): RuntimeValue {
  const variable = node.variable!;
  const operand = node.operand!;
  
  // Use symbolic partial derivative
  const partialAST = symbolicPartialAST(operand, variable);
  
  // Create a new function with the partial derivative body
  const partialDef: FunctionDefinition = {
    name: `∂/∂${variable}`,
    params: [variable],
    body: partialAST
  };
  
  return createFunction(partialDef);
}
