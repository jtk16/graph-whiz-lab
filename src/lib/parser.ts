// Basic math expression parser for MVP
// Supports: numbers, variables, basic operators, trig functions

import { DefinitionContext } from './definitionContext';
import { canCall, BUILTIN_FUNCTIONS } from './runtime/callables';

export interface ASTNode {
  type: 'number' | 'variable' | 'binary' | 'unary' | 'call';
  value?: number | string;
  operator?: string;
  left?: ASTNode;
  right?: ASTNode;
  name?: string;
  args?: ASTNode[];
}

const FUNCTIONS = Array.from(BUILTIN_FUNCTIONS);

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
      
      if (ch === '*' || ch === '/') {
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
    // Number
    if (this.isDigit(this.peek()) || this.peek() === '.') {
      return this.parseNumber();
    }

    // Parentheses
    if (this.peek() === '(') {
      this.consume();
      const expr = this.parseExpression();
      this.expect(')');
      return expr;
    }

    // Function or variable
    if (this.isLetter(this.peek())) {
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
    while (this.isLetter(this.peek()) || this.isDigit(this.peek()) || this.peek() === '_') {
      name += this.consume();
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
}

export function parseExpression(input: string, context?: DefinitionContext): ASTNode {
  const parser = new Parser(input, context);
  return parser.parse();
}
