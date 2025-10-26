export enum TokenType {
  Number = 'Number',
  Identifier = 'Identifier',
  Imaginary = 'Imaginary',
  Operator = 'Operator',
  ParenthesisOpen = 'ParenthesisOpen',
  ParenthesisClose = 'ParenthesisClose',
  BracketOpen = 'BracketOpen',
  BracketClose = 'BracketClose',
  BraceOpen = 'BraceOpen',
  BraceClose = 'BraceClose',
  Comma = 'Comma',
}

export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
}

export interface TokenizerState {
  readonly source: string;
  readonly length: number;
  position: number;
  peek(offset?: number): string;
  advance(count?: number): string;
  createToken(type: TokenType, value: string, start: number): Token;
}

type TokenizerPlugin = (state: TokenizerState) => Token | null;

const tokenizerPlugins = new Set<TokenizerPlugin>();

export function registerTokenizerPlugin(plugin: TokenizerPlugin): void {
  tokenizerPlugins.add(plugin);
}

export function clearTokenizerPlugins(): void {
  tokenizerPlugins.clear();
}

class DefaultTokenizerState implements TokenizerState {
  position = 0;

  constructor(public readonly source: string) {}

  get length(): number {
    return this.source.length;
  }

  peek(offset = 0): string {
    return this.source[this.position + offset] ?? '';
  }

  advance(count = 1): string {
    const value = this.source.slice(this.position, this.position + count);
    this.position += count;
    return value;
  }

  createToken(type: TokenType, value: string, start: number): Token {
    return {
      type,
      value,
      start,
      end: this.position,
    };
  }
}

const MULTI_CHAR_OPERATORS = ['<=', '>=', '==', '!='];

export function tokenize(source: string): Token[] {
  const state = new DefaultTokenizerState(source);
  const tokens: Token[] = [];

  while (state.position < state.length) {
    const char = state.peek();

    if (/\s/.test(char)) {
      state.advance();
      continue;
    }

    const pluginToken = runPlugins(state);
    if (pluginToken) {
      tokens.push(pluginToken);
      continue;
    }

    if (isDigit(char) || (char === '.' && isDigit(state.peek(1)))) {
      tokens.push(readNumber(state));
      continue;
    }

    if (isIdentifierStart(char)) {
      tokens.push(readIdentifier(state));
      continue;
    }

    const multiOperator = MULTI_CHAR_OPERATORS.find(op => source.startsWith(op, state.position));
    if (multiOperator) {
      const start = state.position;
      state.advance(multiOperator.length);
      tokens.push({
        type: TokenType.Operator,
        value: multiOperator,
        start,
        end: state.position,
      });
      continue;
    }

    switch (char) {
      case '+':
      case '-':
      case '*':
      case '/':
      case '^':
      case '%':
      case '=':
        tokens.push(singleCharToken(state, TokenType.Operator));
        break;
      case '(':
        tokens.push(singleCharToken(state, TokenType.ParenthesisOpen));
        break;
      case ')':
        tokens.push(singleCharToken(state, TokenType.ParenthesisClose));
        break;
      case '[':
        tokens.push(singleCharToken(state, TokenType.BracketOpen));
        break;
      case ']':
        tokens.push(singleCharToken(state, TokenType.BracketClose));
        break;
      case '{':
        tokens.push(singleCharToken(state, TokenType.BraceOpen));
        break;
      case '}':
        tokens.push(singleCharToken(state, TokenType.BraceClose));
        break;
      case ',':
        tokens.push(singleCharToken(state, TokenType.Comma));
        break;
      default:
        // Unknown characters are treated as operators to keep parsing flexible.
        tokens.push(singleCharToken(state, TokenType.Operator));
        break;
    }
  }

  return insertImplicitMultiplication(splitImaginaryIdentifiers(tokens));
}

