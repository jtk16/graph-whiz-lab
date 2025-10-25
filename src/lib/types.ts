// Type system for mathematical expressions

export enum MathType {
  Number = 'Number',
  Complex = 'Complex',
  Boolean = 'Boolean',
  Point = 'Point',
  Point3D = 'Point3D',
  Vector3D = 'Vector3D',
  Curve3D = 'Curve3D',
  Surface3D = 'Surface3D',
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

const DEBUG_TYPE_INFER = false;
const debugType = (...args: unknown[]): void => {
  if (!DEBUG_TYPE_INFER) return;
  console.log(...args);
};

export function inferType(expr: string, normalized: string): TypeInfo {
  debugType('[inferType] expr:', expr, 'normalized:', normalized);
  
  // Check for equations (expressions with = that aren't ==)
  if (normalized.includes('=') && !normalized.includes('==')) {
    const parts = normalized.split('=');
    const lhs = parts[0].trim();
    const rhs = parts[1].trim();
    
    // Check for axis variable definitions FIRST: z = f(x,y), y = f(x), etc.
    if (lhs === 'z' || lhs === 'y' || lhs === 'x') {
      const hasX = /\bx\b/.test(rhs);
      const hasY = /\by\b/.test(rhs);
      const hasZ = /\bz\b/.test(rhs);
      
      if (lhs === 'z' && hasX && hasY && !hasZ) {
        // z = f(x,y) → Explicit Surface3D
        debugType('[inferType] Explicit surface z=f(x,y) detected');
        return { type: MathType.Surface3D };
      }
      
      if (lhs === 'y' && hasX && !hasY && !hasZ) {
        // y = f(x) → Explicit 2D curve (Function)
        debugType('[inferType] Explicit curve y=f(x) detected');
        return { type: MathType.Function, domain: MathType.Number, codomain: MathType.Number };
      }
      
      if (lhs === 'z' && hasX && !hasY && !hasZ) {
        // z = f(x) → Curve3D (curve in xz-plane)
        debugType('[inferType] 3D curve z=f(x) detected');
        return { type: MathType.Curve3D };
      }
      
      if (lhs === 'z' && hasY && !hasX && !hasZ) {
        // z = f(y) → Curve3D (curve in yz-plane)
        debugType('[inferType] 3D curve z=f(y) detected');
        return { type: MathType.Curve3D };
      }
      
      if (lhs === 'x' || (lhs === 'y' && !hasX) || (lhs === 'z' && !hasX && !hasY)) {
        // x = constant, y = constant, z = constant
        debugType('[inferType] Constant axis definition detected');
        return { type: MathType.Number };
      }
    }
    
    // If LHS contains operators or is not a simple identifier/function call,
    // this is an implicit relation, not a definition
    const simpleIdentifier = /^[a-z_][a-z0-9_]*$/i;
    const functionPattern = /^[a-z_][a-z0-9_]*\([^)]*\)$/i;
    const isImplicitRelation =
      lhs.match(/[+\-*\/^<>]/) !== null ||
      (lhs.includes('(') && !functionPattern.test(lhs)) ||
      (!simpleIdentifier.test(lhs) && !functionPattern.test(lhs) && !['x', 'y', 'z'].includes(lhs));

    if (isImplicitRelation) {
      
      // This is an implicit relation - determine dimensionality
      const tokenPool = `${lhs} ${rhs}`
        .replace(/[^a-z0-9_]/gi, ' ')
        .split(/\s+/)
        .map(token => token.trim())
        .filter(Boolean);
      const hasX = tokenPool.includes('x');
      const hasY = tokenPool.includes('y');
      const hasZ = tokenPool.includes('z');
      
      if (hasX && hasY && hasZ) {
        // 3D implicit surface: F(x, y, z) = c
        debugType('[inferType] Implicit 3D surface detected');
        return { type: MathType.Surface3D };
      } else if (hasX && hasY) {
        // 2D implicit curve: F(x, y) = c
        debugType('[inferType] Implicit 2D curve detected');
        return { type: MathType.Boolean };
      } else if (hasX || hasY || hasZ) {
        // 1D implicit: just an equation like x = 5
        debugType('[inferType] Implicit 1D relation detected');
        return { type: MathType.Boolean };
      }
      
      // Numeric comparison: 1 = 1
      return { type: MathType.Boolean };
    }
    
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
      debugType('[inferType] Function definition result:', result);
      return result;
    }
    
