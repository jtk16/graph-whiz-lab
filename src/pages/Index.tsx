import { useState, useEffect, useRef } from "react";
import { ExpressionList } from "@/components/ExpressionList";
import { GraphCanvas } from "@/components/GraphCanvas";
import { GraphControls } from "@/components/GraphControls";
import { TypeTable } from "@/components/TypeTable";
import { Header } from "@/components/Header";
import { ToolkitDefinitionsPanel } from "@/components/ToolkitDefinitionsPanel";
import { MathKeyboard } from "@/components/MathKeyboard";
import { inferType, TypeInfo, MathType } from "@/lib/types";
import { validateExpression, detectCircularDependency } from "@/lib/validation/expressionValidator";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ChevronLeft, ChevronRight, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolkitExpression, getToolkitById } from "@/lib/toolkits";
import { toast } from "@/hooks/use-toast";
import { KeyboardItem } from "@/lib/keyboard/items";
import { MathInputRef } from "@/components/MathInput";
import { Workspace } from "@/components/workspace/Workspace";
import { WorkspaceLayout } from "@/lib/workspace/types";
import { getDefaultLayout, WORKSPACE_LAYOUTS } from "@/lib/workspace/layouts";
import { loadWorkspaceState, saveWorkspaceState, updateToolState, getToolState } from "@/lib/workspace/manager";
import { expressionEngine } from "@/lib/expression";

const GRAPH_COLORS = [
  "hsl(var(--graph-1))",
  "hsl(var(--graph-2))",
  "hsl(var(--graph-3))",
  "hsl(var(--graph-4))",
  "hsl(var(--graph-5))",
  "hsl(var(--graph-6))",
];

const cloneWorkspaceLayout = (layout: WorkspaceLayout): WorkspaceLayout => {
  if (typeof structuredClone === "function") {
    return structuredClone(layout);
  }
  return JSON.parse(JSON.stringify(layout));
};

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
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  
  // Workspace state management
  const [workspaceState, setWorkspaceState] = useState(() => loadWorkspaceState());
  const [layout, setLayout] = useState<WorkspaceLayout>(() => {
    const loaded = loadWorkspaceState();
    const found = WORKSPACE_LAYOUTS.find(l => l.id === loaded.layoutId) || getDefaultLayout();
    return cloneWorkspaceLayout(found);
  });

  // Ref to store active MathInput for keyboard insertions
  const activeMathInputRef = useRef<MathInputRef | null>(null);

  const setActiveMathInput = (ref: MathInputRef | null) => {
    activeMathInputRef.current = ref;
  };

  // Persist toolkit definitions to localStorage
  useEffect(() => {
    localStorage.setItem('toolkit-definitions', JSON.stringify(toolkitDefinitions));
  }, [toolkitDefinitions]);

  // Persist expressions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('graph-expressions', JSON.stringify(expressions));
  }, [expressions]);

  // Persist workspace state
  useEffect(() => {
    saveWorkspaceState(workspaceState);
  }, [workspaceState]);

  const handleLayoutChange = (newLayout: WorkspaceLayout) => {
    const cloned = cloneWorkspaceLayout(newLayout);
    setLayout(cloned);
    setWorkspaceState(prev => ({ ...prev, layoutId: newLayout.id }));
  };

  const handleToolStateChange = (toolId: string, state: any) => {
    setWorkspaceState(prev => updateToolState(prev, toolId, state));
  };

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
    const normalized = expressionEngine.normalize(latex);
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
        
        
        // Build context with toolkit definitions FIRST, then ALL expressions up to and including current
        // This allows expressions to reference earlier definitions in order
        const allContextExpressions = [
          ...toolkitDefinitions.map(td => ({ normalized: td.normalized })),
          ...updated.slice(0, index + 1).map(e => ({ normalized: e.normalized }))
        ];
        
        const context = expressionEngine.buildContext(allContextExpressions);
        
        
        const errors = validateExpression(expr.normalized, context, expr.id, index);
        
        
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
    const normalized = expressionEngine.normalize(latex);
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

  const handleKeyboardInsert = (item: KeyboardItem) => {
    if (activeMathInputRef.current) {
      const latex = item.insertTemplate || item.latex;
      activeMathInputRef.current.insert(latex);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header 
        toolkitDefinitions={toolkitDefinitions}
        onImportToolkit={handleImportToolkit}
        onUpdateDefinition={updateToolkitDefinition}
        onRemoveDefinition={removeToolkitDefinition}
        onClearAll={clearToolkitDefinitions}
        layout={layout}
        onLayoutChange={handleLayoutChange}
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
                      onSetActiveMathInput={setActiveMathInput}
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

              <Workspace
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
                toolkitDefinitions={toolkitDefinitions}
                layout={layout}
                onLayoutChange={handleLayoutChange}
                toolStates={workspaceState.toolStates}
                onToolStateChange={handleToolStateChange}
              />
              
              {/* Keyboard Toggle Button */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsKeyboardVisible(!isKeyboardVisible)}
                className="absolute bottom-20 right-4 z-10 h-10 w-10"
                title={isKeyboardVisible ? "Hide Keyboard" : "Show Keyboard"}
              >
                <Keyboard className="h-5 w-5" />
              </Button>

              {/* Math Keyboard - Overlay on graph, centered at bottom */}
              {isKeyboardVisible && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl z-20">
                  <MathKeyboard onInsert={handleKeyboardInsert} />
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default Index;


