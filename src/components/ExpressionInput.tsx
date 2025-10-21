import { MathInput } from "@/components/MathInput";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { parseExpression } from "@/lib/parser";
import { buildDefinitionContext } from "@/lib/definitionContext";
import { evaluateToNumber } from "@/lib/runtime/evaluator";
import { MathType, TypeInfo } from "@/lib/types";
import "@/components/MathInput.css";

const GRAPH_COLORS = [
  "hsl(var(--graph-1))",
  "hsl(var(--graph-2))",
  "hsl(var(--graph-3))",
  "hsl(var(--graph-4))",
  "hsl(var(--graph-5))",
  "hsl(var(--graph-6))",
];

interface ExpressionInputProps {
  id: string;
  index: number;
  value: string;
  normalized: string;
  typeInfo: TypeInfo;
  color: string;
  onChange: (value: string) => void;
  onColorChange: (color: string) => void;
  onRemove: () => void;
  isActive: boolean;
  onFocus: () => void;
  allExpressions: Array<{ normalized: string }>;
}

export const ExpressionInput = ({
  id,
  index,
  value,
  normalized,
  typeInfo,
  color,
  onChange,
  onColorChange,
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
      className={`group flex items-center gap-2 p-3 rounded-lg transition-all relative border ${
        isActive 
          ? "bg-expression-active border-primary/50 shadow-sm" 
          : "hover:bg-expression-hover border-transparent"
      }`}
    >
      {/* Index Number */}
      <div className="text-xs font-semibold text-muted-foreground w-5 flex-shrink-0 select-none">
        {index}
      </div>

      {/* Color Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="w-4 h-4 rounded-full flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-primary/50 transition-all"
            style={{ backgroundColor: color }}
          />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <div className="grid grid-cols-3 gap-2">
            {GRAPH_COLORS.map((c) => (
              <button
                key={c}
                className="w-8 h-8 rounded-full hover:ring-2 hover:ring-offset-2 hover:ring-primary/50 transition-all"
                style={{ backgroundColor: c }}
                onClick={() => onColorChange(c)}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Math Input */}
      <div className="flex-1 min-w-0">
        <MathInput
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          placeholder="y = x^2"
          className="w-full"
        />
      </div>

      {/* Scalar Value Display */}
      {scalarValue && (
        <div className="absolute bottom-1 right-10 text-xs font-mono text-muted-foreground bg-background/90 px-1.5 py-0.5 rounded backdrop-blur-sm">
          = {scalarValue}
        </div>
      )}

      {/* Remove Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 flex-shrink-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
