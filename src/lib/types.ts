// Type system for mathematical expressions

export enum MathType {
  Number = 'Number',
  Boolean = 'Boolean',
  Point = 'Point',
  List = 'List',
  Function = 'Function',
  Polygon = 'Polygon',
  Distribution = 'Distribution',
  Action = 'Action',
  Unknown = 'Unknown',
  Error = 'Error'
}

export interface TypeInfo {
  type: MathType;
  elementType?: MathType; // For lists
  domain?: MathType | MathType[]; // For functions (single type or tuple)
  codomain?: MathType; // For functions
  dimensions?: number; // For lists/points
}

export function inferType(expr: string, normalized: string): TypeInfo {
  console.log('[inferType] expr:', expr, 'normalized:', normalized);
  
  // Handle definitions (e.g., f(x) = x^2)
  if (normalized.includes('=') && !normalized.includes('==')) {
    const parts = normalized.split('=');
    const lhs = parts[0].trim();
    
    // Function definition
    if (lhs.includes('(')) {
      const codomainType = inferReturnType(parts[1].trim());
      
      // Extract parameters to determine domain
      const paramsMatch = lhs.match(/\(([^)]+)\)/);
      let domain: MathType | MathType[] = MathType.Number;
      
      if (paramsMatch) {
        const params = paramsMatch[1].split(',').map(p => p.trim());
        if (params.length > 1) {
          // Multi-parameter function: (Number, Number, ...) → codomain
          domain = params.map(() => MathType.Number);
        } else {
          // Single parameter: Number → codomain
          domain = MathType.Number;
        }
      }
      
      const result = {
        type: MathType.Function,
        domain,
        codomain: codomainType
      };
      console.log('[inferType] Function definition result:', result);
      return result;
    }
    
    // Variable definition
    const result = inferExpressionType(parts[1].trim());
    console.log('[inferType] Variable definition result:', result);
    return result;
  }
  
  // Boolean expressions (relations)
  if (normalized.match(/<|>|<=|>=|==|!=/)) {
    console.log('[inferType] Boolean expression');
    return { type: MathType.Boolean };
  }
  
  const result = inferExpressionType(normalized);
  console.log('[inferType] Expression result:', result);
  return result;
}

function inferReturnType(expr: string): MathType {
  expr = expr.trim();
  
  // Point literal returns Point
  if (expr.startsWith('(') && expr.includes(',') && !expr.includes(';')) {
    return MathType.Point;
  }
  
  // List literal returns List
  if (expr.startsWith('[')) {
    return MathType.List;
  }
  
  // Boolean operations return Boolean
  if (expr.match(/^(and|or|not)\(/)) {
    return MathType.Boolean;
  }
  
  // Everything else in a function body returns Number
  return MathType.Number;
}

function inferExpressionType(expr: string): TypeInfo {
  expr = expr.trim();
  
  // Point literal: (x, y)
  if (expr.startsWith('(') && expr.includes(',') && !expr.includes(';')) {
    return { type: MathType.Point };
  }
  
  // List literal: [1, 2, 3] or [[matrix]]
  if (expr.startsWith('[')) {
    return { type: MathType.List };
  }
  
  // IMPORTANT: Check for variables BEFORE checking for pure numbers
  // This ensures cos(x) is typed as Function, not Number
  
  // Check if expression contains x or y variables
  const hasX = /\bx\b/.test(expr);
  const hasY = /\by\b/.test(expr);
  
  if (hasX && hasY) {
    // Implicit relation like x^2 + y^2 - both variables present
    return { type: MathType.Boolean };
  }
  
  if (hasX || hasY) {
    // Expression with x or y is a function
    return {
      type: MathType.Function,
      domain: MathType.Number,
      codomain: MathType.Number
    };
  }
  
  // Pure number literal (includes decimals and negatives)
  if (expr.match(/^-?\d+(\.\d+)?$/)) {
    console.log('[inferExpressionType] Pure number match for:', expr);
    return { type: MathType.Number };
  }
  
  // Arithmetic expression with only numbers and operators (no variables)
  // This catches things like "7+8", "2*3", "10/2", etc.
  if (expr.match(/^[\d\+\-\*\/\^\(\)\.\s]+$/)) {
    console.log('[inferExpressionType] Arithmetic expression match for:', expr);
    return { type: MathType.Number };
  }
  
  // Function calls that return specific types
  if (expr.match(/^(sin|cos|tan|sqrt|abs|exp|ln|log|floor|ceil|round)\(/)) {
    return { type: MathType.Number };
  }
  
  // Vector operations
  if (expr.match(/^(dot|cross|length|distance)\(/)) {
    return { type: MathType.Number };
  }
  
  // Boolean operations
  if (expr.match(/^(and|or|not)\(/)) {
    return { type: MathType.Boolean };
  }
  
  // Aggregate functions
  if (expr.match(/^(sum|mean|median|min|max|count)\(/)) {
    return { type: MathType.Number };
  }
  
  // Expressions with only constants (pi, e) and operators - still a number
  const withoutConstants = expr.replace(/pi|e/g, '1');
  if (withoutConstants.match(/^[\d\+\-\*\/\^\(\)\.\s]+$/)) {
    return { type: MathType.Number };
  }
  
  // Contains other variables - likely a function expression
  if (expr.match(/[a-z]/i) && !expr.match(/^(pi|e|true|false)$/)) {
    return { type: MathType.Function, domain: MathType.Number, codomain: MathType.Number };
  }
  
  // Default to Number for anything else (fallback)
  return { type: MathType.Number };
}

export function getTypeLabel(typeInfo: TypeInfo): string {
  switch (typeInfo.type) {
    case MathType.Number:
      return 'Number';
    case MathType.Boolean:
      return 'Boolean';
    case MathType.Point:
      return 'Point';
    case MathType.List:
      return typeInfo.elementType ? `List<${typeInfo.elementType}>` : 'List';
    case MathType.Function:
      if (typeInfo.domain && typeInfo.codomain) {
        // Handle tuple domain for multi-parameter functions
        if (Array.isArray(typeInfo.domain)) {
          const domainStr = typeInfo.domain
            .map(d => getTypeLabel({ type: d }))
            .join(', ');
          return `(${domainStr}) → ${getTypeLabel({ type: typeInfo.codomain })}`;
        }
        return `${getTypeLabel({ type: typeInfo.domain })} → ${getTypeLabel({ type: typeInfo.codomain })}`;
      }
      return 'Number → Number';
    case MathType.Polygon:
      return 'Polygon';
    case MathType.Distribution:
      return 'Distribution';
    case MathType.Action:
      return 'Action';
    case MathType.Error:
      return 'Error';
    default:
      return 'Unknown';
  }
}

export function getTypeColor(type: MathType): string {
  switch (type) {
    case MathType.Number:
      return 'text-blue-500';
    case MathType.Boolean:
      return 'text-green-500';
    case MathType.Point:
      return 'text-purple-500';
    case MathType.List:
      return 'text-orange-500';
    case MathType.Function:
      return 'text-pink-500';
    case MathType.Polygon:
      return 'text-indigo-500';
    case MathType.Distribution:
      return 'text-yellow-500';
    case MathType.Action:
      return 'text-cyan-500';
    case MathType.Error:
      return 'text-red-500';
    default:
      return 'text-muted-foreground';
  }
}
