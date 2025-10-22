import { ASTNode } from '@/lib/parser';
import { evaluate } from '@/lib/runtime/evaluator';
import { DefinitionContext } from '@/lib/definitionContext';
import { isPoint, isPoint3D, isNumber, isList } from '@/lib/runtime/value';

/**
 * Data structure for parametric curves
 */
export interface CurveData {
  points: Float32Array;  // [x, y, z, x, y, z, ...]
  tangents?: Float32Array;   // [tx, ty, tz, tx, ty, tz, ...]
}

export interface CurveEvaluationOptions {
  parameterName: string;   // e.g., 't'
  parameterRange: { min: number; max: number };
  resolution: number;      // Number of sample points
}

/**
 * Evaluator for parametric curves in 3D space
 * Handles: r(t) = (x(t), y(t), z(t))
 */
export class ParametricCurveEvaluator {
  constructor(
    private ast: ASTNode,
    private context: DefinitionContext
  ) {}
  
  /**
   * Evaluate parametric curve r(t) = (x(t), y(t), z(t))
   */
  evaluateCurve(options: CurveEvaluationOptions): CurveData {
    const { parameterName, parameterRange, resolution } = options;
    
    const points: number[] = [];
    const tangents: number[] = [];
    
    const step = (parameterRange.max - parameterRange.min) / resolution;
    
    for (let i = 0; i <= resolution; i++) {
      const t = parameterRange.min + i * step;
      
      try {
        // Evaluate the curve at parameter value t
        const vars = { [parameterName]: t };
        const result = evaluate(this.ast, vars, this.context);
        
        // Extract 3D point from result
        let x = 0, y = 0, z = 0;
        
        if (isPoint3D(result)) {
          // Direct 3D point
          x = result.x;
          y = result.y;
          z = result.z;
        } else if (isPoint(result)) {
          // 2D point - treat as 3D with z=0
          x = result.x;
          y = result.y;
          z = 0;
        } else if (isList(result) && result.elements.length >= 2) {
          // List/tuple of values
          const elements = result.elements;
          if (isNumber(elements[0])) x = elements[0].value;
          if (isNumber(elements[1])) y = elements[1].value;
          if (elements.length >= 3 && isNumber(elements[2])) {
            z = elements[2].value;
          }
        } else if (isNumber(result)) {
          // Single number - parametric curve in 2D as (t, f(t))
          x = t;
          y = result.value;
          z = 0;
        }
        
        // Validate finite values
        if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
          // Skip invalid points
          continue;
        }
        
        points.push(x, y, z);
        
        // Compute tangent vector (numerical derivative)
        if (i > 0 && points.length >= 6) {
          const prevIdx = points.length - 6;
          const tx = x - points[prevIdx];
          const ty = y - points[prevIdx + 1];
          const tz = z - points[prevIdx + 2];
          
          // Normalize tangent
          const len = Math.sqrt(tx * tx + ty * ty + tz * tz);
          if (len > 0) {
            tangents.push(tx / len, ty / len, tz / len);
          } else {
            tangents.push(0, 0, 1); // Default to z-axis
          }
        }
      } catch (e) {
        // Skip points that fail to evaluate
        console.warn(`Failed to evaluate curve at ${parameterName}=${t}:`, e);
      }
    }
    
    // Add tangent for first point (copy from second)
    if (tangents.length >= 3) {
      tangents.unshift(tangents[0], tangents[1], tangents[2]);
    }
    
    return {
      points: new Float32Array(points),
      tangents: tangents.length > 0 ? new Float32Array(tangents) : undefined,
    };
  }
}
