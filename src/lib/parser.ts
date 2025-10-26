// Basic math expression parser for MVP
// Supports: numbers, variables, basic operators, trig functions

import { DefinitionContext } from './definitionContext';
import { canCall } from './runtime/callables';
import { registry } from './operations/registry';

export interface ASTNode {
  type: 'number' | 'variable' | 'binary' | 'unary' | 'call' | 'list' | 'derivative' | 'partial';
  value?: number | string;
  operator?: string;
  left?: ASTNode;
  right?: ASTNode;
  name?: string;
  args?: ASTNode[];
  elements?: ASTNode[]; // For list type
  variable?: string;    // For derivative/partial: variable name
  operand?: ASTNode;    // For derivative/partial: expression to differentiate
}

const FUNCTIONS = Array.from(registry.getBuiltinFunctions());

class Parser {
  private input: string;
  private pos: number;
  private context?: DefinitionContext;

  constructor(input: string, context?: DefinitionContext) {
    this.input = input.replace(/\s+/g, '');
    this.pos = 0;
    this.context = context;
  }

  parse(): ASTNode {
    return this.parseExpression();
  }

  private parseExpression(): ASTNode {
    return this.parseComparison();
  }

  private parseComparison(): ASTNode {
    let left = this.parseAddSub();

    while (true) {
      const ch = this.peek();
      const next = this.input[this.pos + 1] || '';
      
      if (ch === '<' && next === '=') {
        this.consume(); this.consume();
        const right = this.parseAddSub();
        left = { type: 'binary', operator: '<=', left, right };
      } else if (ch === '>' && next === '=') {
        this.consume(); this.consume();
        const right = this.parseAddSub();
        left = { type: 'binary', operator: '>=', left, right };
      } else if (ch === '=' && next === '=') {
        this.consume(); this.consume();
        const right = this.parseAddSub();
        left = { type: 'binary', operator: '==', left, right };
      } else if (ch === '!' && next === '=') {
        this.consume(); this.consume();
        const right = this.parseAddSub();
        left = { type: 'binary', operator: '!=', left, right };
      } else if (ch === '<') {
        this.consume();
        const right = this.parseAddSub();
        left = { type: 'binary', operator: '<', left, right };
      } else if (ch === '>') {
        this.consume();
        const right = this.parseAddSub();
        left = { type: 'binary', operator: '>', left, right };
      } else if (ch === '=') {
        // Handle single '=' for implicit relations
        this.consume();
        const right = this.parseAddSub();
        left = { type: 'binary', operator: '=', left, right };
      } else {
        break;
      }
    }

    return left;
  }

  private parseAddSub(): ASTNode {
    let left = this.parseMulDiv();

    while (this.peek() === '+' || this.peek() === '-') {
      const operator = this.consume();
      const right = this.parseMulDiv();
      left = { type: 'binary', operator, left, right };
    }

    return left;
  }

  private parseMulDiv(): ASTNode {
    let left = this.parsePower();

    while (true) {
      const ch = this.peek();
      
      if (ch === '*' || ch === '/' || ch === '%') {
        const operator = this.consume();
        const right = this.parsePower();
        left = { type: 'binary', operator, left, right };
      }
      // Implicit multiplication: variable followed by '('
      else if (ch === '(' && left.type === 'variable') {
        const right = this.parsePower(); // This will parse the parenthetical
        left = { type: 'binary', operator: '*', left, right };
      }
      else {
        break;
      }
    }

    return left;
  }

  private parsePower(): ASTNode {
    let left = this.parseUnary();

    if (this.peek() === '^') {
      this.consume();
      const right = this.parsePower(); // Right associative
      return { type: 'binary', operator: '^', left, right };
    }

    return left;
  }

