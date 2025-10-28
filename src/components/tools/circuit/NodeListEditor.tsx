import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CANONICAL_GROUND, sanitizeIdentifier } from "@/lib/circuits/editorModel";

export interface NodeListEditorProps {
  nodes: string[];
  lockedNodes: Set<string>;
  selectedNodeIds: ReadonlySet<string>;
  onRename: (nodeId: string, nextName: string) => void;
  onRemove: (nodeId: string) => void;
}

export const NodeListEditor = ({
  nodes,
  lockedNodes,
  selectedNodeIds,
  onRename,
  onRemove,
}: NodeListEditorProps) => {
  if (nodes.length === 0) {
    return null;
  }
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>Nodes</span>
        <span>{nodes.length}</span>
      </div>
      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
        {nodes.map(node => {
          const isGround = node.toLowerCase() === "gnd" || node === "0";
          const isConnected = lockedNodes.has(node);
          const isSelected = selectedNodeIds.has(node);
          return (
            <div key={node} className="flex items-center gap-2 text-xs">
              <Input
                className={cn(
                  "h-8 flex-1 text-xs",
                  isSelected && !isGround ? "border-primary bg-primary/10" : undefined
                )}
                defaultValue={node}
                readOnly={isGround}
                onBlur={event => {
                  const next = event.target.value.trim();
                  const sanitized = sanitizeIdentifier(next);
                  const isUnchanged = sanitized === node || sanitized.length === 0;
                  const hasConflict = nodes.some(
                    other => other !== node && other.toLowerCase() === sanitized.toLowerCase()
                  );

                  if (isGround || isUnchanged || hasConflict) {
                    event.target.value = node;
                    return;
                  }

                  event.target.value = sanitized;
                  onRename(node, sanitized);
                }}
              />
              <Button
                size="icon"
                variant="ghost"
                className={cn("h-8 w-8", isConnected && !isGround ? "text-destructive" : undefined)}
                disabled={isConnected}
                onClick={() => onRemove(node)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Removing a connected node also removes its attached components.
      </p>
    </div>
  );

};
