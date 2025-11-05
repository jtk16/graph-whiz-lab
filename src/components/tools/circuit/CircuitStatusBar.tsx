import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MousePointer2, PenTool, Ruler } from "lucide-react";

type ModeDescriptor = "select" | "wire";

export interface CircuitStatusBarProps {
  mode: ModeDescriptor;
  gridSize: number;
  snapEnabled: boolean;
  cursorPosition: { x: number; y: number } | null;
  statusMessage: string;
  showWarning?: string | null;
}

const MODE_LABELS: Record<ModeDescriptor, { label: string; icon: React.ReactNode }> = {
  select: {
    label: "Select",
    icon: <MousePointer2 className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  wire: {
    label: "Wire",
    icon: <PenTool className="h-3.5 w-3.5" aria-hidden="true" />,
  },
};

const MODE_HINTS: Record<ModeDescriptor, string> = {
  select: "Click to select components. Drag to marquee. Hold Space to pan.",
  wire: "Click to start routing. Shift locks 45°. Backspace removes last segment. Esc cancels.",
};

export function CircuitStatusBar({
  mode,
  gridSize,
  snapEnabled,
  cursorPosition,
  statusMessage,
  showWarning,
}: CircuitStatusBarProps) {
  const modeDescriptor = MODE_LABELS[mode];
  const hint = MODE_HINTS[mode];
  const cursorLabel = cursorPosition
    ? `(${cursorPosition.x.toFixed(1)}, ${cursorPosition.y.toFixed(1)})`
    : "(-, -)";

  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white/90 px-4 py-2 text-xs text-slate-600 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 font-medium text-slate-700">
          <span className={cn("inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1")}>
            {modeDescriptor.icon}
            <span className="text-[11px] uppercase tracking-wide">{modeDescriptor.label}</span>
          </span>
        </span>
        <Badge variant="outline" className="font-mono text-[10px] uppercase">
          Snap: {snapEnabled ? "Grid" : "Free"}
        </Badge>
        <Badge variant="outline" className="font-mono text-[10px]">
          Grid {gridSize}px
        </Badge>
        <Badge variant="outline" className="flex items-center gap-1 font-mono text-[10px]">
          <Ruler className="h-3 w-3" aria-hidden="true" />
          {cursorLabel}
        </Badge>
      </div>
      <div className="flex-1 truncate text-center text-[11px] text-slate-600">{hint}</div>
      <div className="flex items-center gap-2">
        {showWarning && (
          <Badge variant="destructive" className="font-medium text-[11px]">
            {showWarning}
          </Badge>
        )}
        <span className="max-w-md truncate text-[11px] font-medium text-slate-700">{statusMessage}</span>
      </div>
    </footer>
  );
}

