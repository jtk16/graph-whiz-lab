import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  COMPONENT_LIBRARY,
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
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Component palette</h3>
        <Badge variant="outline" className="font-mono text-[10px] uppercase">
          drag · press hotkey
        </Badge>
      </div>
      <Input
        value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder="Search components…"
        className="h-9 text-xs"
      />
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
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
                "group flex items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left shadow-sm transition",
                "hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300",
                isActive && "border-slate-800 bg-slate-100"
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
          <p className="rounded border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-muted-foreground">
            No components match “{query}”.
          </p>
        )}
      </div>
    </div>
  );
};

function ComponentPreview({ kind }: { kind: CircuitKind }) {
  // Monochrome preview color
  const color = "#111827";
  return (
    <svg viewBox="0 0 100 56" className="h-16 w-full">
      <rect
        x={0}
        y={0}
        width={100}
        height={56}
        rx={8}
        fill="#f8fafc"
        className="stroke-slate-200"
      />
      <g transform="translate(14 28)">
        {renderComponentSymbol(kind, 72, color, 2)}
        <circle cx={0} cy={0} r={3} fill="var(--foreground)" opacity={0.65} />
        <circle cx={72} cy={0} r={3} fill="var(--foreground)" opacity={0.65} />
      </g>
    </svg>
  );
}
