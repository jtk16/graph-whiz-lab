import { useState, useEffect } from "react";
import { WorkspaceLayout, ToolSlot } from "@/lib/workspace/types";
import { toolRegistry } from "@/lib/tools";
import { ToolContainer } from "./ToolContainer";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ToolkitExpression } from "@/lib/toolkits/types";
import { Graph2DControls } from "@/components/tools/Graph2DControls";

interface WorkspaceProps {
  expressions: Array<{
    id: string;
    latex: string;
    normalized: string;
    color: string;
  }>;
  toolkitDefinitions: ToolkitExpression[];
  layout: WorkspaceLayout;
  onLayoutChange: (layout: WorkspaceLayout) => void;
  toolStates: Record<string, any>;
  onToolStateChange: (toolId: string, state: any) => void;
}

export function Workspace({ 
  expressions, 
  toolkitDefinitions, 
  layout,
  toolStates,
  onToolStateChange
}: WorkspaceProps) {
  // Track which tools are actually rendered in current layout
  const [activeToolIds, setActiveToolIds] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    const currentToolIds = new Set(layout.slots.map(slot => slot.toolId));
    setActiveToolIds(currentToolIds);
  }, [layout]);
  
  const renderTool = (slot: ToolSlot, index: number) => {
    const tool = toolRegistry.get(slot.toolId);
    if (!tool) {
      console.warn(`Tool ${slot.toolId} not found in registry`);
      return null;
    }
    
    const ToolComponent = tool.component;
    const ControlsComponent = tool.controlsComponent;
    const toolState = toolStates[slot.toolId] || {};
    
    const handleViewportChange = (viewport: any) => {
      onToolStateChange(slot.toolId, { ...toolState, viewport });
    };
    
    const handleConfigChange = (config: any) => {
      onToolStateChange(slot.toolId, { ...toolState, config });
    };
    
    // Tool is active only if it's in the current layout
    const isToolActive = activeToolIds.has(slot.toolId);
    
    return (
      <ToolContainer
        key={`${slot.toolId}-${layout.id}-${index}`}
        tool={tool}
        size={slot.size}
      >
        <div className="relative w-full h-full">
          <ToolComponent
            expressions={expressions}
            toolkitDefinitions={toolkitDefinitions}
            viewport={toolState.viewport || slot.viewport}
            onViewportChange={handleViewportChange}
            isActive={isToolActive}
            toolConfig={toolState.config || slot.config}
          />
          
          {/* Render controls if available and tool is active */}
          {ControlsComponent && isToolActive && toolState.viewport && (
            <ControlsComponent
              toolConfig={toolState.config || slot.config || {}}
              onConfigChange={handleConfigChange}
            />
          )}
          
          {/* Special case: 2D graph controls */}
          {slot.toolId === 'graph-2d' && isToolActive && toolState.viewport && (
            <Graph2DControls
              viewport={toolState.viewport}
              onViewportChange={handleViewportChange}
            />
          )}
        </div>
      </ToolContainer>
    );
  };
  
  // Single tool mode
  if (layout.mode === 'single' && layout.slots.length > 0) {
    return (
      <div className="w-full h-full">
        {renderTool(layout.slots[0], 0)}
      </div>
    );
  }
  
  // Horizontal split mode
  if (layout.mode === 'split-h' && layout.slots.length > 1) {
    return (
      <ResizablePanelGroup direction="horizontal" className="w-full h-full">
        {layout.slots.map((slot, i) => (
          <>
            <ResizablePanel key={`panel-${i}`} defaultSize={slot.size || 50}>
              {renderTool(slot, i)}
            </ResizablePanel>
            {i < layout.slots.length - 1 && <ResizableHandle key={`handle-${i}`} />}
          </>
        ))}
      </ResizablePanelGroup>
    );
  }
  
  // Vertical split mode
  if (layout.mode === 'split-v' && layout.slots.length > 1) {
    return (
      <ResizablePanelGroup direction="vertical" className="w-full h-full">
        {layout.slots.map((slot, i) => (
          <>
            <ResizablePanel key={`panel-${i}`} defaultSize={slot.size || 50}>
              {renderTool(slot, i)}
            </ResizablePanel>
            {i < layout.slots.length - 1 && <ResizableHandle key={`handle-${i}`} />}
          </>
        ))}
      </ResizablePanelGroup>
    );
  }
  
  // Grid mode (2x2)
  if (layout.mode === 'grid' && layout.slots.length >= 4) {
    return (
      <ResizablePanelGroup direction="vertical" className="w-full h-full">
        <ResizablePanel defaultSize={50}>
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={50}>
              {renderTool(layout.slots[0], 0)}
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={50}>
              {renderTool(layout.slots[1], 1)}
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50}>
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={50}>
              {renderTool(layout.slots[2], 2)}
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={50}>
              {renderTool(layout.slots[3], 3)}
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  }
  
  // Fallback: render first slot only
  return (
    <div className="w-full h-full">
      {layout.slots.length > 0 && renderTool(layout.slots[0], 0)}
    </div>
  );
}
