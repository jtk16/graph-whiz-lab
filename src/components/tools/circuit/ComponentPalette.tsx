import { Badge } from "@/components/ui/badge";
import {
  COMPONENT_LIBRARY,
  COMPONENT_COLORS,
  CircuitKind,
  componentGlyph as getComponentGlyph,
} from "@/lib/circuits/editorModel";
import { cn } from "@/lib/utils";
import { DRAG_DATA_KIND } from "./constants";
import { renderComponentSymbol } from "./utils";

export interface ComponentPaletteProps {
  selectedKind: CircuitKind;
  onSelect: (kind: CircuitKind) => void;
}

export const ComponentPalette = ({ selectedKind, onSelect }: ComponentPaletteProps) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Component library</h3>
        <p className="text-xs text-muted-foreground">
          Tap a symbol to stage it, then wire it between snapped nodes.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {COMPONENT_LIBRARY.map(definition => {
          const isActive = definition.kind === selectedKind;
          return (
            <button
              key={definition.kind}
              type="button"
              onClick={() => onSelect(definition.kind)}
              aria-pressed={isActive}
              draggable
              onDragStart={event => {
                event.dataTransfer.setData(DRAG_DATA_KIND, definition.kind);
                event.dataTransfer.setData("text/plain", definition.kind);
                event.dataTransfer.effectAllowed = "copy";
              }}
              className={cn(
                "group flex h-full flex-col gap-2 rounded-lg border bg-background/60 p-3 text-left transition",
                "hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isActive && "border-primary bg-primary/10"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{definition.label}</span>
                <Badge variant="secondary" className="font-mono">
                  {getComponentGlyph(definition.kind)}
                </Badge>
              </div>
              <ComponentPreview kind={definition.kind} />
              <p className="text-[11px] leading-snug text-muted-foreground">
                {definition.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ComponentPreview({ kind }: { kind: CircuitKind }) {
  const color = COMPONENT_COLORS[kind] ?? "rgba(148,163,184,0.8)";
  return (
    <svg viewBox="0 0 100 56" className="h-16 w-full">
      <rect
        x={0}
        y={0}
        width={100}
        height={56}
        rx={8}
        fill="var(--muted)"
        className="opacity-10"
      />
      <g transform="translate(14 28)">
        {renderComponentSymbol(kind, 72, color, 2)}
        <circle cx={0} cy={0} r={3} fill="var(--foreground)" opacity={0.65} />
        <circle cx={72} cy={0} r={3} fill="var(--foreground)" opacity={0.65} />
      </g>
    </svg>
  );
};
