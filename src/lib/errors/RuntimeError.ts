// Custom error types for runtime evaluation

export class RuntimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuntimeError';
  }
}

export class DivisionByZeroError extends RuntimeError {
  constructor(x?: number) {
    super(x !== undefined ? `Division by zero at x = ${x}` : 'Division by zero');
    this.name = 'DivisionByZeroError';
  }
}

export class DomainError extends RuntimeError {
  constructor(functionName: string, value?: number) {
    super(
      value !== undefined
        ? `${functionName} domain error: invalid input ${value}`
        : `${functionName} domain error`
    );
    this.name = 'DomainError';
  }
}

export class TypeMismatchError extends RuntimeError {
  constructor(operation: string, leftType: string, rightType?: string) {
    super(
      rightType
        ? `Cannot perform ${operation} on ${leftType} and ${rightType}`
        : `Cannot perform ${operation} on ${leftType}`
    );
    this.name = 'TypeMismatchError';
  }
}

export class UndefinedIdentifierError extends RuntimeError {
  identifier: string;
  suggestions: string[];

  constructor(identifier: string, suggestions: string[] = []) {
    super(`'${identifier}' is not defined`);
    this.name = 'UndefinedIdentifierError';
    this.identifier = identifier;
    this.suggestions = suggestions;
  }
}

export class CircularDependencyError extends RuntimeError {
  constructor(identifier: string) {
    super(`Circular dependency detected: ${identifier}`);
    this.name = 'CircularDependencyError';
  }
}

export class InvalidParameterCountError extends RuntimeError {
  constructor(functionName: string, expected: number, received: number) {
    super(
      `${functionName} expects ${expected} parameter${expected !== 1 ? 's' : ''}, but received ${received}`
    );
    this.name = 'InvalidParameterCountError';
  }
}
