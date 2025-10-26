import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import { Toolkit, ToolkitExpression } from "@/lib/toolkits/types";
import { MathInput } from "./MathInput";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['definition', 'function', 'operator']));

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

    if (autoImportDeps) {
      const neededDeps = new Set<string>();
      const selectedIndices = new Set(selected);

      expressionsToImport.forEach(expr => {
        if (expr.dependencies && expr.dependencies.length > 0) {
          expr.dependencies.forEach(dep => neededDeps.add(dep));
        }
      });

      let foundNewDeps = true;
      while (foundNewDeps) {
        foundNewDeps = false;

        toolkit.expressions.forEach((expr, idx) => {
          const funcName = expr.normalized.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\(/)?.[1];

          if (funcName && neededDeps.has(funcName) && !selectedIndices.has(idx)) {
            expressionsToImport.push(expr);
            selectedIndices.add(idx);
            foundNewDeps = true;

            expr.dependencies?.forEach(dep => {
              neededDeps.add(dep);
            });
          }
        });
      }
    }

    onConfirm(expressionsToImport);
  };

  const isAlreadyImported = (normalized: string): boolean => {
    return importedExpressions.some(ie => ie.normalized === normalized);
  };

  const selectedCount = selected.size;
  const hasSelection = selectedCount > 0;

  const alreadyImportedCount = useMemo(
    () => toolkit.expressions.filter(expr => isAlreadyImported(expr.normalized)).length,
    [toolkit.expressions, importedExpressions]
  );

  // Group expressions by category
  const expressionsByCategory = useMemo(() => {
    const groups = new Map<string, Array<{ expr: typeof toolkit.expressions[0], index: number }>>();
    toolkit.expressions.forEach((expr, index) => {
      const category = expr.category;
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push({ expr, index });
    });
    return groups;
  }, [toolkit.expressions]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getCategoryStats = (category: string) => {
    const items = expressionsByCategory.get(category) || [];
    const available = items.filter(({ expr }) => !isAlreadyImported(expr.normalized)).length;
    const selectedInCat = items.filter(({ index }) => selected.has(index)).length;
    return { total: items.length, available, selected: selectedInCat };
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{toolkit.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{toolkit.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md border bg-card p-2">
            <div className="text-2xl font-bold">{toolkit.expressions.length}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="rounded-md border bg-card p-2">
            <div className="text-2xl font-bold">{toolkit.expressions.length - alreadyImportedCount}</div>
            <div className="text-xs text-muted-foreground">Available</div>
          </div>
          <div className="rounded-md border bg-card p-2">
            <div className="text-2xl font-bold text-primary">{selectedCount}</div>
            <div className="text-xs text-muted-foreground">Selected</div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAll}>
              Clear
            </Button>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={autoImportDeps}
              onCheckedChange={checked => setAutoImportDeps(checked === true)}
            />
            Auto-import dependencies
          </label>
        </div>
      </div>

      {/* Expression List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {Array.from(expressionsByCategory.entries()).map(([category, items]) => {
            const stats = getCategoryStats(category);
            const isExpanded = expandedCategories.has(category);

            return (
              <Collapsible
                key={category}
                open={isExpanded}
                onOpenChange={() => toggleCategory(category)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 hover:bg-muted/60 transition-colors">
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium capitalize">{category}</span>
                      <Badge variant="secondary" className="text-xs">
                        {stats.total}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {stats.selected > 0 && (
                        <span className="text-primary font-medium">{stats.selected} selected</span>
                      )}
                      <span>{stats.available} available</span>
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent className="mt-2 space-y-2 pl-2">
                  {items.map(({ expr, index }) => {
                    const isImported = isAlreadyImported(expr.normalized);
                    const isSelected = selected.has(index);
                    const hasDeps = Boolean(expr.dependencies?.length);
                    const currentLatex = editedExpressions.get(index) || expr.latex;

                    return (
                      <div
                        key={index}
                        className={cn(
                          "rounded-lg border bg-card p-3 transition-all",
                          isImported && "opacity-50 cursor-not-allowed",
                          !isImported && isSelected && "border-primary bg-primary/5 shadow-sm",
                          !isImported && !isSelected && "hover:border-muted-foreground/20"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => !isImported && toggleExpression(index)}
                            disabled={isImported}
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm text-muted-foreground">{expr.description}</p>
                              {isImported && (
                                <Badge variant="outline" className="gap-1 text-xs text-emerald-600 border-emerald-600/20">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Imported
                                </Badge>
                              )}
                            </div>

                            <div className="rounded-md border bg-muted/30 p-2">
                              <MathInput
                                value={currentLatex}
                                onChange={latex => handleLatexChange(index, latex)}
                                disabled={isImported}
                              />
                            </div>

                            {hasDeps && (
                              <div className="flex items-center gap-1 text-xs text-amber-600">
                                <AlertCircle className="h-3 w-3" />
                                <span>Requires: {expr.dependencies!.join(", ")}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t bg-muted/20 px-4 py-3 flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {hasSelection ? (
            <span>
              {selectedCount} expression{selectedCount !== 1 ? "s" : ""} selected
              {autoImportDeps && " (+ dependencies)"}
            </span>
          ) : (
            <span>Select expressions to import</span>
          )}
        </div>
        <div className="flex gap-2">
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
