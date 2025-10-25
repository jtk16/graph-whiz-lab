import { ASTNode, parseExpression } from '../parser';
import { DefinitionContext, buildDefinitionContext } from '../definitionContext';
import { RuntimeValue } from '../runtime/value';
import { evaluate as evaluateRuntime } from '../runtime/evaluator';
import { normalizeExpression } from '../normalizeExpression';
import { tokenize, Token } from '../parser/tokenizer';
import { hasUnboundVariables } from '../runtime/variableDetector';

export type ExpressionMiddleware = (expression: string) => string;
export type ContextAugmenter = (context: DefinitionContext) => DefinitionContext;

export interface ExpressionModule {
  id: string;
  description?: string;
  setup?: (engine: ExpressionEngine) => void;
  middlewares?: ExpressionMiddleware[];
  augmentContext?: ContextAugmenter;
}

export interface ParseOptions {
  skipNormalization?: boolean;
}

export interface ExpressionInspection {
  normalized: string;
  tokens: Token[];
  ast?: ASTNode;
  hasFreeVariables: boolean;
}

const DEFAULT_CACHE_SIZE = 200;

export class ExpressionEngine {
  private middlewares: ExpressionMiddleware[] = [];
  private contextAugmenters: ContextAugmenter[] = [];
  private modules = new Map<string, ExpressionModule>();
  private parserCache = new Map<string, ASTNode>();
  private cacheSize: number;

  constructor(options?: { cacheSize?: number }) {
    this.cacheSize = options?.cacheSize ?? DEFAULT_CACHE_SIZE;
    // Always run the base normalizer first unless consumers opt out explicitly
    this.useMiddleware(normalizeExpression);
  }

  /**
   * Register a processing middleware. Middlewares run sequentially and receive
   * the output from the previous middleware. Use them for normalization or
   * expression rewrites before parsing.
   */
  useMiddleware(middleware: ExpressionMiddleware): void {
    this.middlewares.push(middleware);
  }

  registerContextAugmenter(augmenter: ContextAugmenter): void {
    this.contextAugmenters.push(augmenter);
  }

  registerModule(module: ExpressionModule): void {
    if (this.modules.has(module.id)) {
      return;
    }
    this.modules.set(module.id, module);

    module.middlewares?.forEach(mw => this.useMiddleware(mw));
    if (module.augmentContext) {
      this.registerContextAugmenter(module.augmentContext);
    }
    module.setup?.(this);
  }

  getRegisteredModules(): ExpressionModule[] {
    return Array.from(this.modules.values());
  }

  normalize(expression: string): string {
    return this.middlewares.reduce((current, middleware) => middleware(current), expression ?? '');
  }

  buildContext(definitions: Array<{ normalized: string }>): DefinitionContext {
    const context = buildDefinitionContext(definitions);
    return this.contextAugmenters.reduce(
      (ctx, augment) => augment(ctx),
      context
    );
  }

  parse(expression: string, context?: DefinitionContext, options?: ParseOptions): ASTNode {
    const shouldSkipNormalization = options?.skipNormalization ?? false;
    const cacheKey = !context && !shouldSkipNormalization ? expression : null;

    if (cacheKey && this.parserCache.has(cacheKey)) {
      return this.parserCache.get(cacheKey)!;
    }

    const source = shouldSkipNormalization ? expression : this.normalize(expression);
    const ast = parseExpression(source, context);

    if (cacheKey) {
      this.addToCache(cacheKey, ast);
    }

    return ast;
  }

  parseNormalized(expression: string, context?: DefinitionContext): ASTNode {
    return this.parse(expression, context, { skipNormalization: true });
  }

  evaluate(ast: ASTNode, variables: Record<string, number>, context?: DefinitionContext): RuntimeValue {
    return evaluateRuntime(ast, variables, context);
  }

  evaluateExpression(expression: string, variables: Record<string, number>, context?: DefinitionContext): RuntimeValue {
    const ast = this.parse(expression, context);
    return this.evaluate(ast, variables, context);
  }

  hasFreeVariables(ast: ASTNode, context?: DefinitionContext): boolean {
    return hasUnboundVariables(ast, context);
  }

  inspect(expression: string, context?: DefinitionContext): ExpressionInspection {
    const normalized = this.normalize(expression);
    const tokens = tokenize(normalized);
    const ast = context ? this.parseNormalized(normalized, context) : undefined;
    const hasFreeVars = ast ? this.hasFreeVariables(ast, context) : false;
    return {
      normalized,
      tokens,
      ast,
      hasFreeVariables: hasFreeVars
    };
  }

  clearCache(): void {
    this.parserCache.clear();
  }

  setCacheSize(size: number): void {
    this.cacheSize = size;
    this.enforceCacheSize();
  }

  private addToCache(key: string, ast: ASTNode): void {
    this.parserCache.set(key, ast);
    this.enforceCacheSize();
  }

  private enforceCacheSize(): void {
    while (this.parserCache.size > this.cacheSize) {
      const oldestKey = this.parserCache.keys().next().value;
      this.parserCache.delete(oldestKey);
    }
  }
}
