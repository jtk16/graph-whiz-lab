import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Copy, Upload } from "lucide-react";
import type { CircuitComponent, SimulationResult } from "@/lib/circuits/simulator";
import type { DifferentialEquation } from "@/lib/circuits/differentialEquations";
import { sanitizeIdentifier } from "@/lib/circuits/editorModel";
import { toast } from "@/components/ui/use-toast";

export type ShortcutHint = { combo: string; action: string };

export interface NodeDetailProps {
  node: string;
  result: SimulationResult | null;
  playhead: number;
  symbolic?: {
    voltage: string;
    voltageLatex: string;
    current: string;
    currentLatex: string;
  };
  onExportNumeric: (node: string, kind: "voltage" | "current") => void;
  onExportSymbolic: (expression: string) => void;
}

export const NodeDetailPanel = ({
  node,
  result,
  playhead,
  symbolic,
  onExportNumeric,
  onExportSymbolic,
}: NodeDetailProps) => {
  const time = result?.time ?? null;
  const voltageSeries = result?.nodeVoltages[node];
  const currentSeries = result?.nodeCurrents[node];
  const prevIndex = Math.max(playhead - 1, 0);
  const voltageNow = voltageSeries ? voltageSeries[playhead] ?? 0 : 0;
  const voltagePrev = voltageSeries ? voltageSeries[prevIndex] ?? 0 : 0;
  const currentNow = currentSeries ? currentSeries[playhead] ?? 0 : 0;
  const currentPrev = currentSeries ? currentSeries[prevIndex] ?? 0 : 0;
  const timeNow = time ? time[playhead] ?? 0 : 0;
  const voltageSymbolic = symbolic
    ? `${sanitizeIdentifier(`V${node}`)}(s) = ${symbolic.voltage}`
    : null;
  const currentSymbolic = symbolic
    ? `${sanitizeIdentifier(`I${node}`)}(s) = ${symbolic.current}`
    : null;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">Node {node}</p>
          <p className="text-xs text-muted-foreground">t = {timeNow.toFixed(5)} s</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={!voltageSeries}
            onClick={() => onExportNumeric(node, "voltage")}
          >
            <Upload className="mr-1 h-3 w-3" />
            Export V(t)
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={!currentSeries}
            onClick={() => onExportNumeric(node, "current")}
          >
            <Upload className="mr-1 h-3 w-3" />
            Export I(t)
          </Button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded border p-3 text-xs">
          <p className="text-muted-foreground mb-1 font-semibold">Voltage snapshot</p>
          <p>Now: {voltageSeries ? voltageNow.toFixed(6) : "n/a"} V</p>
          <p>Previous: {voltageSeries ? voltagePrev.toFixed(6) : "n/a"} V</p>
        </div>
        <div className="rounded border p-3 text-xs">
          <p className="text-muted-foreground mb-1 font-semibold">Current snapshot</p>
          <p>Now: {currentSeries ? currentNow.toExponential(4) : "n/a"} A</p>
          <p>Previous: {currentSeries ? currentPrev.toExponential(4) : "n/a"} A</p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <MiniChart label="Voltage over time" time={time} values={voltageSeries} color="hsl(var(--chart-1))" />
        <MiniChart label="Current over time" time={time} values={currentSeries} color="hsl(var(--chart-2))" />
      </div>
      <div className="rounded border p-3 text-xs space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground font-semibold">Symbolic nodal analysis</p>
          <div className="flex gap-2">
            {voltageSymbolic && (
              <Button size="sm" variant="outline" onClick={() => onExportSymbolic(voltageSymbolic)}>
                <Upload className="mr-1 h-3 w-3" />
                Export V(s)
              </Button>
            )}
            {currentSymbolic && (
              <Button size="sm" variant="outline" onClick={() => onExportSymbolic(currentSymbolic)}>
                <Upload className="mr-1 h-3 w-3" />
                Export I(s)
              </Button>
            )}
          </div>
        </div>
        {symbolic ? (
          <div className="space-y-2 font-mono">
            <div>
              <p className="text-muted-foreground">Voltage:</p>
              <p>{voltageSymbolic}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Current:</p>
              <p>{currentSymbolic}</p>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">Symbolic solution unavailable for this node.</p>
        )}
      </div>
    </div>
  );
};

interface TimeStepSnapshotProps {
  result: SimulationResult | null;
  components: CircuitComponent[];
  nodeList: string[];
  playhead: number;
}