function runPlugins(state: DefaultTokenizerState): Token | null {
  if (tokenizerPlugins.size === 0) {
    return null;
  }
  for (const plugin of tokenizerPlugins) {
    const snapshot = state.position;
    const token = plugin(state);
    if (token) {
      return token;
    }
    state.position = snapshot;
  }
  return null;
}

function readNumber(state: DefaultTokenizerState): Token {
  const start = state.position;
  let hasDot = false;

  while (state.position < state.length) {
    const char = state.peek();
    if (char === '.' && !hasDot) {
      hasDot = true;
      state.advance();
      continue;
    }
    if (!isDigit(char)) break;
    state.advance();
  }

  const value = state.source.slice(start, state.position);
  return {
    type: TokenType.Number,
    value,
    start,
    end: state.position,
  };
}

function readIdentifier(state: DefaultTokenizerState): Token {
  const start = state.position;
  while (state.position < state.length) {
    const char = state.peek();
    if (!isIdentifierPart(char)) break;
    state.advance();
  }

  const value = state.source.slice(start, state.position);
  if (value === 'i') {
    return {
      type: TokenType.Imaginary,
      value,
      start,
      end: state.position,
    };
  }
  return {
    type: TokenType.Identifier,
    value,
    start,
    end: state.position,
  };
}

function singleCharToken(state: DefaultTokenizerState, type: TokenType): Token {
  const start = state.position;
  const value = state.advance();
  return {
    type,
    value,
    start,
    end: state.position,
  };
}

function isDigit(char: string): boolean {
  return char >= '0' && char <= '9';
}

function isIdentifierStart(char: string): boolean {
  return /[a-zA-Z_]/.test(char) || char === '\u2202';
}

function isIdentifierPart(char: string): boolean {
  return isIdentifierStart(char) || isDigit(char) || char === '.';
}

function isAtomToken(token: Token): boolean {
  switch (token.type) {
    case TokenType.Number:
    case TokenType.Identifier:
    case TokenType.Imaginary:
    case TokenType.ParenthesisClose:
    case TokenType.BracketClose:
    case TokenType.BraceClose:
      return true;
    default:
      return false;
  }
}

function startsAtom(token: Token): boolean {
  switch (token.type) {
    case TokenType.Number:
    case TokenType.Identifier:
    case TokenType.Imaginary:
    case TokenType.ParenthesisOpen:
    case TokenType.BracketOpen:
    case TokenType.BraceOpen:
      return true;
    default:
      return false;
  }
}

function insertImplicitMultiplication(tokens: Token[]): Token[] {
  if (tokens.length === 0) return tokens;
  const result: Token[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const current = tokens[i];
    const next = tokens[i + 1];
    result.push(current);
    if (!next) continue;
    const identifierBeforeCall =
      current.type === TokenType.Identifier && next.type === TokenType.ParenthesisOpen;
    const consecutiveIdentifiers =
      current.type === TokenType.Identifier && next.type === TokenType.Identifier;

    if (
      !identifierBeforeCall &&
      !consecutiveIdentifiers &&
      isAtomToken(current) &&
      startsAtom(next)
    ) {
      result.push({
        type: TokenType.Operator,
        value: '*',
        start: current.end,
        end: current.end,
      });
    }
  }
  return result;
}

function splitImaginaryIdentifiers(tokens: Token[]): Token[] {
  const result: Token[] = [];
  tokens.forEach(token => {
    if (
      token.type === TokenType.Identifier &&
      token.value.length === 2 &&
      token.value[0].toLowerCase() === 'i' &&
      /[a-zA-Z_]/.test(token.value[1])
    ) {
      const [, secondChar] = token.value;
      result.push({
        type: TokenType.Imaginary,
        value: token.value[0],
        start: token.start,
        end: token.start + 1,
      });
      result.push({
        type: TokenType.Operator,
        value: '*',
        start: token.start + 1,
        end: token.start + 1,
      });
      result.push({
        type: TokenType.Identifier,
        value: secondChar,
        start: token.start + 1,
        end: token.end,
      });
    } else {
      result.push(token);
    }
  });
  return result;
}
