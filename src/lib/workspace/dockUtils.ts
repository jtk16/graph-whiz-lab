import { DockNode, DockTabsNode, DockTab, DockDropPosition } from './types';

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `dock-${Math.random().toString(36).slice(2, 10)}`;

export function createDockTab(toolId: string, title?: string): DockTab {
  return {
    id: createId(),
    toolId,
    title,
  };
}

export function cloneDockNode(node: DockNode): DockNode {
  if (node.type === 'tabs') {
    return {
      ...node,
      tabs: node.tabs.map(tab => ({ ...tab })),
    };
  }
  return {
    ...node,
    first: cloneDockNode(node.first),
    second: cloneDockNode(node.second),
  };
}

type PanelUpdater = (panel: DockTabsNode) => DockNode | null;

function updatePanel(node: DockNode, panelId: string, updater: PanelUpdater): DockNode | null {
  if (node.type === 'tabs') {
    if (node.id !== panelId) {
      return node;
    }
    return updater(node);
  }

  const updatedFirst = updatePanel(node.first, panelId, updater);
  const updatedSecond = updatePanel(node.second, panelId, updater);

  if (!updatedFirst && !updatedSecond) {
    return null;
  }

  if (!updatedFirst) {
    return updatedSecond;
  }

  if (!updatedSecond) {
    return updatedFirst;
  }

  if (updatedFirst === node.first && updatedSecond === node.second) {
    return node;
  }

  return {
    ...node,
    first: updatedFirst,
    second: updatedSecond,
  };
}

export function setActiveTab(node: DockNode, panelId: string, tabId: string): DockNode | null {
  return updatePanel(node, panelId, panel => {
    if (!panel.tabs.some(tab => tab.id === tabId)) {
      return panel;
    }
    return {
      ...panel,
      activeTabId: tabId,
    };
  });
}

export function addTabToPanel(node: DockNode, panelId: string, tab: DockTab): DockNode | null {
  return updatePanel(node, panelId, panel => ({
    ...panel,
    tabs: [...panel.tabs, tab],
    activeTabId: tab.id,
  }));
}

export function closeTab(node: DockNode, panelId: string, tabId: string): { root: DockNode | null; removedTab?: DockTab } {
  let removed: DockTab | undefined;
  const updated = updatePanel(node, panelId, panel => {
    const idx = panel.tabs.findIndex(tab => tab.id === tabId);
    if (idx === -1) {
      return panel;
    }
    removed = panel.tabs[idx];
    const nextTabs = [...panel.tabs.slice(0, idx), ...panel.tabs.slice(idx + 1)];
    if (!nextTabs.length) {
      return null;
    }
    const nextActive =
      panel.activeTabId === tabId
        ? nextTabs[0].id
        : panel.activeTabId && nextTabs.some(tab => tab.id === panel.activeTabId)
          ? panel.activeTabId
          : nextTabs[0].id;
    return {
      ...panel,
      tabs: nextTabs,
      activeTabId: nextActive,
    };
  });
  return { root: updated ?? null, removedTab: removed };
}

export function detachTab(node: DockNode, panelId: string, tabId: string): { root: DockNode | null; tab?: DockTab } {
  return closeTab(node, panelId, tabId);
}

function insertTab(node: DockNode | null, panelId: string, tab: DockTab, index?: number): DockNode | null {
  if (!node) return null;
  return updatePanel(node, panelId, panel => {
    const tabs = [...panel.tabs];
    const insertAt = typeof index === 'number' ? Math.min(Math.max(index, 0), tabs.length) : tabs.length;
    tabs.splice(insertAt, 0, tab);
    return {
      ...panel,
      tabs,
      activeTabId: tab.id,
    };
  });
}

function replacePanelWith(node: DockNode | null, panelId: string, replacement: (panel: DockTabsNode) => DockNode): DockNode | null {
  if (!node) return null;
  return updatePanel(node, panelId, panel => replacement(panel));
}

export function splitPanelWithTab(
  node: DockNode | null,
  panelId: string,
  tab: DockTab,
  position: Exclude<DockDropPosition, 'center'>
): DockNode | null {
  if (!node) return null;
  return replacePanelWith(node, panelId, panel => {
    const newPanel: DockTabsNode = {
      id: createId(),
      type: 'tabs',
      tabs: [tab],
      activeTabId: tab.id,
    };

    const basePanel: DockTabsNode = {
      ...panel,
      activeTabId: panel.activeTabId && panel.tabs.some(t => t.id === panel.activeTabId) ? panel.activeTabId : panel.tabs[0]?.id,
    };

    const isHorizontal = position === 'left' || position === 'right';
    const first =
      position === 'left' || position === 'top'
        ? newPanel
        : (basePanel as DockNode);
    const second =
      position === 'left' || position === 'top'
        ? (basePanel as DockNode)
        : newPanel;

    return {
      id: createId(),
      type: 'split',
      direction: isHorizontal ? 'horizontal' : 'vertical',
      ratio: 0.5,
      first,
      second,
    };
  });
}

export function moveTab(
  node: DockNode | null,
  sourcePanelId: string,
  targetPanelId: string,
  tabId: string,
  position: DockDropPosition
): DockNode | null {
  if (!node) return node;
  if (sourcePanelId === targetPanelId && position === 'center') {
    return node;
  }

  const { root: afterDetach, tab } = detachTab(node, sourcePanelId, tabId);
  if (!tab) {
    return node;
  }
  const removedTab = tab;

  let workingRoot = afterDetach;

  if (!workingRoot) {
    // If tree became empty, create a new panel with the moved tab
    return {
      id: createId(),
      type: 'tabs',
      tabs: [removedTab],
      activeTabId: removedTab.id,
    };
  }

  if (position === 'center') {
    const inserted = insertTab(workingRoot, targetPanelId, removedTab);
    return inserted ?? workingRoot;
  }

  const splitted = splitPanelWithTab(workingRoot, targetPanelId, removedTab, position as Exclude<DockDropPosition, 'center'>);
  return splitted ?? workingRoot;
}

export function ensureDockTree(layout?: DockNode): DockNode {
  if (layout) {
    return cloneDockNode(layout);
  }
  return {
    id: createId(),
    type: 'tabs',
    tabs: [],
  };
}

export function updateSplitRatio(node: DockNode | null, splitId: string, ratio: number): DockNode | null {
  if (!node) return null;
  if (node.type === 'split') {
    if (node.id === splitId) {
      return {
        ...node,
        ratio,
      };
    }
    const first = updateSplitRatio(node.first, splitId, ratio);
    const second = updateSplitRatio(node.second, splitId, ratio);
    if (!first || !second) {
      return first ?? second ?? null;
    }
    if (first === node.first && second === node.second) {
      return node;
    }
    return {
      ...node,
      first,
      second,
    };
  }
  return node;
}
