import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CANONICAL_GROUND, sanitizeIdentifier } from "@/lib/circuits/editorModel";

export interface NodeListEditorProps {
  nodes: string[];
  connectionCounts: Record<string, number>;
  selectedNodeIds: ReadonlySet<string>;
  onRename: (nodeId: string, nextName: string) => void;
  onRemove: (nodeId: string) => void;
}

export const NodeListEditor = ({
  nodes,
  connectionCounts,
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
        <span>Junctions</span>
        <span>{nodes.length}</span>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {nodes.map(node => {
          const isGround = node.toLowerCase() === "gnd" || node === "0";
          const isCanonicalGround = node === CANONICAL_GROUND;
          const isSelected = selectedNodeIds.has(node);
          const connectionCount = connectionCounts[node] ?? 0;
          const hasConnections = connectionCount > 0;
          return (
            <div key={node} className="flex items-center gap-2 text-xs">
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Input
                    className={cn(
                      "h-8 flex-1 text-xs",
                      isGround ? "font-semibold uppercase tracking-wide text-cyan-400" : undefined,
                      isSelected ? "border-primary bg-primary/10" : undefined
                    )}
                    defaultValue={node}
                    readOnly={isCanonicalGround}
                    onBlur={event => {
                      const next = event.target.value.trim();
                      const sanitized = sanitizeIdentifier(next);
                      const isUnchanged = sanitized === node || sanitized.length === 0;
                      const hasConflict = nodes.some(
                        other => other !== node && other.toLowerCase() === sanitized.toLowerCase()
                      );

                      if (isCanonicalGround || isUnchanged || hasConflict) {
                        event.target.value = node;
                        return;
                      }

                      event.target.value = sanitized;
                      onRename(node, sanitized);
                    }}
                  />
                  <Badge variant={hasConnections ? "secondary" : "outline"} className="font-mono text-[11px]">
                    {connectionCount.toString().padStart(2, "0")}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {hasConnections
                    ? `${connectionCount} connection${connectionCount === 1 ? "" : "s"} attached`
                    : "Unconnected junction"}
                </p>
              </div>
              <Button
                size="icon"
                variant={hasConnections ? "destructive" : "ghost"}
                className="h-8 w-8"
                title={hasConnections ? `Delete ${node} and attached components` : `Delete ${node}`}
                onClick={() => onRemove(node)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Removing a junction will also remove any components attached to it.
      </p>
    </div>
  );
};
