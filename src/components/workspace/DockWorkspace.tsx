import { ReactNode, useMemo, useState } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { DockNode, DockTabsNode, DockDropPosition } from "@/lib/workspace/types";
import {
  addTabToPanel,
  closeTab,
  createDockTab,
  ensureDockTree,
  moveTab,
  setActiveTab,
  updateSplitRatio,
} from "@/lib/workspace/dockUtils";
import { ModuleSelector } from "./ModuleSelector";
import { toolRegistry } from "@/lib/tools";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

type DragState = { panelId: string; tabId: string };
type DropHint = { panelId: string; position: DockDropPosition };

interface DockWorkspaceProps {
  dockTree: DockNode;
  onDockTreeChange: (next: DockNode) => void;
  renderTool: (toolId: string, options: { instanceId: string; isActive: boolean }) => ReactNode;
}

export function DockWorkspace({ dockTree, onDockTreeChange, renderTool }: DockWorkspaceProps) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropHint, setDropHint] = useState<DropHint | null>(null);

  const tabTitleMap = useMemo(() => {
    if (!dockTree) {
      return {};
    }

    const counts: Record<string, number> = {};
    const titles: Record<string, string> = {};

    const traverse = (node: DockNode) => {
      if (node.type === "split") {
        traverse(node.first);
        traverse(node.second);
        return;
      }

      node.tabs.forEach(tab => {
        const tool = toolRegistry.get(tab.toolId);
        const baseTitle = tab.title ?? tool?.name ?? tab.toolId;
        const nextCount = (counts[tab.toolId] = (counts[tab.toolId] || 0) + 1);
        titles[tab.id] = nextCount > 1 ? `${baseTitle} #${nextCount}` : baseTitle;
      });
    };

    traverse(dockTree);
    return titles;
  }, [dockTree]);

  const handleTreeChange = (node: DockNode | null) => {
    onDockTreeChange(node ?? ensureDockTree());
  };

  const handleAddModule = (panelId: string, toolId: string) => {
    const tool = toolRegistry.get(toolId);
    const tab = createDockTab(toolId, tool?.name ?? toolId);
    const next = addTabToPanel(dockTree, panelId, tab);
    if (next) {
      handleTreeChange(next);
    }
  };

  const handleActivateTab = (panelId: string, tabId: string) => {
    const next = setActiveTab(dockTree, panelId, tabId);
    if (next) {
      handleTreeChange(next);
    }
  };

  const handleCloseTab = (panelId: string, tabId: string) => {
    const { root } = closeTab(dockTree, panelId, tabId);
    handleTreeChange(root ?? null);
  };

  const handleMoveTab = (targetPanelId: string, position: DockDropPosition) => {
    if (!dragState) return;
    const next = moveTab(dockTree, dragState.panelId, targetPanelId, dragState.tabId, position);
    handleTreeChange(next);
    setDragState(null);
    setDropHint(null);
  };

  const handleSplitResize = (splitId: string, sizes: number[]) => {
    if (sizes.length < 2) return;
    const total = sizes.reduce((acc, size) => acc + size, 0);
    const ratio = total === 0 ? 0.5 : sizes[0] / total;
    const next = updateSplitRatio(dockTree, splitId, ratio);
    if (next) {
      handleTreeChange(next);
    }
  };

  const renderNode = (node: DockNode): ReactNode => {
    if (node.type === "split") {
      return (
        <ResizablePanelGroup
          key={node.id}
          direction={node.direction === "horizontal" ? "horizontal" : "vertical"}
          className="h-full w-full"
          onLayout={sizes => handleSplitResize(node.id, sizes)}
        >
          <ResizablePanel defaultSize={node.ratio * 100}>
            <div className="h-full w-full">{renderNode(node.first)}</div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={(1 - node.ratio) * 100}>
            <div className="h-full w-full">{renderNode(node.second)}</div>
          </ResizablePanel>
        </ResizablePanelGroup>
      );
    }

    return (
      <DockTabsPanel
        key={node.id}
        panel={node}
        renderTool={renderTool}
        onAddModule={handleAddModule}
        onActivateTab={handleActivateTab}
        onCloseTab={handleCloseTab}
        onDrop={handleMoveTab}
        dragState={dragState}
        setDragState={setDragState}
        dropHint={dropHint}
        setDropHint={setDropHint}
        tabTitleMap={tabTitleMap}
      />
    );
  };

  return <div className="h-full w-full">{renderNode(dockTree)}</div>;
}

