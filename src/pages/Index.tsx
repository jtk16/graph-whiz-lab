import { useState } from "react";
import { ExpressionList } from "@/components/ExpressionList";
import { GraphCanvas } from "@/components/GraphCanvas";

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
  value: string;
  color: string;
}

const Index = () => {
  const [expressions, setExpressions] = useState<Expression[]>([
    { id: "1", value: "y = x^2", color: GRAPH_COLORS[0] },
  ]);
  const [activeId, setActiveId] = useState<string | null>("1");

  const addExpression = () => {
    const newId = Date.now().toString();
    const colorIndex = expressions.length % GRAPH_COLORS.length;
    setExpressions([
      ...expressions,
      { id: newId, value: "", color: GRAPH_COLORS[colorIndex] },
    ]);
    setActiveId(newId);
  };

  const updateExpression = (id: string, value: string) => {
    setExpressions(
      expressions.map((expr) =>
        expr.id === id ? { ...expr, value } : expr
      )
    );
  };

  const removeExpression = (id: string) => {
    setExpressions(expressions.filter((expr) => expr.id !== id));
    if (activeId === id) {
      setActiveId(expressions[0]?.id || null);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Expression Sidebar */}
      <div className="w-80 border-r border-border flex-shrink-0">
        <ExpressionList
          expressions={expressions}
          activeId={activeId}
          onAddExpression={addExpression}
          onUpdateExpression={updateExpression}
          onRemoveExpression={removeExpression}
          onSetActive={setActiveId}
        />
      </div>

      {/* Graph Canvas */}
      <div className="flex-1 bg-canvas-bg">
        <GraphCanvas expressions={expressions} />
      </div>
    </div>
  );
};

export default Index;
