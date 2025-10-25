import { ASTNode } from '@/lib/parser';
import { evaluate } from '@/lib/runtime/evaluator';
import { DefinitionContext } from '@/lib/definitionContext';
import { MathSpace } from '../spaces/types';
import { isNumber } from '@/lib/runtime/value';
import { EDGE_TABLE, TRI_TABLE, EDGE_CONNECTIONS, CUBE_CORNERS } from '../marchingCubesLUT';

/**
 * Abstract evaluator for 3D surfaces
 * Works with any MathSpace to generate surface data
 */
export interface SurfaceData {
  vertices: Float32Array;  // [x, y, z, x, y, z, ...]
  normals: Float32Array;   // [nx, ny, nz, nx, ny, nz, ...]
  colors?: Float32Array;   // [r, g, b, r, g, b, ...] (optional for domain coloring)
  indices: Uint32Array;    // Triangle indices
}

export interface EvaluationOptions {
  resolution: number;      // Grid resolution (e.g., 50 = 50x50 grid)
  bounds: Record<string, { min: number; max: number }>;
  colorMode?: 'height' | 'gradient' | 'domain' | 'custom' | 'none';
}

export interface ImplicitSurfaceOptions {
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number; zMin: number; zMax: number };
  resolution: number;
  isoValue?: number; // Default 0
}

export class SurfaceEvaluator {
  constructor(
    private ast: ASTNode,
    private context: DefinitionContext,
    private space: MathSpace
  ) {}
  
  /**
   * Evaluate surface: z = f(x, y) or similar
   * Works in any coordinate system defined by the space
   */
  evaluateSurface(options: EvaluationOptions): SurfaceData {
    const { resolution, bounds } = options;
    const dims = this.space.dimensions;
    
    // For a 2-input surface (e.g., z = f(x,y) or mag = f(re,im))
    const dim1 = dims[0];
    const dim2 = dims[1];
    
    const vertices: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];
    
    const range1 = bounds[dim1.name] || this.space.defaultBounds[dim1.name];
    const range2 = bounds[dim2.name] || this.space.defaultBounds[dim2.name];
    
    const step1 = (range1.max - range1.min) / resolution;
    const step2 = (range2.max - range2.min) / resolution;
    
    let minZ = Infinity;
    let maxZ = -Infinity;
    
    // Generate grid of points
    for (let i = 0; i <= resolution; i++) {
      for (let j = 0; j <= resolution; j++) {
        const coord1 = range1.min + i * step1;
        const coord2 = range2.min + j * step2;
        
        // Evaluate function in the space's coordinates
        const coords: Record<string, number> = {
          [dim1.name]: coord1,
          [dim2.name]: coord2
        };
        
        try {
          // Log first evaluation for debugging
          if (i === 0 && j === 0) {
            console.log('SurfaceEvaluator: First point evaluation', {
              coords,
              ast: this.ast.type
            });
          }
          
          // Evaluate the function
          const result = evaluate(this.ast, coords, this.context);
          
          // Log first result
          if (i === 0 && j === 0) {
            console.log('SurfaceEvaluator: First point result:', {
              kind: result.kind,
              value: result.kind === 'number' ? result.value : 'N/A'
            });
          }
          
          // Get the output dimension value
          let outputValue: number;
          if (result.kind === 'number') {
            outputValue = result.value;
          } else if (result.kind === 'complex') {
            // For complex results, use magnitude
            outputValue = Math.sqrt(result.real ** 2 + result.imag ** 2);
          } else {
            outputValue = 0;
          }
          
          // Track min/max for color scaling
          if (isFinite(outputValue)) {
            minZ = Math.min(minZ, outputValue);
            maxZ = Math.max(maxZ, outputValue);
          }
          
          // Set the third dimension
          coords[dims[2].name] = outputValue;
          
          // Convert to Cartesian for rendering
          const cartesian = this.space.toCartesian(coords);
          
          vertices.push(cartesian.x, cartesian.y, cartesian.z);
          
          // Store result for later color computation
          if (options.colorMode === 'domain' && result.kind === 'complex') {
            const hue = (Math.atan2(result.imag, result.real) + Math.PI) / (2 * Math.PI);
            const rgb = hslToRgb(hue, 1, 0.5);
            colors.push(rgb.r, rgb.g, rgb.b);
          } else {
            // Placeholder, will normalize after we know min/max
            colors.push(outputValue, 0, 0);
          }
        } catch (e) {
          // Handle undefined points (e.g., division by zero)
          vertices.push(0, 0, 0);
          colors.push(0, 0, 0);
        }
      }
    }
    
    // Normalize colors for height mode
    if (options.colorMode === 'height') {
      for (let i = 0; i < colors.length; i += 3) {
        const value = colors[i];
        const normalized = maxZ > minZ ? (value - minZ) / (maxZ - minZ) : 0.5;
        colors[i] = normalized;
        colors[i + 1] = 0.5;
        colors[i + 2] = 1 - normalized;
      }
    } else if (options.colorMode === 'none') {
      // Clear colors array if we don't want vertex colors
      colors.length = 0;
    }
    
