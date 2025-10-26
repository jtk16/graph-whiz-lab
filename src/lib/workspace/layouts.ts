import { WorkspaceLayout } from './types';

/**
 * Predefined workspace layouts
 * 
 * Users can quickly switch between these common configurations
 * Future: Allow custom layout saving
 */
export const WORKSPACE_LAYOUTS: WorkspaceLayout[] = [
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
  }
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
