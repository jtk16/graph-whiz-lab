import { useState, useEffect } from "react";
import { ExpressionList } from "@/components/ExpressionList";
import { GraphCanvas } from "@/components/GraphCanvas";
import { GraphControls } from "@/components/GraphControls";
import { TypeTable } from "@/components/TypeTable";
import { normalizeExpression } from "@/lib/normalizeExpression";
import { inferType, TypeInfo, MathType } from "@/lib/types";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const GRAPH_COLORS = [
  "hsl(var(--graph-1))",
  "hsl(var(--graph-2))",
  "hsl(var(--graph-3))",
  "hsl(var(--graph-4))",
  "hsl(var(--graph-5))",
  "hsl(var(--graph-6))",
];

interface Expression {
  id: string;
  latex: string;
  normalized: string;
  color: string;
  typeInfo: TypeInfo;
}

const Index = () => {
  // Load expressions from localStorage or start with empty array
  const [expressions, setExpressions] = useState<Expression[]>(() => {
    const saved = localStorage.getItem('graph-expressions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [viewport, setViewport] = useState({
    xMin: -10,
    xMax: 10,
    yMin: -10,
    yMax: 10,
  });

  // Persist expressions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('graph-expressions', JSON.stringify(expressions));
  }, [expressions]);

  const addExpression = () => {
    const newId = Date.now().toString();
    const colorIndex = expressions.length % GRAPH_COLORS.length;
    setExpressions([
      ...expressions,
      { id: newId, latex: "", normalized: "", color: GRAPH_COLORS[colorIndex], typeInfo: { type: MathType.Unknown } },
    ]);
    setActiveId(newId);
  };

  const updateExpression = (id: string, latex: string) => {
    const normalized = normalizeExpression(latex);
    const typeInfo = inferType(latex, normalized);
    setExpressions(
      expressions.map((expr) =>
        expr.id === id ? { ...expr, latex, normalized, typeInfo } : expr
      )
    );
  };

  const updateExpressionColor = (id: string, color: string) => {
    setExpressions(
      expressions.map((expr) =>
        expr.id === id ? { ...expr, color } : expr
      )
    );
  };

  const removeExpression = (id: string) => {
    const newExpressions = expressions.filter((expr) => expr.id !== id);
    setExpressions(newExpressions);
    if (activeId === id) {
      setActiveId(newExpressions[0]?.id || null);
    }
  };

  const clearAllExpressions = () => {
    setExpressions([]);
    setActiveId(null);
  };

  const handleZoomIn = () => {
    const xCenter = (viewport.xMin + viewport.xMax) / 2;
    const yCenter = (viewport.yMin + viewport.yMax) / 2;
    const xRange = (viewport.xMax - viewport.xMin) / 2;
    const yRange = (viewport.yMax - viewport.yMin) / 2;

    setViewport({
      xMin: xCenter - xRange / 2,
      xMax: xCenter + xRange / 2,
      yMin: yCenter - yRange / 2,
      yMax: yCenter + yRange / 2,
    });
  };

  const handleZoomOut = () => {
    const xCenter = (viewport.xMin + viewport.xMax) / 2;
    const yCenter = (viewport.yMin + viewport.yMax) / 2;
    const xRange = (viewport.xMax - viewport.xMin) * 2;
    const yRange = (viewport.yMax - viewport.yMin) * 2;

    setViewport({
      xMin: xCenter - xRange / 2,
      xMax: xCenter + xRange / 2,
      yMin: yCenter - yRange / 2,
      yMax: yCenter + yRange / 2,
    });
  };

  const handleResetView = () => {
    setViewport({
      xMin: -10,
      xMax: 10,
      yMin: -10,
      yMax: 10,
    });
  };

  return (
    <div className="flex h-screen overflow-hidden relative">
      <ResizablePanelGroup direction="horizontal">
        {/* Expression Sidebar - Collapsible & Resizable */}
        {!isPanelCollapsed && (
          <>
            <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
              <div className="h-full border-r border-border flex flex-col overflow-hidden">
                <ExpressionList
                  expressions={expressions}
                  activeId={activeId}
                  onAddExpression={addExpression}
                  onUpdateExpression={updateExpression}
                  onUpdateColor={updateExpressionColor}
                  onRemoveExpression={removeExpression}
                  onClearAll={clearAllExpressions}
                  onSetActive={setActiveId}
                />
                <div className="border-t border-border">
                  <TypeTable expressions={expressions} />
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}

        {/* Graph Canvas */}
        <ResizablePanel>
          <div className="h-full bg-canvas-bg relative">
            <GraphCanvas 
              expressions={expressions}
              viewport={viewport}
              onViewportChange={setViewport}
            />
            <GraphControls
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetView={handleResetView}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Collapse/Expand Toggle */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
        className="absolute top-4 left-4 z-10 h-8 w-8"
      >
        {isPanelCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>
    </div>
  );
};

export default Index;