    // Generate triangle indices
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const idx = i * (resolution + 1) + j;
        const idx2 = idx + 1;
        const idx3 = idx + resolution + 1;
        const idx4 = idx3 + 1;
        
        // Two triangles per quad
        indices.push(idx, idx2, idx3);
        indices.push(idx2, idx4, idx3);
      }
    }
    
    // Compute normals
    const normalsArray = this.computeNormals(vertices, indices);
    
    const surfaceData = {
      vertices: new Float32Array(vertices),
      normals: new Float32Array(normalsArray),
      colors: colors.length > 0 ? new Float32Array(colors) : undefined,
      indices: new Uint32Array(indices),
    };
    
    console.log('SurfaceEvaluator: Generated surface data', {
      vertexCount: surfaceData.vertices.length / 3,
      indexCount: surfaceData.indices.length,
      hasColors: !!surfaceData.colors
    });
    
    return surfaceData;
  }
  
  private computeNormals(vertices: number[], indices: number[]): number[] {
    const normals = new Array(vertices.length).fill(0);
    
    // For each triangle, compute face normal and accumulate
    for (let i = 0; i < indices.length; i += 3) {
      const i1 = indices[i] * 3;
      const i2 = indices[i + 1] * 3;
      const i3 = indices[i + 2] * 3;
      
      const v1 = [vertices[i1], vertices[i1 + 1], vertices[i1 + 2]];
      const v2 = [vertices[i2], vertices[i2 + 1], vertices[i2 + 2]];
      const v3 = [vertices[i3], vertices[i3 + 1], vertices[i3 + 2]];
      
      // Cross product for face normal
      const edge1 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
      const edge2 = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];
      
      const normal = [
        edge1[1] * edge2[2] - edge1[2] * edge2[1],
        edge1[2] * edge2[0] - edge1[0] * edge2[2],
        edge1[0] * edge2[1] - edge1[1] * edge2[0]
      ];
      
      // Accumulate normals
      normals[i1] += normal[0];
      normals[i1 + 1] += normal[1];
      normals[i1 + 2] += normal[2];
      
      normals[i2] += normal[0];
      normals[i2 + 1] += normal[1];
      normals[i2 + 2] += normal[2];
      
      normals[i3] += normal[0];
      normals[i3 + 1] += normal[1];
      normals[i3 + 2] += normal[2];
    }
    
    // Normalize
    for (let i = 0; i < normals.length; i += 3) {
      const len = Math.sqrt(
        normals[i] ** 2 + normals[i + 1] ** 2 + normals[i + 2] ** 2
      );
      if (len > 0) {
        normals[i] /= len;
        normals[i + 1] /= len;
        normals[i + 2] /= len;
      }
    }
    
    return normals;
  }
  
  /**
   * Evaluate implicit 3D surface using Marching Cubes algorithm
   * For expressions like: x^2 + y^2 + z^2 = 1
   */
  evaluateImplicitSurface(options: ImplicitSurfaceOptions): SurfaceData {
    console.log('evaluateImplicitSurface called', {
      bounds: options.bounds,
      resolution: options.resolution,
      isoValue: options.isoValue
    });
    
    const implicitFn = this.createImplicit3DFunction();
    
    // Test implicit function with known values
    console.log('Testing implicit function:', {
      'f(0,0,0)': implicitFn(0, 0, 0),
      'f(1,0,0)': implicitFn(1, 0, 0),
      'f(0,1,0)': implicitFn(0, 1, 0),
      'f(0,0,1)': implicitFn(0, 0, 1)
    });
    
    const { xMin, xMax, yMin, yMax, zMin, zMax } = options.bounds;
    const resolution = options.resolution;
    const isoValue = options.isoValue ?? 0;
    
    const stepX = (xMax - xMin) / resolution;
    const stepY = (yMax - yMin) / resolution;
    const stepZ = (zMax - zMin) / resolution;
    
    const vertices: number[] = [];
    const indices: number[] = [];
    
    // Edge vertex cache: key = "i,j,k,edge", value = vertex index
    // This ensures adjacent cubes share vertices (prevents cracks)
    const edgeVertexCache = new Map<string, number>();
    
    // Helper: Interpolate vertex position along an edge where the surface crosses
    const interpolateVertex = (
      x1: number, y1: number, z1: number, v1: number,
      x2: number, y2: number, z2: number, v2: number
    ): [number, number, number] => {
      const t = Math.abs(v1 - v2) > 1e-6 ? (isoValue - v1) / (v2 - v1) : 0.5;
      return [
        x1 + t * (x2 - x1),
        y1 + t * (y2 - y1),
        z1 + t * (z2 - z1)
      ];
    };
    
    // Process each cube in the grid
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        for (let k = 0; k < resolution; k++) {
          const x = xMin + i * stepX;
          const y = yMin + j * stepY;
          const z = zMin + k * stepZ;
          
          // Sample function at all 8 cube corners
          const cornerValues = CUBE_CORNERS.map(([dx, dy, dz]) =>
            implicitFn(x + dx * stepX, y + dy * stepY, z + dz * stepZ)
          );
          
          // Build cube index (which corners are inside the isosurface)
          let cubeIndex = 0;
          for (let ci = 0; ci < 8; ci++) {
            if (isFinite(cornerValues[ci]) && cornerValues[ci] < isoValue) {
              cubeIndex |= (1 << ci);
            }
          }
          
          // Skip if cube is completely inside or outside
          if (cubeIndex === 0 || cubeIndex === 255) continue;
          
          // Get edge flags from lookup table
          const edgeFlags = EDGE_TABLE[cubeIndex];
          
          // For each edge that has a vertex, interpolate its position
          const edgeVertices: number[] = new Array(12);
          for (let e = 0; e < 12; e++) {
            if (edgeFlags & (1 << e)) {
              const cacheKey = `${i},${j},${k},${e}`;
              
              let vertexIndex = edgeVertexCache.get(cacheKey);
              if (vertexIndex === undefined) {
                // Get the two corners this edge connects
                const [c1, c2] = EDGE_CONNECTIONS[e];
                const v1 = cornerValues[c1];
                const v2 = cornerValues[c2];
                
                // Get corner positions in world space
                const [dx1, dy1, dz1] = CUBE_CORNERS[c1];
                const [dx2, dy2, dz2] = CUBE_CORNERS[c2];
                const x1 = x + dx1 * stepX;
                const y1 = y + dy1 * stepY;
                const z1 = z + dz1 * stepZ;
                const x2 = x + dx2 * stepX;
                const y2 = y + dy2 * stepY;
                const z2 = z + dz2 * stepZ;
                
                // Interpolate vertex position
                const [vx, vy, vz] = interpolateVertex(x1, y1, z1, v1, x2, y2, z2, v2);
                
                vertexIndex = vertices.length / 3;
                vertices.push(vx, vy, vz);
                edgeVertexCache.set(cacheKey, vertexIndex);
              }
              
              edgeVertices[e] = vertexIndex;
            }
          }
          
          // Build triangles from lookup table
          const triConfig = TRI_TABLE[cubeIndex];
          for (let t = 0; t < triConfig.length; t += 3) {
            if (triConfig[t] === undefined) break; // end of triangle list
            indices.push(
              edgeVertices[triConfig[t]],
              edgeVertices[triConfig[t + 1]],
              edgeVertices[triConfig[t + 2]]
            );
          }
        }
      }
    }
    
    // Compute normals
    const normalsArray = this.computeNormals(vertices, indices);
    
    console.log('Marching cubes complete', {
      totalCubes: resolution ** 3,
      totalVertices: vertices.length / 3,
      totalTriangles: indices.length / 3,
      cacheSize: edgeVertexCache.size
    });
    
    const surfaceData = {
      vertices: new Float32Array(vertices),
      normals: new Float32Array(normalsArray),
      indices: new Uint32Array(indices),
    };
    
    console.log('SurfaceEvaluator (implicit): Generated surface data', {
      vertexCount: surfaceData.vertices.length / 3,
      indexCount: surfaceData.indices.length
    });
    
    return surfaceData;
  }
  
  private createImplicit3DFunction(): (x: number, y: number, z: number) => number {
    if (this.ast.type === 'binary' && this.ast.operator === '=') {
      return (x: number, y: number, z: number) => {
        try {
          const lhs = this.evaluateNode(this.ast.left!, { x, y, z });
          const rhs = this.evaluateNode(this.ast.right!, { x, y, z });
          if (Number.isFinite(lhs) && Number.isFinite(rhs)) {
            return lhs - rhs;
          }
          if (Number.isFinite(lhs)) return lhs;
          if (Number.isFinite(rhs)) return rhs;
          return NaN;
        } catch (e) {
          return NaN;
        }
      };
    }

    return (x: number, y: number, z: number) => {
      try {
        return this.evaluateNode(this.ast, { x, y, z });
      } catch (e) {
        return NaN;
      }
    };
  }
  
  private evaluateNode(node: ASTNode, vars: Record<string, number>): number {
    const result = evaluate(node, vars, this.context);
    if (result.kind === 'number') {
      return result.value;
    }
    return NaN;
  }
}

function hslToRgb(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h * 6) % 2 - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (h < 1/6) { r = c; g = x; b = 0; }
  else if (h < 2/6) { r = x; g = c; b = 0; }
  else if (h < 3/6) { r = 0; g = c; b = x; }
  else if (h < 4/6) { r = 0; g = x; b = c; }
  else if (h < 5/6) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  
  return {
    r: r + m,
    g: g + m,
    b: b + m
  };
}
