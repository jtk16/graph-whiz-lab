/**
 * Abstract representation of a mathematical space
 * Defines how to evaluate functions in different coordinate systems
 */
export interface MathSpace {
  id: string;
  name: string;
  description: string;
  
  // Coordinate system definition
  dimensions: CoordinateDimension[];
  
  // Convert from this space to Cartesian 3D for rendering
  toCartesian: (coords: Record<string, number>) => { x: number; y: number; z: number };
  
  // Convert from Cartesian back to this space (for interaction)
  fromCartesian: (point: { x: number; y: number; z: number }) => Record<string, number>;
  
  // Default bounds for each dimension
  defaultBounds: Record<string, { min: number; max: number }>;
  
  // Grid generation for this space
  generateGrid?: (resolution: number) => GridData;
}

export interface CoordinateDimension {
  name: string;        // e.g., 'x', 'r', 'θ', 're', 'im'
  symbol: string;      // Display symbol
  unit?: string;       // 'rad', 'deg', etc.
  periodic?: boolean;  // Is this dimension periodic (angles)
}

export interface GridData {
  lines: Array<{ points: Array<{ x: number; y: number; z: number }> }>;
  labels?: Array<{ position: { x: number; y: number; z: number }; text: string }>;
}