    // Variable definition
    const result = inferExpressionType(parts[1].trim());
    debugType('[inferType] Variable definition result:', result);
    return result;
  }
  
  // Boolean expressions (relations)
  if (normalized.match(/<|>|<=|>=|==|!=/)) {
    debugType('[inferType] Boolean expression');
    return { type: MathType.Boolean };
  }
  
  const result = inferExpressionType(normalized);
  debugType('[inferType] Expression result:', result);
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
  
  // Point literal: (x, y) or (x, y, z)
  if (expr.startsWith('(') && expr.includes(',') && !expr.includes(';')) {
    // Count commas to determine dimensionality
    const commaCount = (expr.match(/,/g) || []).length;
    return { type: commaCount === 2 ? MathType.Point3D : MathType.Point };
  }
  
  // List literal: [1, 2, 3] or [[matrix]]
  if (expr.startsWith('[')) {
    return { type: MathType.List };
  }
  
  // IMPORTANT: Check for variables BEFORE checking for pure numbers
  // This ensures cos(x) is typed as Function, not Number
  
  // Check if expression contains x, y, or z variables
  const hasX = /\bx\b/.test(expr);
  const hasY = /\by\b/.test(expr);
  const hasZ = /\bz\b/.test(expr);
  
  // 3D point literal: (x, y, z) with 3 comma-separated values
  if (expr.match(/^\([^,]+,[^,]+,[^)]+\)$/)) {
    return { type: MathType.Point3D };
  }
  
  // Standalone expressions with variables are functions, not geometric objects
  // Geometric typing happens only in axis variable definitions or implicit relations
  if (hasX || hasY || hasZ) {
    // Expression with x, y, or z is a function
    return {
      type: MathType.Function,
      domain: MathType.Number,
      codomain: MathType.Number
    };
  }
  
  // Pure number literal (includes decimals and negatives)
  if (expr.match(/^-?\d+(\.\d+)?$/)) {
    debugType('[inferExpressionType] Pure number match for:', expr);
    return { type: MathType.Number };
  }
  
  // Arithmetic expression with only numbers and operators (no variables)
  // This catches things like "7+8", "2*3", "10/2", etc.
  if (expr.match(/^[\d\+\-\*\/\^\(\)\.\s]+$/)) {
    debugType('[inferExpressionType] Arithmetic expression match for:', expr);
    return { type: MathType.Number };
  }
  
  // Function calls - smart detection based on whether they contain variables
  const funcMatch = expr.match(/^([a-z_][a-z0-9_]*)\(/i);
  if (funcMatch) {
    const funcName = funcMatch[1];
    // Check if arguments contain variables
    const hasVars = expr.match(/\bx\b|\by\b|\bz\b|\bt\b/);
    if (hasVars) {
      // Contains variables - this is a function expression
      return { type: MathType.Function, domain: MathType.Number, codomain: MathType.Number };
    }
    // No variables - assume it evaluates to a Number (could be refined per-function)
    return { type: MathType.Number };
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
    case MathType.Complex:
      return 'Complex';
    case MathType.Boolean:
      return 'Boolean';
    case MathType.Point:
      return 'Point';
    case MathType.Point3D:
      return 'Point3D';
    case MathType.Vector3D:
      return 'Vector3D';
    case MathType.Curve3D:
      return 'Curve3D';
    case MathType.Surface3D:
      return 'Surface3D';
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
    case MathType.Complex:
      return 'text-cyan-600';
    case MathType.Boolean:
      return 'text-green-500';
    case MathType.Point:
      return 'text-purple-500';
    case MathType.Point3D:
      return 'text-purple-600';
    case MathType.Vector3D:
      return 'text-violet-500';
    case MathType.Curve3D:
      return 'text-fuchsia-500';
    case MathType.Surface3D:
      return 'text-indigo-600';
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
