import { VisualizationTool } from '../types';
import { Graph3DTool } from '@/components/tools/Graph3DTool';
import { MathType } from '@/lib/types';
import { toolRegistry } from '../registry';

/**
 * 3D Visualization Tool (Future Implementation)
 * 
 * Will support:
 * - Surface plots: z = f(x,y)
 * - Parametric curves and surfaces
 * - 3D point clouds
 * - Vector fields
 * - Contour plots
 */
export const graph3DTool: VisualizationTool = {
  id: 'graph-3d',
  name: '3D Graph',
  icon: 'Box',
  description: 'Visualize functions in 3D space (coming soon)',
  category: '3d',
  supportedTypes: [
    MathType.Function,
    MathType.Point,
    MathType.List
  ],
  component: Graph3DTool,
};

// Auto-register on import
toolRegistry.register(graph3DTool);
