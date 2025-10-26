import { useEffect, useMemo, useRef, useState } from "react";
import { ToolProps } from "@/lib/tools/types";
import {
  CircuitComponent,
  SimulationResult,
  simulateCircuit,
} from "@/lib/circuits/simulator";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Pause, Play, Upload, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { solveSymbolicCircuit } from "@/lib/circuits/symbolic";

type CircuitKind = CircuitComponent["kind"];

interface NewComponentState {
  kind: CircuitKind;
  from: string;
  to: string;
  value: number;
  waveform: "dc" | "ac";
  amplitude: number;
  frequency: number;
  phase: number;
  offset: number;
}

const DEFAULT_COMPONENTS: CircuitComponent[] = [
  {
    id: "vs1",
    kind: "voltage-source",
    from: "vin",
    to: "gnd",
    waveform: "dc",
    value: 5,
  },
  {
    id: "r1",
    kind: "resistor",
    from: "vin",
    to: "gnd",
    value: 1000,
  },
];

const DEFAULT_NEW_COMPONENT: NewComponentState = {
  kind: "resistor",
  from: "vin",
  to: "gnd",
  value: 1000,
  waveform: "dc",
  amplitude: 5,
  frequency: 60,
  phase: 0,
  offset: 0,
};

const DEFAULT_SIM = {
  dt: 0.0005,
  duration: 0.1,
};

const COMPONENT_KINDS: CircuitKind[] = ["voltage-source", "resistor", "capacitor", "inductor", "wire"];

const sanitizeIdentifier = (raw: string): string => {
  const cleaned = raw.replace(/[^a-zA-Z0-9]/g, "");
  if (!cleaned) return "signal";
  return /^[a-zA-Z]/.test(cleaned) ? cleaned : `n${cleaned}`;
};

