import { MathType } from '../types';
import { ToolkitExpression } from '../toolkits/types';

/**
 * Props passed to every visualization tool component
 */
export interface ToolProps {
  expressions: Array<{
    id: string;
    latex: string;
    normalized: string;
    color: string;
  }>;
  toolkitDefinitions: ToolkitExpression[];
  viewport?: any; // Tool-specific viewport state
  onViewportChange?: (viewport: any) => void;
  isActive: boolean; // For optimization - tool can skip updates when inactive
  toolConfig?: Record<string, any>; // Tool-specific configuration
}

/**
 * Props for tool control components (zoom, settings, etc.)
 */
export interface ToolControlsProps {
  toolConfig: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
}

/**
 * Props for tool settings panels
 */
export interface ToolSettingsProps {
  toolConfig: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
}

/**
 * Definition of a visualization tool
 * 
 * Tools are modular components that can visualize mathematical expressions
 * in different ways (2D graph, 3D view, table, symbolic, etc.)
 */
export interface VisualizationTool {
  id: string; // Unique identifier (e.g., 'graph-2d', 'graph-3d')
  name: string; // Display name
  icon: string; // Lucide icon name
  description: string; // Short description for tooltips/UI
  category: 'graph' | '3d' | 'table' | 'symbolic' | 'geometric'; // Tool category
  
  // What types of expressions can this tool visualize?
  supportedTypes: MathType[];
  
  // Component to render the tool
  component: React.ComponentType<ToolProps>;
  
  // Optional: Custom controls for this tool (zoom, pan, etc.)
  controlsComponent?: React.ComponentType<ToolControlsProps>;
  
  // Optional: Settings panel for this tool
  settingsComponent?: React.ComponentType<ToolSettingsProps>;
}
