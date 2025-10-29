import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  COMPONENT_LIBRARY,
  COMPONENT_COLORS,
  CircuitKind,
  componentGlyph as getComponentGlyph,
  hotkeyToKind,
} from "@/lib/circuits/editorModel";
import { cn } from "@/lib/utils";
import { DRAG_DATA_KIND } from "./constants";
import { renderComponentSymbol } from "./utils";

export interface ComponentPaletteProps {
  selectedKind: CircuitKind;
  onSelect: (kind: CircuitKind) => void;
}

const HOTKEY_BY_KIND: Partial<Record<CircuitKind, string>> = Object.entries(hotkeyToKind).reduce(
  (acc, [key, kind]) => {
    acc[kind] = key.toUpperCase();
    return acc;
  },
  {} as Partial<Record<CircuitKind, string>>
);

export const ComponentPalette = ({ selectedKind, onSelect }: ComponentPaletteProps) => {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return COMPONENT_LIBRARY;
    return COMPONENT_LIBRARY.filter(definition => {
      return (
        definition.label.toLowerCase().includes(normalized) ||
        definition.kind.toLowerCase().includes(normalized) ||
        definition.description.toLowerCase().includes(normalized)
      );
    });
  }, [query]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Component palette</h3>
        <Badge variant="outline" className="font-mono text-[10px] uppercase">
          drag · press hotkey
        </Badge>
      </div>
      <Input
        value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder="Search components…"
        className="h-8 text-xs"
      />
      <div className="space-y-2">
        {filtered.map(definition => {
          const isActive = definition.kind === selectedKind;
          const hotkey = HOTKEY_BY_KIND[definition.kind];
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
                "group flex items-center justify-between gap-3 rounded-lg border border-slate-800/60 bg-slate-950/50 px-3 py-2 text-left transition",
                "hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isActive && "border-primary bg-primary/10"
              )}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-[11px]">
                    {getComponentGlyph(definition.kind)}
                  </Badge>
                  <span className="text-sm font-semibold">{definition.label}</span>
                  {hotkey && (
                    <Badge variant="outline" className="font-mono text-[10px] uppercase">
                      {hotkey}
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  {definition.description}
                </p>
              </div>
              <div className="hidden w-28 shrink-0 sm:block">
                <ComponentPreview kind={definition.kind} />
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="rounded border border-dashed border-slate-800/60 bg-slate-950/50 px-3 py-2 text-xs text-muted-foreground">
            No components match “{query}”.
          </p>
        )}
      </div>
    </div>
  );
};

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
}
