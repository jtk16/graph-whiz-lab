/**
 * Layout configuration for the workspace
 * Defines how tools are arranged and displayed
 */
export interface WorkspaceLayout {
  id: string; // Unique identifier
  name: string; // Display name
  icon: string; // Lucide icon name
  description: string; // Short description
  
  // How to arrange tools
  mode: 'single' | 'split-h' | 'split-v' | 'grid' | 'tabs';
  
  // Which tools to show and their configuration
  slots: ToolSlot[];
}

/**
 * Configuration for a single tool slot in a layout
 */
export interface ToolSlot {
  toolId: string; // Which tool to display
  size?: number; // For splits (percentage or flex value)
  config?: Record<string, any>; // Tool-specific configuration
  viewport?: any; // Tool-specific viewport state
}

/**
 * Persisted workspace state
 * Saved to localStorage for session persistence
 */
export interface WorkspaceState {
  layoutId: string; // Currently active layout
  toolStates: Record<string, ToolState>; // Per-tool state
}

/**
 * State for an individual tool
 */
export interface ToolState {
  viewport?: any; // Tool-specific viewport (e.g., zoom level, pan position)
  config?: Record<string, any>; // Tool-specific configuration
}