interface DockTabsPanelProps {
  panel: DockTabsNode;
  renderTool: (toolId: string, options: { instanceId: string; isActive: boolean }) => ReactNode;
  onAddModule: (panelId: string, toolId: string) => void;
  onActivateTab: (panelId: string, tabId: string) => void;
  onCloseTab: (panelId: string, tabId: string) => void;
  onDrop: (panelId: string, position: DockDropPosition) => void;
  dragState: DragState | null;
  setDragState: (state: DragState | null) => void;
  dropHint: DropHint | null;
  setDropHint: (hint: DropHint | null) => void;
  tabTitleMap: Record<string, string>;
}

const DockTabsPanel = ({
  panel,
  renderTool,
  onAddModule,
  onActivateTab,
  onCloseTab,
  onDrop,
  dragState,
  setDragState,
  dropHint,
  setDropHint,
  tabTitleMap,
}: DockTabsPanelProps) => {
  const tabs = panel.tabs;
  const activeTab = useMemo(() => {
    if (!tabs.length) return undefined;
    if (panel.activeTabId) {
      return tabs.find(tab => tab.id === panel.activeTabId) ?? tabs[0];
    }
    return tabs[0];
  }, [tabs, panel.activeTabId]);

  const handleDragStart = (tabId: string) => {
    setDragState({ panelId: panel.id, tabId });
  };

  const handleDragEnd = () => {
    setDragState(null);
    setDropHint(null);
  };

  const dropZones: Array<{ position: DockDropPosition; className: string }> = [
    { position: "left", className: "inset-y-0 left-0 w-1/5" },
    { position: "right", className: "inset-y-0 right-0 w-1/5" },
    { position: "top", className: "inset-x-0 top-0 h-1/4" },
    { position: "bottom", className: "inset-x-0 bottom-0 h-1/4" },
    { position: "center", className: "inset-2 rounded-md" },
  ];

  const plusTrigger = (
    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm" title="Add module">
      <Plus className="h-3 w-3" />
    </Button>
  );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden border border-border bg-background/60">
      <div className="flex items-center border-b border-border bg-muted/40 px-2">
        <div className="flex flex-1 items-center gap-1 overflow-x-auto py-1">
          {tabs.map(tab => {
            const tool = toolRegistry.get(tab.toolId);
            const isActive = activeTab?.id === tab.id;
            const displayTitle = tabTitleMap[tab.id] ?? tab.title ?? tool?.name ?? tab.toolId;
            return (
              <button
                key={tab.id}
                className={cn(
                  "group inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors",
                  isActive ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => onActivateTab(panel.id, tab.id)}
                draggable
                onDragStart={ev => {
                  ev.dataTransfer.setData("text/plain", tab.id);
                  ev.dataTransfer.effectAllowed = "move";
                  handleDragStart(tab.id);
                }}
                onDragEnd={handleDragEnd}
              >
                <span className="max-w-[120px] truncate">{displayTitle}</span>
                <X
                  className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60"
                  onClick={ev => {
                    ev.stopPropagation();
                    onCloseTab(panel.id, tab.id);
                  }}
                />
              </button>
            );
          })}
        </div>
        <ModuleSelector align="end" onSelect={toolId => onAddModule(panel.id, toolId)} trigger={plusTrigger} showLabel={false} />
      </div>

      <div className="relative flex-1 bg-canvas-bg/80">
        {activeTab ? (
          <div className="h-full w-full">{renderTool(activeTab.toolId, { instanceId: activeTab.id, isActive: true })}</div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <p>No modules in this panel.</p>
            <ModuleSelector label="Add a module" onSelect={toolId => onAddModule(panel.id, toolId)} />
          </div>
        )}

        {dragState && (
          <div className="pointer-events-none absolute inset-0 z-10">
            {dropZones.map(zone => (
              <div
                key={zone.position}
                className={cn(
                  "absolute border-2 border-dashed border-transparent transition-colors pointer-events-auto",
                  zone.className,
                  dropHint?.panelId === panel.id && dropHint.position === zone.position
                    ? "border-primary/70 bg-primary/10"
                    : "border-transparent"
                )}
                onDragOver={event => {
                  event.preventDefault();
                  if (dragState.panelId === panel.id && zone.position === "center") return;
                  setDropHint({ panelId: panel.id, position: zone.position });
                }}
                onDragLeave={event => {
                  event.preventDefault();
                  if (dropHint?.panelId === panel.id && dropHint.position === zone.position) {
                    setDropHint(null);
                  }
                }}
                onDrop={event => {
                  event.preventDefault();
                  onDrop(panel.id, zone.position);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
