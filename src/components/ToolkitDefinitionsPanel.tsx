import { X, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolkitExpression } from "@/lib/toolkits/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MathInput } from "./MathInput";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";

interface ToolkitDefinitionsPanelProps {
  definitions: ToolkitExpression[];
  onUpdate: (id: string, latex: string) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

export function ToolkitDefinitionsPanel({
  definitions,
  onUpdate,
  onRemove,
  onClearAll,
}: ToolkitDefinitionsPanelProps) {
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());

  // Group definitions by source toolkit
  const definitionsBySource = useMemo(() => {
    const groups = new Map<string, ToolkitExpression[]>();
    definitions.forEach(def => {
      if (!groups.has(def.source)) {
        groups.set(def.source, []);
      }
      groups.get(def.source)!.push(def);
    });
    return groups;
  }, [definitions]);

  const toggleSource = (source: string) => {
    const newExpanded = new Set(expandedSources);
    if (newExpanded.has(source)) {
      newExpanded.delete(source);
    } else {
      newExpanded.add(source);
    }
    setExpandedSources(newExpanded);
  };

  if (definitions.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <Package className="h-12 w-12 mb-4 text-muted-foreground/50" />
        <p className="text-sm font-medium text-muted-foreground">No imported definitions</p>
        <p className="text-xs text-muted-foreground mt-1">
          Browse the toolkit library to import expressions
        </p>
      </div>
    );
  }

  return (
    <div className="grid h-full grid-rows-[auto_1fr]">
      {/* Header */}
      <div className="border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Imported Definitions</h2>
            <Badge variant="secondary">{definitions.length}</Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-8 gap-1 text-xs text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Definitions List */}
      <div className="overflow-y-auto p-4 space-y-2">
        {Array.from(definitionsBySource.entries()).map(([source, defs]) => {
          const isExpanded = expandedSources.has(source);

          return (
            <Collapsible
              key={source}
              open={isExpanded}
              onOpenChange={() => toggleSource(source)}
            >
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 hover:bg-muted/60 transition-colors">
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium capitalize">{source.replace(/-/g, " ")}</span>
                    <Badge variant="secondary" className="text-xs">
                      {defs.length}
                    </Badge>
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-2 space-y-2 pl-2">
                {defs.map((def) => (
                  <div
                    key={def.id}
                    className={cn(
                      "group relative rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs text-muted-foreground">{def.description}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => onRemove(def.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="rounded-md border bg-muted/30 p-2">
                          <MathInput
                            value={def.latex}
                            onChange={(latex) => onUpdate(def.id, latex)}
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {def.category}
                          </Badge>
                          {def.isModified && (
                            <span className="text-[10px] text-amber-600 italic">
                              Modified
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
