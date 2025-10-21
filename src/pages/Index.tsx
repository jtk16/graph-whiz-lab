import { useState, useEffect } from "react";
import { ExpressionList } from "@/components/ExpressionList";
import { GraphCanvas } from "@/components/GraphCanvas";
import { GraphControls } from "@/components/GraphControls";
import { TypeTable } from "@/components/TypeTable";
import { Header } from "@/components/Header";
import { ToolkitDefinitionsPanel } from "@/components/ToolkitDefinitionsPanel";
import { normalizeExpression } from "@/lib/normalizeExpression";
import { inferType, TypeInfo, MathType } from "@/lib/types";
import { buildDefinitionContext } from "@/lib/definitionContext";
import { validateExpression, detectCircularDependency } from "@/lib/validation/expressionValidator";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolkitExpression, getToolkitById } from "@/lib/toolkits";
import { toast } from "@/hooks/use-toast";

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
  errors?: Array<{
    type: string;
    message: string;
    identifier?: string;
    suggestions?: string[];
  }>;
}

const Index = () => {
  // Load toolkit definitions from localStorage
  const [toolkitDefinitions, setToolkitDefinitions] = useState<ToolkitExpression[]>(() => {
    const saved = localStorage.getItem('toolkit-definitions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

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

  // Persist toolkit definitions to localStorage
  useEffect(() => {
    localStorage.setItem('toolkit-definitions', JSON.stringify(toolkitDefinitions));
  }, [toolkitDefinitions]);

  // Persist expressions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('graph-expressions', JSON.stringify(expressions));
  }, [expressions]);

  const addExpression = () => {
    const newId = Date.now().toString();
    const colorIndex = expressions.length % GRAPH_COLORS.length;
    const newColor = GRAPH_COLORS[colorIndex];
    setExpressions([
      ...expressions,
      { 
        id: newId, 
        latex: "", 
        normalized: "", 
        color: newColor, 
        typeInfo: { type: MathType.Unknown } 
      },
    ]);
    setActiveId(newId);
  };

  const updateExpression = (id: string, latex: string) => {
    const normalized = normalizeExpression(latex);
    const typeInfo = inferType(latex, normalized);
    
    setExpressions((prev) => {
      const updated = prev.map((expr) =>
        expr.id === id ? { ...expr, latex, normalized, typeInfo } : expr
      );
      
      // Validate and check for errors
      return updated.map((expr, index) => {
        if (!expr.normalized.trim()) {
          return { ...expr, errors: [] };
        }
        
        console.log(`\n🔍 Validating expression: ${expr.normalized}`);
        console.log('Toolkit definitions count:', toolkitDefinitions.length);
        console.log('Toolkit normalized expressions:', toolkitDefinitions.map(td => td.normalized));
        
        // Build context with toolkit definitions FIRST, then ALL expressions up to and including current
        // This allows expressions to reference earlier definitions in order
        const allContextExpressions = [
          ...toolkitDefinitions.map(td => ({ normalized: td.normalized })),
          ...updated.slice(0, index + 1).map(e => ({ normalized: e.normalized }))
        ];
        
        console.log('Building context with expressions:', allContextExpressions.map(e => e.normalized));
        const context = buildDefinitionContext(allContextExpressions);
        
        console.log('Context after build - Functions:', Object.keys(context.functions));
        console.log('Context after build - Variables:', Object.keys(context.variables));
        
        const errors = validateExpression(expr.normalized, context, expr.id, index);
        
        console.log('Validation errors:', errors);
        
        // Check for circular dependencies
        const cycle = detectCircularDependency(expr.normalized, updated, expr.id);
        if (cycle) {
          errors.push({
            type: 'circular_dependency',
            message: 'Circular dependency detected',
            identifier: cycle,
          });
        }
        
        return { ...expr, errors };
      });
    });
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

  // Toolkit management functions
  const handleImportToolkit = (
    toolkitId: string, 
    selectedExpressions: Omit<ToolkitExpression, 'id' | 'source'>[]
  ) => {
    const toolkit = getToolkitById(toolkitId);
    if (!toolkit) return;
    
    if (selectedExpressions.length === 0) {
      toast({
        title: "No Expressions Selected",
        description: "Please select at least one expression to import",
        variant: "destructive",
      });
      return;
    }
    
    const newDefinitions = selectedExpressions.map(expr => ({
      ...expr,
      id: `toolkit-${toolkitId}-${Date.now()}-${Math.random()}`,
      source: toolkitId,
    }));
    
    setToolkitDefinitions(prev => [...prev, ...newDefinitions]);
    
    toast({
      title: "Expressions Imported",
      description: `Added ${newDefinitions.length} expression${newDefinitions.length > 1 ? 's' : ''} from ${toolkit.name}`,
    });
  };

  const updateToolkitDefinition = (id: string, latex: string) => {
    const normalized = normalizeExpression(latex);
    setToolkitDefinitions(prev =>
      prev.map(def =>
        def.id === id ? { ...def, latex, normalized, isModified: true } : def
      )
    );
  };

  const removeToolkitDefinition = (id: string) => {
    setToolkitDefinitions(prev => prev.filter(def => def.id !== id));
  };

  const clearToolkitDefinitions = () => {
    setToolkitDefinitions([]);
    toast({
      title: "Toolkits Cleared",
      description: "All toolkit definitions removed",
    });
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header 
        toolkitDefinitions={toolkitDefinitions}
        onImportToolkit={handleImportToolkit}
        onUpdateDefinition={updateToolkitDefinition}
        onRemoveDefinition={removeToolkitDefinition}
        onClearAll={clearToolkitDefinitions}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Expression Sidebar - Collapsible & Resizable */}
          {!isPanelCollapsed && (
            <>
              <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
                <div className="h-full border-r border-border flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-lg font-semibold">Expressions</h2>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsPanelCollapsed(true)}
                      className="h-8 w-8"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-hidden flex flex-col">
                    {/* User Expressions List */}
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
                      <TypeTable 
                        expressions={expressions} 
                        toolkitDefinitions={toolkitDefinitions}
                      />
                    </div>
                  </div>
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}

          {/* Graph Canvas */}
          <ResizablePanel>
            <div className="h-full bg-canvas-bg relative">
              {/* Show expand button when collapsed */}
              {isPanelCollapsed && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsPanelCollapsed(false)}
                  className="absolute top-4 left-4 z-10 h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}

              <GraphCanvas 
                expressions={[
                  // Toolkit definitions first (precedence)
                  ...toolkitDefinitions.map(td => ({
                    id: td.id,
                    latex: td.latex,
                    normalized: td.normalized,
                    color: 'hsl(var(--muted-foreground))',
                    typeInfo: td as any,
                  })),
                  // Then user expressions
                  ...expressions
                ]}
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
      </div>
    </div>
  );
};

export default Index;
