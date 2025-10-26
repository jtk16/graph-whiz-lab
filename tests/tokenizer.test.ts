import { describe, expect, it } from 'vitest';
import { tokenize, TokenType } from '@/lib/parser/tokenizer';
import { expressionEngine } from '@/lib/expression';

describe('Expression tokenizer', () => {
  it('tokenizes numbers, identifiers, and operators', () => {
    const tokens = tokenize('y = x^2 + sin(theta)');
    expect(tokens.some(token => token.type === TokenType.Identifier && token.value === 'y')).toBe(true);
    expect(tokens.some(token => token.type === TokenType.Operator && token.value === '=')).toBe(true);
  });

  it('handles comparison operators', () => {
    const tokens = tokenize('x >= 5');
    const op = tokens.find(token => token.type === TokenType.Operator && token.value === '>=');
    expect(op).toBeDefined();
  });

  it('splits iz into i*z', () => {
    const tokens = tokenize('iz');
    expect(tokens.map(token => token.type)).toEqual([
      TokenType.Imaginary,
      TokenType.Operator,
      TokenType.Identifier,
    ]);
    expect(tokens[1].value).toBe('*');
    expect(tokens[2].value).toBe('z');
  });

  it('expands 2i into 2*i', () => {
    const tokens = tokenize('2i');
    expect(tokens.map(token => token.type)).toEqual([
      TokenType.Number,
      TokenType.Operator,
      TokenType.Imaginary,
    ]);
    expect(tokens[0].value).toBe('2');
    expect(tokens[1].value).toBe('*');
  });

  it('keeps sin(x) as a function call', () => {
    const tokens = tokenize('sin(x)');
    const starOperator = tokens.find(token => token.type === TokenType.Operator && token.value === '*');
    expect(starOperator).toBeUndefined();
    expect(tokens.filter(token => token.type === TokenType.Identifier).map(token => token.value)).toContain('sin');
  });

  it('parses e^(iz) after normalization', () => {
    expect(() => expressionEngine.parseNormalized('e^(iz)')).not.toThrow();
  });

  it('does not split built-in functions like if()', () => {
    const tokens = tokenize('if(x>0,1,0)');
    expect(tokens[0]?.type).toBe(TokenType.Identifier);
    expect(tokens[0]?.value).toBe('if');
  });
});
