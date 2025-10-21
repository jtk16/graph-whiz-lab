import { X, Trash2, Badge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolkitExpression } from "@/lib/toolkits/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MathInput } from "./MathInput";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  if (definitions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Badge className="h-12 w-12 mb-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No toolkit definitions imported yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Import a toolkit to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className="h-4 w-4" />
          <h2 className="text-sm font-semibold">Toolkit Definitions</h2>
          <span className="text-xs text-muted-foreground">({definitions.length})</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-7 text-xs"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Clear All
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {definitions.map((def) => (
            <TooltipProvider key={def.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="group relative bg-accent/30 border rounded-lg p-2 hover:bg-accent/50 transition-colors">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <MathInput
                          value={def.latex}
                          onChange={(latex) => onUpdate(def.id, latex)}
                          className="text-sm"
                        />
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                            {def.source}
                          </span>
                          {def.isModified && (
                            <span className="text-xs text-muted-foreground italic">
                              (modified)
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onRemove(def.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs bg-popover">
                  <p className="text-sm">{def.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Type: {def.category}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
