import { ASTNode } from '@/lib/parser';
import { evaluate } from '@/lib/runtime/evaluator';
import { DefinitionContext } from '@/lib/definitionContext';
import { isNumber } from '@/lib/runtime/value';

export interface ImplicitCurve2DData {
  segments: Array<{
    points: Array<{ x: number; y: number }>;
  }>;
}

export interface ImplicitCurve2DOptions {
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number };
  resolution: number;
}

/**
 * Evaluates implicit 2D curves using Marching Squares algorithm
 * Handles expressions like: x^2 + y^2 = 1, x^2 - y^2 = 1, etc.
 */
export class ImplicitCurve2DEvaluator {
  constructor(
    private ast: ASTNode,
    private context: DefinitionContext
  ) {}

  evaluateCurve(options: ImplicitCurve2DOptions): ImplicitCurve2DData {
    const implicitFn = this.createImplicitFunction();
    const { xMin, xMax, yMin, yMax } = options.bounds;
    const resolution = options.resolution;
    
    const stepX = (xMax - xMin) / resolution;
    const stepY = (yMax - yMin) / resolution;
    
    const segments: Array<{ points: Array<{ x: number; y: number }> }> = [];
    
    // Marching squares algorithm
    // Sample function at grid points and find zero crossings
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const x0 = xMin + i * stepX;
        const y0 = yMin + j * stepY;
        const x1 = x0 + stepX;
        const y1 = y0 + stepY;
        
        // Evaluate at four corners of cell
        const v00 = implicitFn(x0, y0);
        const v10 = implicitFn(x1, y0);
        const v01 = implicitFn(x0, y1);
        const v11 = implicitFn(x1, y1);
        
        // Create cell configuration based on signs
        let cellConfig = 0;
        if (v00 > 0) cellConfig |= 1;
        if (v10 > 0) cellConfig |= 2;
        if (v11 > 0) cellConfig |= 4;
        if (v01 > 0) cellConfig |= 8;
        
        // Skip cells that are completely inside or outside
        if (cellConfig === 0 || cellConfig === 15) continue;
        
        // Linear interpolation to find zero crossing points
        const points: Array<{ x: number; y: number }> = [];
        
        // Check each edge for zero crossing
        // Bottom edge (v00 to v10)
        if ((v00 > 0) !== (v10 > 0)) {
          const t = Math.abs(v00) / (Math.abs(v00) + Math.abs(v10));
          points.push({ x: x0 + t * stepX, y: y0 });
        }
        
        // Right edge (v10 to v11)
        if ((v10 > 0) !== (v11 > 0)) {
          const t = Math.abs(v10) / (Math.abs(v10) + Math.abs(v11));
          points.push({ x: x1, y: y0 + t * stepY });
        }
        
        // Top edge (v11 to v01)
        if ((v11 > 0) !== (v01 > 0)) {
          const t = Math.abs(v01) / (Math.abs(v01) + Math.abs(v11));
          points.push({ x: x0 + t * stepX, y: y1 });
        }
        
        // Left edge (v01 to v00)
        if ((v01 > 0) !== (v00 > 0)) {
          const t = Math.abs(v00) / (Math.abs(v00) + Math.abs(v01));
          points.push({ x: x0, y: y0 + t * stepY });
        }
        
        // Add segment if we found crossing points
        if (points.length >= 2) {
          segments.push({ points: [points[0], points[1]] });
        }
      }
    }
    
    return { segments };
  }

  private createImplicitFunction(): (x: number, y: number) => number {
    // Convert F(x, y) = c to F(x, y) - c = 0
    if (this.ast.type === 'binary' && this.ast.operator === '=') {
      return (x: number, y: number) => {
        try {
          const lhs = this.evaluateNode(this.ast.left!, { x, y });
          const rhs = this.evaluateNode(this.ast.right!, { x, y });
          return lhs - rhs;
        } catch (e) {
          return NaN;
        }
      };
    }
    
    // If already in form F(x, y), assume = 0
    return (x: number, y: number) => {
      try {
        return this.evaluateNode(this.ast, { x, y });
      } catch (e) {
        return NaN;
      }
    };
  }

  private evaluateNode(node: ASTNode, vars: Record<string, number>): number {
    const result = evaluate(node, vars, this.context);
    if (isNumber(result)) {
      return result.value;
    }
    return NaN;
  }
}
