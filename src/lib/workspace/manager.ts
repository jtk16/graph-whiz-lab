import { WorkspaceState, ToolState, DockNode } from './types';
import { getDefaultLayout } from './layouts';

const STORAGE_KEY = 'workspace-state';

/**
 * Create a default workspace state
 */
const cloneDockLayout = (layout?: DockNode): DockNode | undefined => {
  if (!layout) return undefined;
  if (typeof structuredClone === 'function') {
    return structuredClone(layout);
  }
  return JSON.parse(JSON.stringify(layout));
};

export function createDefaultState(): WorkspaceState {
  const defaultLayout = getDefaultLayout();
  return {
    layoutId: defaultLayout.id,
    toolStates: {},
    dockLayout: cloneDockLayout(defaultLayout.dockLayout),
  };
}

/**
 * Save workspace state to localStorage
 */
export function saveWorkspaceState(state: WorkspaceState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save workspace state:', error);
  }
}

/**
 * Load workspace state from localStorage
 */
export function loadWorkspaceState(): WorkspaceState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: WorkspaceState = JSON.parse(saved);
      if (!parsed.dockLayout) {
        parsed.dockLayout = cloneDockLayout(getDefaultLayout().dockLayout);
      }
      return parsed;
    }
  } catch (error) {
    console.error('Failed to load workspace state:', error);
  }
  return createDefaultState();
}

/**
 * Update tool state within workspace state
 */
export function updateToolState(
  workspaceState: WorkspaceState,
  toolId: string,
  toolState: Partial<ToolState>
): WorkspaceState {
  return {
    ...workspaceState,
    toolStates: {
      ...workspaceState.toolStates,
      [toolId]: {
        ...workspaceState.toolStates[toolId],
        ...toolState
      }
    }
  };
}

/**
 * Get tool state from workspace state
 */
export function getToolState(
  workspaceState: WorkspaceState,
  toolId: string
): ToolState {
  return workspaceState.toolStates[toolId] || {};
}
