import { MathInput } from "@/components/MathInput";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseExpression } from "@/lib/parser";
import { buildDefinitionContext } from "@/lib/definitionContext";
import { evaluateToNumber } from "@/lib/runtime/evaluator";
import { MathType, TypeInfo } from "@/lib/types";
import "@/components/MathInput.css";

interface ExpressionInputProps {
  id: string;
  value: string;
  normalized: string;
  typeInfo: TypeInfo;
  color: string;
  onChange: (value: string) => void;
  onRemove: () => void;
  isActive: boolean;
  onFocus: () => void;
  allExpressions: Array<{ normalized: string }>;
}

export const ExpressionInput = ({
  id,
  value,
  normalized,
  typeInfo,
  color,
  onChange,
  onRemove,
  isActive,
  onFocus,
  allExpressions,
}: ExpressionInputProps) => {
  // Calculate scalar value if applicable
  const getScalarValue = (): string | null => {
    if (!normalized) return null;
    
    // Check if it's a variable definition (e.g., "s = 5 + 2")
    const isDefinition = normalized.includes('=') && !normalized.includes('==');
    
    // Only show scalar for Number types that aren't function expressions
    if (typeInfo.type !== MathType.Number) return null;
    
    // Don't show for function expressions (expressions with variables like x, y)
    // But DO show for constants and simple arithmetic
    const hasVariables = /[a-z]/i.test(normalized) && 
                        !/(pi|e|sin|cos|tan|sqrt|abs|exp|ln|log|floor|ceil|round)/i.test(normalized);
    
    if (hasVariables && !isDefinition) return null;
    
    try {
      const context = buildDefinitionContext(allExpressions);
      
      // For definitions, evaluate the RHS
      if (isDefinition) {
        const parts = normalized.split('=');
        if (parts.length === 2) {
          const rhs = parts[1].trim();
          const ast = parseExpression(rhs, context);
          const result = evaluateToNumber(ast, 0, context);
          if (isFinite(result)) {
            return formatNumber(result);
          }
        }
        return null;
      }
      
      // For regular expressions, evaluate directly
      const ast = parseExpression(normalized, context);
      const result = evaluateToNumber(ast, 0, context);
      
      if (isFinite(result)) {
        return formatNumber(result);
      }
    } catch (e) {
      // If evaluation fails, don't show a result
      return null;
    }
    
    return null;
  };

  const formatNumber = (num: number): string => {
    const absNum = Math.abs(num);
    
    if (absNum >= 1e6 || (absNum < 1e-3 && absNum > 0)) {
      return num.toExponential(3);
    }
    
    if (absNum >= 100) {
      return num.toFixed(1);
    } else if (absNum >= 1) {
      return num.toFixed(2);
    } else if (absNum >= 0.01) {
      return num.toFixed(3);
    } else {
      return num.toFixed(4);
    }
  };

  const scalarValue = getScalarValue();

  return (
    <div
      className={`group flex items-center gap-2 p-2 rounded-lg transition-colors relative ${
        isActive ? "bg-expression-active" : "hover:bg-expression-hover"
      }`}
    >
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <MathInput
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        placeholder="y = x^2"
        className="flex-1"
      />
      {scalarValue && (
        <div className="absolute bottom-1 right-10 text-xs font-mono text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded">
          = {scalarValue}
        </div>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
