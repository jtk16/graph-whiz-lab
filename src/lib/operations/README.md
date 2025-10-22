# Unified Operations System

## Overview

The Unified Operations System provides a **single source of truth** for all mathematical operations in the calculator. Each operation (function, operator, or special construct) is defined once with all its properties, and this definition automatically propagates to all subsystems.

## Architecture

### Core Components

1. **Operation Descriptor** (`descriptor.ts`): Defines the complete structure of an operation
2. **Operation Registry** (`registry.ts`): Central storage and query interface for all operations
3. **Operation Definitions** (`definitions/*.ts`): Individual operation implementations

### Subsystem Integration

The registry automatically provides:
- **Parser**: List of valid function names and special syntax patterns
- **Normalizer**: LaTeX → normalized form conversion rules
- **Type System**: Type signatures for inference
- **Evaluator**: Runtime execution logic
- **Variable Detector**: Custom variable binding rules
- **Keyboard UI**: Display metadata and insertion templates

## Operation Descriptor Structure

```typescript
{
  id: 'sin',              // Unique identifier
  name: 'sin',            // Function name in code
  
  syntax: {
    latex: '\\sin(#0)',          // LaTeX representation
    normalized: 'sin(#0)',       // Normalized form
    insertTemplate: '\\sin(#0)', // What to insert in editor
    aliases: [                   // Alternative forms
      { pattern: /\\sin\{([^}]+)\}/g, replacement: 'sin($1)', priority: 20 }
    ]
  },
  
  parse: {
    type: 'function'      // or 'operator', 'custom'
    // For operators: precedence, associativity
  },
  
  types: {
    signatures: [
      { 
        input: [MathType.Number],  // Input types
        output: MathType.Number,    // Output type
        symbolic: true              // Can remain symbolic (sin(x) → function)
      }
    ]
  },
  
  runtime: {
    evaluate: (args, context) => {
      // Execution logic
      return createNumber(Math.sin(args[0].value));
    }
  },
  
  variables: {
    customDetector: (node, context) => {
      // Custom variable detection (optional)
    }
  },
  
  ui: {
    description: 'Sine function',
    category: KeyboardCategory.Trigonometric,
    example: 'sin(π/2) = 1'
  }
}
```

## How to Add a New Operation

### Example: Adding modulo function

1. Create definition in appropriate file (`definitions/arithmetic.ts`):

```typescript
import { registry } from '../registry';
import { MathType } from '../../types';
import { isNumber, createNumber } from '../../runtime/value';
import { KeyboardCategory } from '../../keyboard/categories';

registry.register({
  id: 'mod',
  name: 'mod',
  syntax: {
    latex: 'mod(#0, #1)',
    normalized: 'mod(#0, #1)',
    aliases: [
      { pattern: /\\bmod/g, replacement: 'mod', priority: 30 }
    ]
  },
  parse: {
    type: 'function'
  },
  types: {
    signatures: [
      { input: [MathType.Number, MathType.Number], output: MathType.Number }
    ]
  },
  runtime: {
    evaluate: (args) => {
      const [a, b] = args;
      if (isNumber(a) && isNumber(b)) {
        return createNumber(a.value % b.value);
      }
      throw new Error('mod expects two Numbers');
    }
  },
  ui: {
    description: 'Modulo operation',
    category: KeyboardCategory.Arithmetic,
    example: 'mod(7, 3) = 1'
  }
});
```

2. **That's it!** The operation is now available:
   - Parser recognizes `mod(a, b)`
   - LaTeX `\bmod` normalizes to `mod`
   - Type system knows it returns Number
   - Evaluator can execute it
   - Keyboard shows it in Arithmetic category

## Operation Categories

Operations are organized into these files:

- **arithmetic.ts**: `+`, `-`, `*`, `/`, `^`, `%`
- **comparison.ts**: `<`, `>`, `<=`, `>=`, `==`, `!=`
- **logical.ts**: `and`, `or`, `not`
- **trigonometric.ts**: `sin`, `cos`, `tan`, `asin`, `acos`, `atan`
- **mathematical.ts**: `sqrt`, `abs`, `exp`, `ln`, `log`, `floor`, `ceil`, `round`
- **list.ts**: `length`, `sum`, `mean`, `min`, `max`, `variance`, `stdev`
- **complex.ts**: `arg`, `real`, `imag`, `conj`
- **point.ts**: `dot`, `cross`, `distance`
- **signal.ts**: `fft`, `ifft`, `magnitude`, `phase`
- **calculus.ts**: `D`, `d/dx`, `∂/∂x`, `if`, `piecewise`

## Benefits

### 1. Single Source of Truth
- Each operation defined once
- Impossible for subsystems to desynchronize
- Bug fixes update everywhere automatically

### 2. Type Safety
- TypeScript enforces complete descriptors
- Compile-time validation of signatures
- Runtime type checking

### 3. Extensibility
- Add operation = write one file
- Plugin architecture possible
- Easy to add domain-specific operations

### 4. Maintainability
- Understand operation: read one descriptor
- Debug issue: check single definition
- Modify behavior: update descriptor

### 5. Testability
- Each descriptor is isolated unit
- Test operations independently
- Mock descriptors for testing

## Migration from Old System

The old system had scattered definitions:
- Functions in `runtime/coreFunctions.ts`, `runtime/listFunctions.ts`, etc.
- LaTeX rules in `normalizeExpression.ts`
- Type inference in `types.ts`
- Parser rules in `parser.ts`

Now everything is in operation descriptors. Old files have been removed and replaced with thin wrappers for backwards compatibility.

### Legacy Compatibility

- `BUILTIN_FUNCTIONS` now comes from `registry.getBuiltinFunctions()`
- `getFunctionSignature` wrapper queries new registry
- All existing code continues to work

## Advanced Features

### Custom Parsers

For special syntax like derivatives:

```typescript
parse: {
  type: 'custom',
  parser: (input, pos) => {
    // Custom parsing logic
    return { node, newPos };
  }
}
```

### Custom Variable Detection

For operations that bind variables:

```typescript
variables: {
  customDetector: (node, context) => {
    // d/dx binds 'x', so check operand instead of variable
    return hasUnboundVariables(node.operand, context);
  }
}
```

### Multiple Signatures

Operations can overload on input types:

```typescript
types: {
  signatures: [
    { input: [MathType.Number], output: MathType.Number },
    { input: [MathType.Complex], output: MathType.Number },
    { input: [MathType.List], output: MathType.Number }
  ]
}
```

### Symbolic Operations

Mark operations that can remain symbolic:

```typescript
types: {
  signatures: [
    { 
      input: [MathType.Number], 
      output: MathType.Number,
      symbolic: true  // sin(x) → Function, sin(3) → Number
    }
  ]
}
```

## Testing

Test operations by category:

```typescript
// Test arithmetic
expect(evaluate('2 + 3')).toBe(5);
expect(plot('x + 3')).toHaveLength(100); // Function

// Test trig
expect(evaluate('sin(0)')).toBe(0);
expect(plot('sin(x)')).toBeSinWave();

// Test LaTeX normalization
expect(normalize('\\sin{x}')).toBe('sin(x)');

// Test type inference
expect(inferType('abs(3)')).toBe(MathType.Number);
expect(inferType('abs(x)')).toBe(MathType.Function);
```

## Future Enhancements

- Plugin system for custom operations
- Domain-specific operation packs (linear algebra, statistics, etc.)
- Operation composition and chaining
- Performance optimization (operation caching)
- Visual operation builder UI