export function CircuitTool({ isActive }: ToolProps) {
  const [components, setComponents] = useState<CircuitComponent[]>(DEFAULT_COMPONENTS);
  const [newComponent, setNewComponent] = useState<NewComponentState>(DEFAULT_NEW_COMPONENT);
  const [simConfig, setSimConfig] = useState(DEFAULT_SIM);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [status, setStatus] = useState<string>("");
  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const playRef = useRef<number | null>(null);
  const symbolicResult = useMemo(() => {
    try {
      return solveSymbolicCircuit(components);
    } catch {
      return { nodeVoltages: {}, branchCurrents: {}, variables: [] };
    }
  }, [components]);

  useEffect(() => {
    if (!isPlaying || !result) {
      if (playRef.current) {
        cancelAnimationFrame(playRef.current);
        playRef.current = null;
      }
      return;
    }
    const tick = () => {
      setPlayhead(prev => {
        const next = prev + 1;
        if (!result) return prev;
        return next >= result.time.length ? 0 : next;
      });
      playRef.current = requestAnimationFrame(tick);
    };
    playRef.current = requestAnimationFrame(tick);
    return () => {
      if (playRef.current) {
        cancelAnimationFrame(playRef.current);
        playRef.current = null;
      }
    };
  }, [isPlaying, result]);

  useEffect(() => {
    if (!isActive && isPlaying) {
      setIsPlaying(false);
    }
  }, [isActive, isPlaying]);

  const nodeList = useMemo(() => {
    const nodes = new Set<string>();
    if (result) {
      Object.keys(result.nodeVoltages).forEach(node => nodes.add(node));
    }
    Object.keys(symbolicResult.nodeVoltages).forEach(node => nodes.add(node));
    return Array.from(nodes);
  }, [result, symbolicResult]);

  const addComponent = () => {
    const id = `${newComponent.kind}-${Date.now().toString(36)}`;
    const base: CircuitComponent = {
      id,
      kind: newComponent.kind,
      from: newComponent.from || "vin",
      to: newComponent.to || "gnd",
      value: Math.max(newComponent.value || 1, 1e-6),
    } as CircuitComponent;
    let component: CircuitComponent = base;
    if (newComponent.kind === "voltage-source") {
      component = {
        ...base,
        kind: "voltage-source",
        waveform: newComponent.waveform,
        value: newComponent.waveform === "dc" ? newComponent.value : newComponent.amplitude,
        amplitude: newComponent.waveform === "ac" ? newComponent.amplitude : undefined,
        frequency: newComponent.waveform === "ac" ? newComponent.frequency : undefined,
        phase: newComponent.waveform === "ac" ? newComponent.phase : undefined,
        offset: newComponent.waveform === "ac" ? newComponent.offset : undefined,
      };
    }
    setComponents(prev => [...prev, component]);
  };

  const removeComponent = (id: string) => {
    setComponents(prev => prev.filter(comp => comp.id !== id));
  };

  const simulate = () => {
    try {
      const res = simulateCircuit(components, simConfig);
      setResult(res);
      setPlayhead(0);
      setStatus(`Simulated ${res.time.length} steps (${simConfig.duration}s)`);
    } catch (error) {
      setResult(null);
      setStatus(error instanceof Error ? error.message : "Simulation failed");
    }
  };

  const exportExpression = (node: string, kind: "voltage" | "current") => {
    if (!result) return;
    const time = result.time;
    const values =
      kind === "voltage" ? result.nodeVoltages[node] : result.nodeCurrents[node];
    if (!values) return;
    const expression = buildPiecewiseExpression(
      time,
      values,
      kind === "voltage" ? `V${node}` : `I${node}`
    );
    window.dispatchEvent(
      new CustomEvent("circuit:add-expression", {
        detail: {
          latex: expression,
          normalized: expression,
        },
      })
    );
    setStatus(`Exported ${kind} expression for node ${node}`);
  };

  const currentTime = result ? result.time[playhead] : 0;

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-4">
      <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
        <Card className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Simulation Settings</h3>
            <Button size="sm" onClick={simulate}>
              Run
            </Button>
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <Label>Time Step (s)</Label>
              <Input
                type="number"
                step="0.0001"
                value={simConfig.dt}
                onChange={e =>
                  setSimConfig(prev => ({
                    ...prev,
                    dt: Math.max(parseFloat(e.target.value) || DEFAULT_SIM.dt, 1e-6),
                  }))
                }
              />
            </div>
            <div>
              <Label>Duration (s)</Label>
              <Input
                type="number"
                step="0.01"
                value={simConfig.duration}
                onChange={e =>
                  setSimConfig(prev => ({
                    ...prev,
                    duration: Math.max(parseFloat(e.target.value) || DEFAULT_SIM.duration, prev.dt),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Playback</Label>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setIsPlaying(prev => !prev)}
                  disabled={!result}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Slider
                  value={[playhead]}
                  min={0}
                  max={Math.max((result?.time.length ?? 1) - 1, 1)}
                  step={1}
                  disabled={!result}
                  onValueChange={([value]) => setPlayhead(value)}
                />
                <span className="text-xs text-muted-foreground min-w-[60px] text-right">
                  {currentTime.toFixed(4)}s
                </span>
              </div>
            </div>
            {status && <p className="text-muted-foreground">{status}</p>}
          </div>
          <div className="space-y-3 border-t pt-3">
            <h4 className="text-sm font-semibold">Add Component</h4>
            <div className="grid gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Label className="w-20">Type</Label>
                <Select
                  value={newComponent.kind}
                  onValueChange={value =>
                    setNewComponent(prev => ({
                      ...prev,
                      kind: value as CircuitKind,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPONENT_KINDS.map(kind => (
                      <SelectItem key={kind} value={kind}>
                        {kind}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-20">From</Label>
                <Input
                  value={newComponent.from}
                  onChange={e => setNewComponent(prev => ({ ...prev, from: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-20">To</Label>
                <Input
                  value={newComponent.to}
                  onChange={e => setNewComponent(prev => ({ ...prev, to: e.target.value }))}
                />
              </div>
              {newComponent.kind === "voltage-source" ? (
                <>
                  <div className="flex items-center gap-2">
                    <Label className="w-20">Waveform</Label>
                    <Select
                      value={newComponent.waveform}
                      onValueChange={value =>
                        setNewComponent(prev => ({ ...prev, waveform: value as "dc" | "ac" }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dc">DC</SelectItem>
                        <SelectItem value="ac">AC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {newComponent.waveform === "dc" ? (
                    <div className="flex items-center gap-2">
                      <Label className="w-20">Voltage (V)</Label>
                      <Input
                        type="number"
                        value={newComponent.value}
                        onChange={e =>
                          setNewComponent(prev => ({
                            ...prev,
                            value: parseFloat(e.target.value) || prev.value,
                          }))
                        }
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Label className="w-20">Amplitude</Label>
                        <Input
                          type="number"
                          value={newComponent.amplitude}
                          onChange={e =>
                            setNewComponent(prev => ({
                              ...prev,
                              amplitude: parseFloat(e.target.value) || prev.amplitude,
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="w-20">Frequency</Label>
                        <Input
                          type="number"
                          value={newComponent.frequency}
                          onChange={e =>
                            setNewComponent(prev => ({
                              ...prev,
                              frequency: parseFloat(e.target.value) || prev.frequency,
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="w-20">Phase (rad)</Label>
                        <Input
                          type="number"
                          value={newComponent.phase}
                          onChange={e =>
                            setNewComponent(prev => ({
                              ...prev,
                              phase: parseFloat(e.target.value) || prev.phase,
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="w-20">Offset</Label>
                        <Input
                          type="number"
                          value={newComponent.offset}
                          onChange={e =>
                            setNewComponent(prev => ({
                              ...prev,
                              offset: parseFloat(e.target.value) || prev.offset,
                            }))
                          }
                        />
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Label className="w-20">Value</Label>
                  <Input
                    type="number"
                    value={newComponent.value}
                    onChange={e =>
                      setNewComponent(prev => ({
                        ...prev,
                        value: parseFloat(e.target.value) || prev.value,
                      }))
                    }
                  />
                </div>
              )}
            </div>
            <Button size="sm" onClick={addComponent}>
              Add Component
            </Button>
          </div>
        </Card>
        <Card className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Netlist ({components.length})</h3>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {components.map(component => (
              <div
                key={component.id}
                className="flex items-center justify-between rounded border px-3 py-2 text-xs"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <Badge>{component.kind}</Badge>
                    <span>
                      {component.from}
                      {" -> "}
                      {component.to}
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    {describeComponent(component)}
                  </span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Remove component"
                  onClick={() => removeComponent(component.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {components.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">
                Add components to build a circuit.
              </p>
            )}
          </div>
        </Card>
      </div>
      <Card className="flex-1 space-y-4 p-4 overflow-hidden">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Node Observations</h3>
          <span className="text-xs text-muted-foreground">
            {result ? `${result.time.length} samples` : "Simulate to view data"}
          </span>
        </div>
        {result ? (
          <div className="space-y-3 overflow-auto pr-1">
            {nodeList.length === 0 && (
              <p className="text-xs text-muted-foreground">No non-ground nodes detected.</p>
            )}
            {nodeList.map(node => {
              const voltages = result?.nodeVoltages[node];
              const currents = result?.nodeCurrents[node];
              const vNow = voltages ? voltages[playhead] ?? 0 : 0;
              const iNow = currents ? currents[playhead] ?? 0 : 0;
              return (
                <div
                  key={node}
                  onClick={() => setSelectedNode(node)}
                  className={cn(
                    "flex flex-wrap items-center justify-between rounded border px-3 py-2 text-xs gap-2 cursor-pointer transition-colors",
                    selectedNode === node && "border-primary bg-primary/5"
                  )}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold">{node}</span>
                    <span className="text-muted-foreground">
                      V = {voltages ? vNow.toFixed(4) : "n/a"} V, I = {currents ? iNow.toExponential(3) : "n/a"} A
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!voltages}
                      onClick={e => {
                        e.stopPropagation();
                        exportExpression(node, "voltage");
                      }}
                    >
                      <Upload className="mr-1 h-3 w-3" />
                      V(t)
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!currents}
                      onClick={e => {
                        e.stopPropagation();
                        exportExpression(node, "current");
                      }}
                    >
                      <Upload className="mr-1 h-3 w-3" />
                      I(t)
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Run a simulation to inspect node voltages and currents.
          </div>
        )}
      </Card>
      <Card className="flex-1 p-4">
        {selectedNode ? (
          <NodeDetailPanel
            node={selectedNode}
            result={result}
            playhead={playhead}
            symbolic={symbolicResult.nodeVoltages[selectedNode]}
            onExportNumeric={exportExpression}
            onExportSymbolic={(expression) => {
              window.dispatchEvent(
                new CustomEvent("circuit:add-expression", {
                  detail: {
                    latex: expression,
                    normalized: expression,
                  },
                })
              );
              setStatus(`Exported symbolic expression for ${selectedNode}`);
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Click a node to inspect numeric and symbolic details.
          </div>
        )}
      </Card>
    </div>
  );
}

interface NodeDetailProps {
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

const NodeDetailPanel = ({
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

function describeComponent(component: CircuitComponent): string {
  switch (component.kind) {
    case "resistor":
      return `${component.value} ohms`;
    case "wire":
      return "ideal wire";
    case "capacitor":
      return `${component.value} F`;
    case "inductor":
      return `${component.value} H`;
    case "voltage-source":
      return component.waveform === "ac"
        ? `${component.amplitude ?? component.value} V AC`
        : `${component.value} V DC`;
    default:
      return "";
  }
}

function buildPiecewiseExpression(time: Float32Array, values: Float32Array, label: string): string {
  if (!time.length || !values.length) return "0";
  const identifier = sanitizeIdentifier(label);
  const samples = Math.min(40, time.length);
  const step = Math.max(1, Math.floor(time.length / samples));
  const parts: string[] = [];
  for (let idx = 0; idx < time.length; idx += step) {
    const t = time[idx];
    const v = values[idx];
    parts.push(`t<=${t.toFixed(6)},${v.toFixed(6)}`);
  }
  parts.push(`1,${values[values.length - 1].toFixed(6)}`);
  return `${identifier}(t)=piecewise(${parts.join(",")})`;
}
