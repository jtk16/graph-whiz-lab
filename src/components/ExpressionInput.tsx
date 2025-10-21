import { useRef, useEffect } from "react";
import { MathInput, MathInputRef } from "@/components/MathInput";
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
  "hsl(220, 90%, 56%)",  // Bright Blue
  "hsl(340, 82%, 52%)",  // Pink
  "hsl(280, 80%, 60%)",  // Purple
  "hsl(160, 84%, 39%)",  // Teal
  "hsl(25, 95%, 53%)",   // Orange
  "hsl(48, 96%, 53%)",   // Yellow
  "hsl(142, 76%, 36%)",  // Green
  "hsl(0, 84%, 60%)",    // Red
  "hsl(200, 98%, 39%)",  // Cyan
  "hsl(262, 83%, 58%)",  // Violet
  "hsl(32, 98%, 56%)",   // Amber
  "hsl(173, 80%, 40%)",  // Emerald
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
  onSetActiveMathInput: (ref: MathInputRef | null) => void;
  allExpressions: Array<{ normalized: string }>;
  errors?: Array<{
    type: string;
    message: string;
    identifier?: string;
    suggestions?: string[];
  }>;
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
  onSetActiveMathInput,
  allExpressions,
  errors = [],
}: ExpressionInputProps) => {
  const mathInputRef = useRef<MathInputRef>(null);
  const hasErrors = errors.length > 0;

  // Update parent with our ref when focused
  useEffect(() => {
    if (isActive && mathInputRef.current) {
      onSetActiveMathInput(mathInputRef.current);
    }
  }, [isActive, onSetActiveMathInput]);
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
        hasErrors
          ? "bg-destructive/5 border-destructive/50"
          : isActive 
            ? "bg-expression-active border-primary/50 shadow-sm" 
            : "hover:bg-expression-hover border-border/50"
      }`}
    >
      {/* Index Badge */}
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
        {index}
      </div>

      {/* Color Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="w-7 h-7 rounded-lg flex-shrink-0 cursor-pointer border-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
            style={{ backgroundColor: color, borderColor: color }}
          />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <div className="grid grid-cols-6 gap-2">
            {GRAPH_COLORS.map((c) => (
              <button
                key={c}
                className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 active:scale-95 ${
                  c === color ? 'border-foreground ring-2 ring-primary/50' : 'border-border/50'
                }`}
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
          ref={mathInputRef}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          placeholder="y = x^2"
          className="w-full"
        />
      </div>

      {/* Error Display */}
      {hasErrors && (
        <div className="absolute -bottom-6 left-12 text-xs text-destructive flex items-center gap-1">
          <span>⚠️ {errors[0].message}</span>
          {errors[0].suggestions && errors[0].suggestions.length > 0 && (
            <span className="text-muted-foreground">
              (did you mean {errors[0].suggestions.slice(0, 2).join(' or ')}?)
            </span>
          )}
        </div>
      )}

      {/* Scalar Value Display */}
      {scalarValue && !hasErrors && (
        <div className="absolute bottom-1 right-10 text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
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
