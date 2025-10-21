import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpressionInput } from "./ExpressionInput";

interface Expression {
  id: string;
  value: string;
  color: string;
}

interface ExpressionListProps {
  expressions: Expression[];
  activeId: string | null;
  onAddExpression: () => void;
  onUpdateExpression: (id: string, value: string) => void;
  onRemoveExpression: (id: string) => void;
  onSetActive: (id: string) => void;
}

export const ExpressionList = ({
  expressions,
  activeId,
  onAddExpression,
  onUpdateExpression,
  onRemoveExpression,
  onSetActive,
}: ExpressionListProps) => {
  return (
    <div className="flex flex-col h-full bg-expression-bg">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold mb-3">Expressions</h2>
        <Button
          onClick={onAddExpression}
          variant="outline"
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Expression
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {expressions.map((expr) => (
          <ExpressionInput
            key={expr.id}
            id={expr.id}
            value={expr.value}
            color={expr.color}
            onChange={(value) => onUpdateExpression(expr.id, value)}
            onRemove={() => onRemoveExpression(expr.id)}
            isActive={expr.id === activeId}
            onFocus={() => onSetActive(expr.id)}
          />
        ))}
      </div>
    </div>
  );
};