const TimeStepSnapshot = ({ result, components, nodeList, playhead }: TimeStepSnapshotProps) => {
  if (!result) {
    return <p className="text-xs text-muted-foreground">Run a simulation to inspect time-step values.</p>;
  }

  const timeValue = result.time[playhead] ?? 0;

  const nodeRows = nodeList.filter(node => node !== CANONICAL_GROUND).map(node => {
    const values = result.nodeVoltages[node];
    if (!values) {
      return null;
    }
    const voltage = values[playhead] ?? 0;
    return { node, voltage };
  }).filter(Boolean) as Array<{ node: string; voltage: number }>;

  const componentRows = components
    .filter(component => component.kind !== "ground")
    .map(component => {
      const currents = result.componentCurrents[component.id];
      if (!currents) {
        return null;
      }
      return { id: component.id, current: currents[playhead] ?? 0 };
    })
    .filter(Boolean) as Array<{ id: string; current: number }>;

  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center justify-between text-muted-foreground">
        <span>t = {timeValue.toFixed(6)} s</span>
        <span>{result.time.length} samples</span>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <div className="rounded border px-3 py-2">
          <p className="mb-1 text-[11px] font-semibold text-muted-foreground">Node voltages</p>
          {nodeRows.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No nodes available.</p>
          ) : (
            <ul className="space-y-1">
              {nodeRows.map(row => (
                <li key={row.node} className="flex justify-between font-mono text-[11px]">
                  <span>{row.node}</span>
                  <span>{row.voltage.toFixed(4)} V</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded border px-3 py-2">
          <p className="mb-1 text-[11px] font-semibold text-muted-foreground">Branch currents</p>
          {componentRows.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No components to report.</p>
          ) : (
            <ul className="space-y-1">
              {componentRows.map(row => (
                <li key={row.id} className="flex justify-between font-mono text-[11px]">
                  <span>{row.id}</span>
                  <span>{row.current.toFixed(6)} A</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

interface DifferentialEquationListProps {
  equations: DifferentialEquation[];
}

export const DifferentialEquationList = ({ equations }: DifferentialEquationListProps) => {
  if (!equations.length) {
    return (
      <p className="text-xs text-muted-foreground">
        Add reactive elements or sources to generate symbolic equations.
      </p>
    );
  }

  const copyValue = async (value: string, label: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(value);
      toast({
        title: "Copied to clipboard",
        description: label,
      });
    } catch (error) {
      console.error("Failed to copy differential equation", error);
    }
  };

  return (
    <Accordion type="single" collapsible className="w-full space-y-2">
      {equations.map(eq => (
        <AccordionItem key={eq.id} value={eq.id} className="overflow-hidden rounded border">
          <AccordionTrigger className="px-3 py-2 text-left text-sm font-semibold">
            {eq.label}
          </AccordionTrigger>
          <AccordionContent className="space-y-3 px-3 pb-3 pt-0 text-xs">
            <div className="flex items-start justify-between gap-2">
              <p className="font-mono text-[11px] leading-relaxed">{eq.plain}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label={`Copy ${eq.label} equation`}
                onClick={() => copyValue(eq.plain, `${eq.label} equation`)}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="rounded bg-muted/30 px-2 py-1 font-mono text-[11px] leading-relaxed text-muted-foreground">
              {eq.latex}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

export const ShortcutLegend = ({ items }: { items: ShortcutHint[] }) => (
  <div className="space-y-1 text-xs">
    {items.map(item => (
      <div
        key={item.combo}
        className="flex items-center gap-3 rounded border px-2 py-1"
      >
        <Badge variant="secondary" className="font-mono text-[11px]">
          {item.combo}
        </Badge>
        <span className="text-muted-foreground">{item.action}</span>
      </div>
    ))}
  </div>
);

export const TipsList = ({ tips }: { tips: string[] }) => (
  <ul className="space-y-1 text-xs text-muted-foreground">
    {tips.map(tip => (
      <li key={tip} className="flex items-start gap-2">
        <span className="mt-[2px] text-[10px]">-</span>
        <span>{tip}</span>
      </li>
    ))}
  </ul>
);

interface MiniChartProps {
  label: string;
  time: Float32Array | null;
  values: Float32Array | undefined;
  color: string;
}

const MiniChart = ({ label, time, values, color }: MiniChartProps) => {
  if (!time || !values || values.length === 0) {
    return (
      <div className="flex h-24 flex-col items-center justify-center rounded border text-xs text-muted-foreground">
        <span>{label}</span>
        <span>No data</span>
      </div>
    );
  }
  const width = 260;
  const height = 90;
  const sampleCount = Math.min(values.length, 200);
  const step = Math.max(1, Math.floor(values.length / sampleCount));
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < values.length; i += step) {
    const v = values[i];
    if (Number.isFinite(v)) {
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    min = min === Infinity ? 0 : min - 1;
    max = max === -Infinity ? 1 : max + 1;
  }
  const range = max - min || 1;
  const pts: string[] = [];
  const denom = Math.max(values.length - 1, 1);
  for (let i = 0; i < values.length; i += step) {
    const x = (i / denom) * width;
    const normalized = (values[i] - min) / range;
    const y = height - normalized * height;
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return (
    <div className="rounded border p-3">
      <p className="mb-2 text-xs text-muted-foreground">{label}</p>
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          points={pts.join(" ")}
        />
      </svg>
    </div>
  );
};