  private parseUnary(): ASTNode {
    if (this.peek() === '-' || this.peek() === '+') {
      const operator = this.consume();
      const operand = this.parseUnary();
      return { type: 'unary', operator, right: operand };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode {
    // === DERIVATIVE OPERATORS ===
    const derivativePrefix = this.matchPrefix(['d/d{']);
    if (derivativePrefix) {
      return this.parseDerivativeOperator('derivative', derivativePrefix);
    }
    
    const partialPrefix = this.matchPrefix(['partial/partial{', '\u2202/\u2202{']);
    if (partialPrefix) {
      return this.parseDerivativeOperator('partial', partialPrefix);
    }
    
    
    // Number
    if (this.isDigit(this.peek()) || this.peek() === '.') {
      return this.parseNumber();
    }

    // List literals: [1, 2, 3]
    if (this.peek() === '[') {
      this.consume(); // '['
      const elements: ASTNode[] = [];
      
      if (this.peek() !== ']') {
        elements.push(this.parseExpression());
        while (this.peek() === ',') {
          this.consume(); // ','
          if (this.peek() === ']') break; // Allow trailing comma
          elements.push(this.parseExpression());
        }
      }
      
      this.expect(']');
      return { type: 'list', elements };
    }

    // Parentheses or Point literals
    if (this.peek() === '(') {
      this.consume(); // '('
      
      // Try to parse as point literal (x, y) or (x, y, z)
      const firstExpr = this.parseExpression();
      
      if (this.peek() === ',') {
        // Point literal
        const components = [firstExpr];
        
        while (this.peek() === ',') {
          this.consume(); // ','
          components.push(this.parseExpression());
        }
        
        this.expect(')');
        
        // Convert to list-like representation for points
        // 2D point: 2 components, 3D point: 3 components
        return { type: 'list', elements: components };
      }
      
      // Just a parenthesized expression
      this.expect(')');
      return firstExpr;
    }

    // Function or variable
    if (this.isIdentifierStart(this.peek())) {
      return this.parseIdentifier();
    }

    throw new Error(`Unexpected character: ${this.peek()}`);
  }

  private parseNumber(): ASTNode {
    let num = '';
    while (this.isDigit(this.peek()) || this.peek() === '.') {
      num += this.consume();
    }
    return { type: 'number', value: parseFloat(num) };
  }

  private parseIdentifier(): ASTNode {
    let name = '';
    while (this.isIdentifierStart(this.peek()) || this.isDigit(this.peek())) {
      name += this.consume();
    }

    // Handle imaginary unit 'i'
    if (name === 'i') {
      return { type: 'variable', value: 'i' };
    }

    // Check if it's a function call (identifier followed by parentheses)
    if (this.peek() === '(') {
      // Decide: callable or implicit multiplication?
      if (canCall(name, this.context)) {
        // Parse as function call
        this.consume(); // '('
        const args: ASTNode[] = [];
        
        if (this.peek() !== ')') {
          args.push(this.parseExpression());
          while (this.peek() === ',') {
            this.consume();
            args.push(this.parseExpression());
          }
        }
        
        this.expect(')');
        return { type: 'call', name, args };
      } else {
        // Non-callable type: return variable, let parseMulDiv handle '(' as multiplication
        return { type: 'variable', value: name };
      }
    }

    // Built-in function without parentheses (e.g., sin x)
    if (FUNCTIONS.includes(name)) {
      const arg = this.parsePrimary();
      return { type: 'call', name, args: [arg] };
    }

    return { type: 'variable', value: name };
  }

  private peek(): string {
    return this.input[this.pos] || '';
  }

  private consume(): string {
    return this.input[this.pos++] || '';
  }

  private expect(char: string): void {
    if (this.peek() !== char) {
      throw new Error(`Expected '${char}' but got '${this.peek()}'`);
    }
    this.consume();
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isLetter(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
  }

  private isIdentifierStart(char: string): boolean {
    return char === '_' || this.isLetter(char);
  }

  private matchPrefix(options: string[]): string | null {
    for (const option of options) {
      if (this.startsWith(option)) {
        return option;
      }
    }
    return null;
  }

  private startsWith(sequence: string): boolean {
    return this.input.startsWith(sequence, this.pos);
  }

  private parseDerivativeOperator(type: 'derivative' | 'partial', prefix?: string): ASTNode {
    const activePrefix = prefix ?? (type === 'derivative' ? 'd/d{' : '\u2202/\u2202{');
    for (let i = 0; i < activePrefix.length; i++) {
      this.consume();
    }

    let variable = '';
    while (this.peek() !== '}' && this.peek() !== '') {
      variable += this.consume();
    }

    if (this.peek() !== '}') {
      throw new Error(`Expected '}' in ${type} operator`);
    }
    this.consume();

    if (!variable) {
      throw new Error(`${type} operator missing variable name`);
    }

    let operand: ASTNode;

    if (this.peek() === '(') {
      this.consume();
      operand = this.parseExpression();
      this.expect(')');
    } else {
      operand = this.parsePower();
    }

    return {
      type,
      variable,
      operand
    };
  }
}

export function parseExpression(input: string, context?: DefinitionContext): ASTNode {
  const parser = new Parser(input, context);
  return parser.parse();
}


