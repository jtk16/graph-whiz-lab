import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Toolkit, ToolkitExpression } from "@/lib/toolkits/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MathInput } from "./MathInput";

interface ToolkitExpressionSelectorProps {
  toolkit: Toolkit;
  importedExpressions: ToolkitExpression[];
  onConfirm: (selectedExpressions: Omit<ToolkitExpression, 'id' | 'source'>[]) => void;
  onCancel: () => void;
}

export function ToolkitExpressionSelector({
  toolkit,
  importedExpressions,
  onConfirm,
  onCancel,
}: ToolkitExpressionSelectorProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [autoImportDeps, setAutoImportDeps] = useState(true);
  const [editedExpressions, setEditedExpressions] = useState<Map<number, string>>(new Map());

  const toggleExpression = (index: number) => {
    const newSelected = new Set(selected);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelected(newSelected);
  };

  const selectAll = () => {
    setSelected(new Set(toolkit.expressions.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelected(new Set());
  };

  const handleLatexChange = (index: number, latex: string) => {
    const newEdited = new Map(editedExpressions);
    newEdited.set(index, latex);
    setEditedExpressions(newEdited);
  };

  const handleConfirm = () => {
    let expressionsToImport = Array.from(selected).map(i => {
      const expr = toolkit.expressions[i];
      const editedLatex = editedExpressions.get(i);
      return editedLatex ? { ...expr, latex: editedLatex } : expr;
    });
    
    // Auto-import dependencies if enabled
    if (autoImportDeps) {
      const neededDeps = new Set<string>();
      expressionsToImport.forEach(expr => {
        expr.dependencies?.forEach(dep => neededDeps.add(dep));
      });
      
      // Add missing dependencies
      toolkit.expressions.forEach((expr, idx) => {
        const funcName = expr.normalized.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\(/)?.[1];
        if (funcName && neededDeps.has(funcName) && !selected.has(idx)) {
          expressionsToImport.push(expr);
        }
      });
    }
    
    onConfirm(expressionsToImport);
  };

  // Check which expressions are already imported
  const isAlreadyImported = (normalized: string): boolean => {
    return importedExpressions.some(ie => 
      ie.normalized === normalized || 
      ie.source === toolkit.id
    );
  };

  const selectedCount = selected.size;
  const hasSelection = selectedCount > 0;

  return (
    <div className="flex flex-col h-full max-h-[85vh]">
      <div className="p-4 border-b shrink-0">
        <h3 className="text-lg font-semibold">{toolkit.name}</h3>
        <p className="text-sm text-muted-foreground mt-1">{toolkit.description}</p>
        
        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAll}>
              Deselect All
            </Button>
          </div>
          <span className="text-sm text-muted-foreground">
            {selectedCount} selected
          </span>
        </div>
        
        <div className="flex items-center gap-2 mt-3">
          <Checkbox
            id="auto-deps"
            checked={autoImportDeps}
            onCheckedChange={(checked) => setAutoImportDeps(checked === true)}
          />
          <label
            htmlFor="auto-deps"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Automatically import dependencies
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide p-4 min-h-0">
        <div className="space-y-3 pb-4">
          {toolkit.expressions.map((expr, index) => {
            const isImported = isAlreadyImported(expr.normalized);
            const isSelected = selected.has(index);
            const hasDeps = expr.dependencies && expr.dependencies.length > 0;
            const currentLatex = editedExpressions.get(index) || expr.latex;
            
            return (
              <div
                key={index}
                className={`border rounded-lg p-3 transition-colors ${
                  isImported ? 'bg-muted/50 opacity-60' : 
                  isSelected ? 'bg-primary/5 border-primary/30' : 'hover:bg-accent/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => !isImported && toggleExpression(index)}
                    disabled={isImported}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1">
                        <MathInput
                          value={currentLatex}
                          onChange={(latex) => handleLatexChange(index, latex)}
                          className="text-sm"
                          disabled={isImported}
                        />
                      </div>
                      {isImported && (
                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 shrink-0">
                          <CheckCircle2 className="h-3 w-3" />
                          Imported
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-1">
                      {expr.description}
                    </p>
                    
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                        {expr.category}
                      </span>
                      {hasDeps && (
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <AlertCircle className="h-3 w-3" />
                          Requires: {expr.dependencies!.map(d => `${d}()`).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-4 border-t bg-muted/30 flex items-center justify-between gap-2 shrink-0">
        {hasSelection && autoImportDeps && (
          <Alert className="flex-1">
            <AlertDescription className="text-xs">
              Dependencies will be automatically included
            </AlertDescription>
          </Alert>
        )}
        {!hasSelection && (
          <div className="flex-1" />
        )}
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!hasSelection}>
            Import {hasSelection && `(${selectedCount})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
