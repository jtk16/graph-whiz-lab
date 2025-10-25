import { describe, expect, it } from 'vitest';
import { tokenize, TokenType } from '@/lib/parser/tokenizer';

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
});
