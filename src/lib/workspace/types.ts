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
  mode: 'single' | 'split-h' | 'split-v' | 'grid' | 'tabs' | 'dock';
  
  // Which tools to show and their configuration
  slots: ToolSlot[];

  // Optional dock layout tree for Visual Studio style windowing
  dockLayout?: DockNode;
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
 * Docking layout tree
 */
export type DockNode = DockTabsNode | DockSplitNode;

export interface DockTabsNode {
  id: string;
  type: 'tabs';
  tabs: DockTab[];
  activeTabId?: string;
}

export interface DockSplitNode {
  id: string;
  type: 'split';
  direction: 'horizontal' | 'vertical';
  ratio: number; // 0 - 1 representing first pane ratio
  first: DockNode;
  second: DockNode;
}

export interface DockTab {
  id: string;
  toolId: string;
  title?: string;
}

export type DockDropPosition = 'left' | 'right' | 'top' | 'bottom' | 'center';

/**
 * Persisted workspace state
 * Saved to localStorage for session persistence
 */
export interface WorkspaceState {
  layoutId: string; // Currently active layout
  toolStates: Record<string, ToolState>; // Per-tool state
  dockLayout?: DockNode;
}

/**
 * State for an individual tool
 */
export interface ToolState {
  viewport?: any; // Tool-specific viewport (e.g., zoom level, pan position)
  config?: Record<string, any>; // Tool-specific configuration
}
