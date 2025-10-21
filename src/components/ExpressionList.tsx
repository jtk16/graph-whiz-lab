import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpressionInput } from "./ExpressionInput";

interface Expression {
  id: string;
  latex: string;
  normalized: string;
  color: string;
  typeInfo: import('@/lib/types').TypeInfo;
}

interface ExpressionListProps {
  expressions: Expression[];
  activeId: string | null;
  onAddExpression: () => void;
  onUpdateExpression: (id: string, latex: string) => void;
  onUpdateColor: (id: string, color: string) => void;
  onRemoveExpression: (id: string) => void;
  onClearAll: () => void;
  onSetActive: (id: string) => void;
}

export const ExpressionList = ({
  expressions,
  activeId,
  onAddExpression,
  onUpdateExpression,
  onUpdateColor,
  onRemoveExpression,
  onClearAll,
  onSetActive,
}: ExpressionListProps) => {
  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-expression-bg">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          {expressions.length > 0 && (
            <Button
              onClick={onClearAll}
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
        <Button
          onClick={onAddExpression}
          variant="outline"
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Expression
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-hide">
        {expressions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
            <p>No expressions yet</p>
            <p className="text-xs mt-1">Click "Add Expression" to start</p>
          </div>
        ) : (
          expressions.map((expr, index) => (
            <ExpressionInput
              key={expr.id}
              id={expr.id}
              index={index + 1}
              value={expr.latex}
              normalized={expr.normalized}
              typeInfo={expr.typeInfo}
              color={expr.color}
              onChange={(latex) => onUpdateExpression(expr.id, latex)}
              onColorChange={(color) => onUpdateColor(expr.id, color)}
              onRemove={() => onRemoveExpression(expr.id)}
              isActive={expr.id === activeId}
              onFocus={() => onSetActive(expr.id)}
              allExpressions={expressions}
            />
          ))
        )}
      </div>
    </div>
  );
};
