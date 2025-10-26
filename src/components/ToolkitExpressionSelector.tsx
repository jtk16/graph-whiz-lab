import { useMemo, useRef, useState } from "react";
import type { WheelEvent } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Toolkit, ToolkitExpression } from "@/lib/toolkits/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MathInput } from "./MathInput";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

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
    const selectable = new Set<number>();
    toolkit.expressions.forEach((expr, index) => {
      const already = importedExpressions.some(ie => ie.normalized === expr.normalized);
      if (!already) {
        selectable.add(index);
      }
    });
    setSelected(selectable);
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
      const selectedIndices = new Set(selected);
      
      // Collect all dependencies from selected expressions
      expressionsToImport.forEach(expr => {
        if (expr.dependencies && expr.dependencies.length > 0) {
          expr.dependencies.forEach(dep => neededDeps.add(dep));
        }
      });
      
      
      // Loop to resolve transitive dependencies
      let foundNewDeps = true;
      let iteration = 0;
      while (foundNewDeps) {
        foundNewDeps = false;
        iteration++;
        
        toolkit.expressions.forEach((expr, idx) => {
          // Extract function name from LHS: "funcName(...) = ..."
          const funcName = expr.normalized.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\(/)?.[1];
          
          // If this function is needed and not already selected, add it
          if (funcName && neededDeps.has(funcName) && !selectedIndices.has(idx)) {
            expressionsToImport.push(expr);
            selectedIndices.add(idx);
            foundNewDeps = true;
            
            // Add dependencies of this newly added expression
            expr.dependencies?.forEach(dep => {
              neededDeps.add(dep);
            });
          }
        });
      }
      
    }
    
    onConfirm(expressionsToImport);
  };

  // Check which expressions are already imported
  const isAlreadyImported = (normalized: string): boolean => {
    return importedExpressions.some(ie => ie.normalized === normalized);
  };

  const selectedCount = selected.size;
  const hasSelection = selectedCount > 0;
  
  // Calculate dependencies that will be auto-imported
  const getNeededDeps = (): string[] => {
    if (!autoImportDeps || !hasSelection) return [];
    const neededDeps = new Set<string>();
    Array.from(selected).forEach(i => {
      toolkit.expressions[i].dependencies?.forEach(dep => neededDeps.add(dep));
    });
    return Array.from(neededDeps);
  };
  
  const neededDeps = getNeededDeps();
  const uniqueCategories = useMemo(
    () => Array.from(new Set(toolkit.expressions.map(expr => expr.category))),
    [toolkit.expressions]
  );
  const alreadyImportedCount = useMemo(
    () => toolkit.expressions.filter(expr => isAlreadyImported(expr.normalized)).length,
    [toolkit.expressions]
  );

  // MathLive swallows wheel events, so manually scroll the container on vertical gestures.
  const handleWheelCapture = (event: WheelEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current;
    if (!container || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
      return;
    }

    const targetElement = event.target as HTMLElement | null;
    const isMathFieldInteraction = targetElement?.closest("math-field") !== null;
    if (!isMathFieldInteraction) {
      return;
    }

    const previousScrollTop = container.scrollTop;
    container.scrollTop += event.deltaY;
    if (container.scrollTop !== previousScrollTop) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <section className="space-y-4 rounded-lg border bg-background/90 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">{toolkit.name}</h3>
            <p className="text-sm text-muted-foreground">{toolkit.description}</p>
          </div>
          <Badge variant="secondary" className="text-xs capitalize">
            {uniqueCategories.length ? uniqueCategories.join(", ") : "Mixed"}
          </Badge>
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-md border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Expressions</p>
            <p className="text-base font-semibold">{toolkit.expressions.length}</p>
          </div>
          <div className="rounded-md border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Available</p>
            <p className="text-base font-semibold">
              {toolkit.expressions.length - alreadyImportedCount}
              {alreadyImportedCount > 0 && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  ({alreadyImportedCount} already imported)
                </span>
              )}
            </p>
          </div>
          <div className="rounded-md border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Selection</p>
            <p className="text-base font-semibold">{selectedCount} chosen</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Select all
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAll}>
              Deselect
            </Button>
          </div>
          <label htmlFor="auto-deps" className="flex items-center gap-2 text-sm font-medium">
            <Checkbox
              id="auto-deps"
              checked={autoImportDeps}
              onCheckedChange={checked => setAutoImportDeps(checked === true)}
            />
            Automatically import dependencies
          </label>
        </div>
      </section>

      <section className="flex min-h-0 flex-1 flex-col rounded-lg border bg-background/60">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Selected {selectedCount}</Badge>
            {autoImportDeps && neededDeps.length > 0 && (
              <span className="flex items-center gap-1 text-amber-600">
                <AlertCircle className="h-3 w-3" />
                Auto-importing {neededDeps.map(dep => `${dep}()`).join(", ")}
              </span>
            )}
          </div>
          <span>{toolkit.expressions.length - alreadyImportedCount} importable</span>
        </header>

        <div
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-y-auto px-4 py-3"
          onWheelCapture={handleWheelCapture}
        >
          <div className="space-y-3">
            {toolkit.expressions.map((expr, index) => {
              const isImported = isAlreadyImported(expr.normalized);
              const isSelected = selected.has(index);
              const hasDeps = Boolean(expr.dependencies?.length);
              const currentLatex = editedExpressions.get(index) || expr.latex;

              return (
                <div
                  key={`${expr.normalized}-${index}`}
                  className={cn(
                    "rounded-lg border bg-card/90 p-3 transition-colors",
                    isImported && "opacity-60",
                    !isImported && isSelected && "border-primary bg-primary/5 shadow-sm",
                    !isImported && !isSelected && "hover:border-primary/40"
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <label className="flex flex-1 items-start gap-3 text-left">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => !isImported && toggleExpression(index)}
                        disabled={isImported}
                        className="mt-1"
                      />
                      <div className="space-y-1">
                        <p className="text-sm font-semibold capitalize">
                          {expr.category === "definition" ? "Definition" : expr.category}
                        </p>
                        <p className="text-xs text-muted-foreground">{expr.description}</p>
                      </div>
                    </label>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary" className="text-[11px] capitalize">
                        {expr.category}
                      </Badge>
                      {isImported && (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Imported
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 rounded-md border bg-muted/40 p-2">
                    <MathInput
                      value={currentLatex}
                      onChange={latex => handleLatexChange(index, latex)}
                      className="text-sm"
                      disabled={isImported}
                    />
                  </div>
                  {hasDeps && (
                    <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px] text-amber-600">
                      <AlertCircle className="h-3 w-3" />
                      <span>Requires: {expr.dependencies!.map(dep => `${dep}()`).join(", ")}</span>
                    </div>
                  )}
                </div>
              );
            })}
            {toolkit.expressions.length === 0 && (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                This toolkit does not expose any expressions yet.
              </div>
            )}
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/30 px-4 py-3">
          {hasSelection ? (
            <Alert className="flex-1">
              <AlertDescription className="text-xs">
                {autoImportDeps
                  ? `Ready to import ${selectedCount} expression${selectedCount === 1 ? "" : "s"} plus required dependencies.`
                  : "Dependencies will not be imported automatically."}
              </AlertDescription>
            </Alert>
          ) : (
            <span className="flex-1 text-xs text-muted-foreground">
              Select expressions to add them to your workspace library.
            </span>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={!hasSelection}>
              Import {hasSelection ? `(${selectedCount})` : ""}
            </Button>
          </div>
        </footer>
      </section>
    </div>
  );
}
