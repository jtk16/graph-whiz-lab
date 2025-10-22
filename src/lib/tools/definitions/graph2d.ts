import { VisualizationTool } from '../types';
import { Graph2DTool } from '@/components/tools/Graph2DTool';
import { MathType } from '@/lib/types';
import { toolRegistry } from '../registry';

/**
 * 2D Graphing Calculator Tool
 * 
 * Visualizes mathematical functions and expressions on a 2D Cartesian plane.
 * Supports:
 * - Functions of x (e.g., sin(x), x^2)
 * - Points and point lists
 * - Numeric constants
 */
export const graph2DTool: VisualizationTool = {
  id: 'graph-2d',
  name: '2D Graph',
  icon: 'LineChart',
  description: 'Visualize functions and expressions in 2D',
  category: 'graph',
  supportedTypes: [
    MathType.Function,
    MathType.Number,
    MathType.Point,
    MathType.List
  ],
  component: Graph2DTool,
};

// Auto-register on import
toolRegistry.register(graph2DTool);
