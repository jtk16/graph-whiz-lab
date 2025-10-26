import { WorkspaceLayout } from './types';

/**
 * Predefined workspace layouts
 * 
 * Users can quickly switch between these common configurations
 * Future: Allow custom layout saving
 */
export const WORKSPACE_LAYOUTS: WorkspaceLayout[] = [
  {
    id: 'single-2d',
    name: 'Single 2D Graph',
    icon: 'LineChart',
    description: 'Full-screen 2D graphing calculator',
    mode: 'single',
    slots: [{ toolId: 'graph-2d' }]
  },
  {
    id: 'single-3d',
    name: 'Single 3D View',
    icon: 'Box',
    description: 'Full-screen 3D visualization',
    mode: 'single',
    slots: [{ toolId: 'graph-3d' }]
  },
  {
    id: 'split-2d-3d',
    name: '2D + 3D Split',
    icon: 'Columns2',
    description: 'Side-by-side 2D and 3D views',
    mode: 'split-h',
    slots: [
      { toolId: 'graph-2d', size: 50 },
      { toolId: 'graph-3d', size: 50 }
    ]
  },
  {
    id: 'dock-visual',
    name: 'Docked Workspace',
    icon: 'PanelsTopLeft',
    description: 'Visual Studio style tabs with drag-and-drop docking',
    mode: 'dock',
    slots: [],
    dockLayout: {
      id: 'dock-panel-root',
      type: 'tabs',
      activeTabId: 'dock-tab-graph-2d',
      tabs: [
        { id: 'dock-tab-graph-2d', toolId: 'graph-2d', title: '2D Graph' },
        { id: 'dock-tab-graph-3d', toolId: 'graph-3d', title: '3D Graph' }
      ]
    }
  },
  // Future layouts can be added here:
  // - Multi-view grid (2x2)
  // - Tabbed interface
  // - Vertical splits
];

/**
 * Get a layout by its ID
 */
export function getLayoutById(id: string): WorkspaceLayout | undefined {
  return WORKSPACE_LAYOUTS.find(layout => layout.id === id);
}

/**
 * Get the default layout (used on first load)
 */
export function getDefaultLayout(): WorkspaceLayout {
  return WORKSPACE_LAYOUTS[0]; // single-2d
}
