import { Fragment, useEffect, useMemo, useState } from "react";
import { WorkspaceLayout, ToolSlot, DockNode } from "@/lib/workspace/types";
import { toolRegistry } from "@/lib/tools";
import { ToolContainer } from "./ToolContainer";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ToolkitExpression } from "@/lib/toolkits/types";
import { Graph2DControls } from "@/components/tools/Graph2DControls";
import { DockWorkspace } from "./DockWorkspace";
import { ensureDockTree } from "@/lib/workspace/dockUtils";
import { ToolProps } from "@/lib/tools/types";
import { expressionEngine } from "@/lib/expression";

interface WorkspaceProps {
  expressions: ToolProps["expressions"];
  toolkitDefinitions: ToolkitExpression[];
  layout: WorkspaceLayout;
  onLayoutChange: (layout: WorkspaceLayout) => void;
  toolStates: Record<string, any>;
  onToolStateChange: (toolId: string, state: any) => void;
}

interface RenderOptions {
  toolId: string;
  instanceId: string;
  viewportOverride?: any;
  configOverride?: Record<string, any>;
  size?: number;
  isActive: boolean;
}

export function Workspace({
  expressions,
  toolkitDefinitions,
  layout,
  onLayoutChange,
  toolStates,
  onToolStateChange,
}: WorkspaceProps) {
  const preparedExpressions = useMemo(() => {
    return expressions.map(expr => {
      const source = expr.normalized?.trim() ? expr.normalized : expr.latex;
      const sanitized = source ? expressionEngine.normalize(source) : "";
      return {
        ...expr,
        normalized: sanitized,
      };
    });
  }, [expressions]);

  const [dockTree, setDockTree] = useState<DockNode | null>(() =>
    layout.mode === "dock" ? ensureDockTree(layout.dockLayout) : null
  );

  useEffect(() => {
    if (layout.mode === "dock") {
      setDockTree(ensureDockTree(layout.dockLayout));
    } else {
      setDockTree(null);
    }
  }, [layout.id, layout.mode, layout.dockLayout]);

  const renderToolInstance = ({
    toolId,
    instanceId,
    viewportOverride,
    configOverride,
    size,
    isActive,
  }: RenderOptions) => {
    const tool = toolRegistry.get(toolId);
    if (!tool) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Unknown tool: {toolId}
        </div>
      );
    }

    const ToolComponent = tool.component;
    const ControlsComponent = tool.controlsComponent;
    const toolState = toolStates[toolId] || {};
    const viewport = viewportOverride ?? toolState.viewport;
    const config = configOverride ?? toolState.config;

    const handleViewportChange = (nextViewport: any) => {
      onToolStateChange(toolId, { ...toolState, viewport: nextViewport });
    };

    const handleConfigChange = (nextConfig: any) => {
      onToolStateChange(toolId, { ...toolState, config: nextConfig });
    };

    const expressionsForTool = preparedExpressions.filter(expr => {
      const allowed = expr.allowedModules;
      if (allowed == null) {
        return true;
      }
      if (allowed.length === 0) {
        return false;
      }
      return allowed.includes(instanceId);
    });

    return (
      <ToolContainer key={instanceId} tool={tool} size={size}>
        <div className="relative h-full w-full">
          <ToolComponent
            expressions={expressionsForTool}
            toolkitDefinitions={toolkitDefinitions}
            viewport={viewport}
            onViewportChange={handleViewportChange}
            isActive={isActive}
            toolConfig={config}
            onConfigChange={handleConfigChange}
          />

          {ControlsComponent && isActive && viewport && (
            <ControlsComponent toolConfig={config || {}} onConfigChange={handleConfigChange} />
          )}

          {tool.id === "graph-2d" && isActive && viewport && (
            <Graph2DControls viewport={viewport} onViewportChange={handleViewportChange} />
          )}
        </div>
      </ToolContainer>
    );
  };

  const renderSlot = (slot: ToolSlot, index: number) =>
    renderToolInstance({
      toolId: slot.toolId,
      instanceId: `${layout.id}-${slot.toolId}-${index}`,
      viewportOverride: slot.viewport,
      configOverride: slot.config,
      size: slot.size,
      isActive: true,
    });

  if (layout.mode === "dock" && dockTree) {
    const handleDockChange = (next: DockNode) => {
      setDockTree(next);
      onLayoutChange({ ...layout, dockLayout: next });
    };

    return (
      <DockWorkspace
        dockTree={dockTree}
        onDockTreeChange={handleDockChange}
        renderTool={(toolId, options) =>
          renderToolInstance({
            toolId,
            instanceId: options.instanceId,
            isActive: options.isActive,
          })
        }
      />
    );
  }

  if (layout.mode === "single" && layout.slots.length > 0) {
    return <div className="h-full w-full">{renderSlot(layout.slots[0], 0)}</div>;
  }

  if (layout.mode === "split-h" && layout.slots.length > 1) {
    return (
      <ResizablePanelGroup direction="horizontal" className="h-full w-full">
        {layout.slots.map((slot, index) => (
          <Fragment key={`slot-h-${index}`}>
            <ResizablePanel defaultSize={slot.size || 50}>{renderSlot(slot, index)}</ResizablePanel>
            {index < layout.slots.length - 1 && <ResizableHandle withHandle />}
          </Fragment>
        ))}
      </ResizablePanelGroup>
    );
  }

  if (layout.mode === "split-v" && layout.slots.length > 1) {
    return (
      <ResizablePanelGroup direction="vertical" className="h-full w-full">
        {layout.slots.map((slot, index) => (
          <Fragment key={`slot-v-${index}`}>
            <ResizablePanel defaultSize={slot.size || 50}>{renderSlot(slot, index)}</ResizablePanel>
            {index < layout.slots.length - 1 && <ResizableHandle withHandle />}
          </Fragment>
        ))}
      </ResizablePanelGroup>
    );
  }

  if (layout.mode === "grid" && layout.slots.length >= 4) {
    return (
      <ResizablePanelGroup direction="vertical" className="h-full w-full">
        <ResizablePanel defaultSize={50}>
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={50}>{renderSlot(layout.slots[0], 0)}</ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={50}>{renderSlot(layout.slots[1], 1)}</ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50}>
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={50}>{renderSlot(layout.slots[2], 2)}</ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={50}>{renderSlot(layout.slots[3], 3)}</ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  }

  // Fallback: render first slot if available
  if (layout.slots.length > 0) {
    return <div className="h-full w-full">{renderSlot(layout.slots[0], 0)}</div>;
  }

  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      No tools configured for this layout.
    </div>
  );
}
