import { useEffect, useMemo, useRef, useState, useId } from "react";
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

type NodePosition = { x: number; y: number };

const CANVAS_WIDTH = 760;
const CANVAS_HEIGHT = 360;
const NODE_MARGIN = 32;

const defaultNodePosition = (index: number): NodePosition => {
  const angle = (index / Math.max(1, index + 2)) * Math.PI * 2;
  const radiusX = (CANVAS_WIDTH / 2) - NODE_MARGIN * 2;
  const radiusY = (CANVAS_HEIGHT / 2) - NODE_MARGIN * 2;
  return {
    x: CANVAS_WIDTH / 2 + Math.cos(angle) * radiusX * 0.6,
    y: CANVAS_HEIGHT / 2 + Math.sin(angle) * radiusY * 0.6,
  };
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const extractCircuitNodes = (components: CircuitComponent[]): string[] => {
  const nodes = new Set<string>(["gnd"]);
  components.forEach(component => {
    nodes.add(component.from);
    nodes.add(component.to);
  });
  return Array.from(nodes);
};

const createInitialPositions = (nodes: string[]): Record<string, NodePosition> => {
  const positions: Record<string, NodePosition> = {};
  nodes.forEach((node, index) => {
    positions[node] = defaultNodePosition(index);
  });
  return positions;
};

const generateNodeName = (existing: string[]): string => {
  let index = 1;
  while (true) {
    const candidate = `n${index}`;
    if (!existing.includes(candidate)) {
      return candidate;
    }
    index += 1;
  }
};

const DEFAULT_NODE_NAMES = extractCircuitNodes(DEFAULT_COMPONENTS);

const COMPONENT_COLORS: Record<CircuitKind, string> = {
  resistor: "#f97316",
  capacitor: "#0ea5e9",
  inductor: "#a855f7",
  "voltage-source": "#22c55e",
  wire: "#94a3b8",
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
  const [extraNodes, setExtraNodes] = useState<string[]>([]);
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>(() =>
    createInitialPositions(DEFAULT_NODE_NAMES)
  );
  const [selectingNodeField, setSelectingNodeField] = useState<"from" | "to" | null>(null);
  const playRef = useRef<number | null>(null);
  const symbolicResult = useMemo(() => {
    try {
      return solveSymbolicCircuit(components);
    } catch {
      return { nodeVoltages: {}, branchCurrents: {}, variables: [] };
    }
  }, [components]);

  const circuitNodes = useMemo(() => {
    const nodes = new Set<string>(["gnd"]);
    components.forEach(component => {
      nodes.add(component.from);
      nodes.add(component.to);
    });
    extraNodes.forEach(node => nodes.add(node));
    return Array.from(nodes);
  }, [components, extraNodes]);

  const connectedNodes = useMemo(() => {
    const used = new Set<string>();
    components.forEach(component => {
      used.add(component.from);
      used.add(component.to);
    });
    return used;
  }, [components]);

  useEffect(() => {
    setNodePositions(prev => {
      const next = { ...prev };
      let changed = false;
      Object.keys(next).forEach(key => {
        if (!circuitNodes.includes(key)) {
          delete next[key];
          changed = true;
        }
      });
      circuitNodes.forEach((node, index) => {
        if (!next[node]) {
          next[node] = defaultNodePosition(index);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [circuitNodes]);

  useEffect(() => {
    if (circuitNodes.length === 0) return;
    setNewComponent(prev => {
      let changed = false;
      let nextFrom = prev.from;
      let nextTo = prev.to;
      if (!circuitNodes.includes(nextFrom)) {
        nextFrom = circuitNodes[0];
        changed = true;
      }
      if (!circuitNodes.includes(nextTo)) {
        nextTo = circuitNodes[Math.min(1, circuitNodes.length - 1)] ?? nextFrom;
        changed = true;
      }
      return changed ? { ...prev, from: nextFrom, to: nextTo } : prev;
    });
  }, [circuitNodes]);

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
    const nodes = new Set<string>(circuitNodes);
    if (result) {
      Object.keys(result.nodeVoltages).forEach(node => nodes.add(node));
    }
    Object.keys(symbolicResult.nodeVoltages).forEach(node => nodes.add(node));
    return Array.from(nodes);
  }, [circuitNodes, result, symbolicResult]);

  const handleNodePositionChange = (nodeId: string, position: NodePosition) => {
    setNodePositions(prev => ({
      ...prev,
      [nodeId]: {
        x: clamp(position.x, NODE_MARGIN, CANVAS_WIDTH - NODE_MARGIN),
        y: clamp(position.y, NODE_MARGIN, CANVAS_HEIGHT - NODE_MARGIN),
      },
    }));
  };

  const handleNodeSelect = (nodeId: string) => {
    if (!selectingNodeField) return;
    setNewComponent(prev => ({ ...prev, [selectingNodeField]: nodeId }));
    setSelectingNodeField(null);
  };
  const toggleNodeSelection = (field: "from" | "to") => {
    setSelectingNodeField(prev => (prev === field ? null : field));
  };

  const handleRenameNode = (nodeId: string, nextName: string) => {
    const normalizedName = sanitizeIdentifier(nextName);
    if (!normalizedName || normalizedName === nodeId) {
      return;
    }
    if (nodeId.toLowerCase() === "gnd") {
      return;
    }
    const exists = circuitNodes.some(
      node => node.toLowerCase() === normalizedName.toLowerCase() && node !== nodeId
    );
    if (exists) {
      return;
    }
    setComponents(prev =>
      prev.map(component => ({
        ...component,
        from: component.from === nodeId ? normalizedName : component.from,
        to: component.to === nodeId ? normalizedName : component.to,
      }))
    );
    setNodePositions(prev => {
      const next: Record<string, NodePosition> = { ...prev };
      const current = next[nodeId] ?? defaultNodePosition(0);
      delete next[nodeId];
      next[normalizedName] = current;
      return next;
    });
    setExtraNodes(prev => prev.map(node => (node === nodeId ? normalizedName : node)));
    setNewComponent(prev => ({
      ...prev,
      from: prev.from === nodeId ? normalizedName : prev.from,
      to: prev.to === nodeId ? normalizedName : prev.to,
    }));
    setSelectedNode(prev => (prev === nodeId ? normalizedName : prev));
  };

  const handleRemoveNode = (nodeId: string) => {
    if (nodeId.toLowerCase() === "gnd") {
      return;
    }
    const inUse = components.some(comp => comp.from === nodeId || comp.to === nodeId);
    if (inUse) {
      return;
    }
    setExtraNodes(prev => prev.filter(node => node !== nodeId));
    setNodePositions(prev => {
      const next = { ...prev };
      delete next[nodeId];
      return next;
    });
    setSelectedNode(prev => (prev === nodeId ? null : prev));
    setNewComponent(prev => ({
      ...prev,
      from: prev.from === nodeId ? "gnd" : prev.from,
      to: prev.to === nodeId ? "gnd" : prev.to,
    }));
  };

  const handleAddNode = () => {
    const name = generateNodeName(circuitNodes);
    setExtraNodes(prev => [...prev, name]);
    setNodePositions(prev => ({
      ...prev,
      [name]: defaultNodePosition(Object.keys(prev).length),
    }));
    setNewComponent(prev => ({ ...prev, to: name }));
  };

  const canPlaceComponent = Boolean(newComponent.from && newComponent.to && newComponent.from !== newComponent.to);

  const addComponent = () => {
    if (!canPlaceComponent) return;
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
    setSelectingNodeField(null);
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
      <Card className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Visual Circuit Editor</h3>
            <p className="text-xs text-muted-foreground">
              Drag nodes to arrange your schematic and click to route components.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleAddNode}>
              Add node
            </Button>
          </div>
        </div>
        <CircuitCanvas
          nodes={circuitNodes}
          components={components}
          nodePositions={nodePositions}
          selectingField={selectingNodeField}
          pendingConnection={{ from: newComponent.from, to: newComponent.to }}
          onNodePositionChange={handleNodePositionChange}
          onNodeSelect={handleNodeSelect}
          onNodeFocus={setSelectedNode}
        />
        <NodeListEditor
          nodes={circuitNodes}
          lockedNodes={connectedNodes}
          onRename={handleRenameNode}
          onRemove={handleRemoveNode}
        />
        {selectingNodeField && (
          <p className="rounded bg-primary/5 px-3 py-1 text-xs text-primary">
            Click a node to set the {selectingNodeField === "from" ? "start" : "end"} connection.
          </p>
        )}
        <div className="grid gap-4 text-xs md:grid-cols-2">
          <div className="space-y-2">
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
              <Select
                value={newComponent.from}
                onValueChange={value => setNewComponent(prev => ({ ...prev, from: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {circuitNodes.map(node => (
                    <SelectItem key={node} value={node}>
                      {node}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant={selectingNodeField === "from" ? "default" : "outline"}
                onClick={() => toggleNodeSelection("from")}
              >
                Pick
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Label className="w-20">To</Label>
              <Select
                value={newComponent.to}
                onValueChange={value => setNewComponent(prev => ({ ...prev, to: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {circuitNodes.map(node => (
                    <SelectItem key={node} value={node}>
                      {node}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant={selectingNodeField === "to" ? "default" : "outline"}
                onClick={() => toggleNodeSelection("to")}
              >
                Pick
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {newComponent.kind === "voltage-source" ? (
              <>
                <div className="flex items-center gap-2">
                  <Label className="w-24">Waveform</Label>
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
                    <Label className="w-24">Voltage (V)</Label>
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
                      <Label className="w-24">Amplitude</Label>
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
                      <Label className="w-24">Frequency (Hz)</Label>
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
                      <Label className="w-24">Phase (rad)</Label>
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
                      <Label className="w-24">Offset</Label>
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
                <Label className="w-24">Value</Label>
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
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={addComponent} disabled={!canPlaceComponent}>
            Place component
          </Button>
          <span className="text-xs text-muted-foreground">
            {canPlaceComponent
              ? "Select nodes or use pick mode, then place the component."
              : "Select two distinct nodes to place a component."}
          </span>
        </div>
      </Card>
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

interface CircuitCanvasProps {
  nodes: string[];
  components: CircuitComponent[];
  nodePositions: Record<string, NodePosition>;
  selectingField: "from" | "to" | null;
  pendingConnection?: { from?: string; to?: string };
  onNodePositionChange: (nodeId: string, position: NodePosition) => void;
  onNodeSelect: (nodeId: string) => void;
  onNodeFocus?: (nodeId: string) => void;
}

const CircuitCanvas = ({
  nodes,
  components,
  nodePositions,
  selectingField,
  pendingConnection,
  onNodePositionChange,
  onNodeSelect,
  onNodeFocus,
}: CircuitCanvasProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragMovedRef = useRef(false);
  const [dragState, setDragState] = useState<{
    nodeId: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const rawPatternId = useId();
  const patternId = useMemo(() => rawPatternId.replace(/:/g, "_"), [rawPatternId]);

  const resolvedPositions = useMemo(() => {
    const next: Record<string, NodePosition> = { ...nodePositions };
    nodes.forEach((node, index) => {
      if (!next[node]) {
        next[node] = defaultNodePosition(index);
      }
    });
    return next;
  }, [nodes, nodePositions]);

  const highlightedFrom = pendingConnection?.from;
  const highlightedTo = pendingConnection?.to;

  const beginDrag = (nodeId: string, event: React.PointerEvent<SVGCircleElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const pointerX = (event.clientX - rect.left) * scaleX;
    const pointerY = (event.clientY - rect.top) * scaleY;
    const current = resolvedPositions[nodeId];
    dragMovedRef.current = false;
    setDragState({
      nodeId,
      offsetX: pointerX - current.x,
      offsetY: pointerY - current.y,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const triggerNodeSelection = (nodeId: string) => {
    onNodeFocus?.(nodeId);
    onNodeSelect(nodeId);
  };

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault();
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      dragMovedRef.current = true;
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const pointerX = (event.clientX - rect.left) * scaleX;
      const pointerY = (event.clientY - rect.top) * scaleY;
      const nextPosition = {
        x: pointerX - dragState.offsetX,
        y: pointerY - dragState.offsetY,
      };
      onNodePositionChange(dragState.nodeId, nextPosition);
    };

    const handlePointerUp = () => {
      if (dragState && !dragMovedRef.current) {
        triggerNodeSelection(dragState.nodeId);
      }
      dragMovedRef.current = false;
      setDragState(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState, onNodePositionChange, onNodeFocus, onNodeSelect]);

  const componentStroke = (kind: CircuitKind) => COMPONENT_COLORS[kind] ?? "#94a3b8";
  const componentLabel = (kind: CircuitKind) => {
    switch (kind) {
      case "resistor":
        return "R";
      case "capacitor":
        return "C";
      case "inductor":
        return "L";
      case "voltage-source":
        return "V";
      case "wire":
      default:
        return "W";
    }
  };

  return (
    <div className="rounded-lg border bg-background/80 p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>Drag nodes to arrange the schematic. Click to set endpoints or inspect nodes.</span>
        <span>{nodes.length} nodes</span>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
        className="h-[360px] w-full select-none touch-none"
      >
        <defs>
          <pattern id={patternId} width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(148,163,184,0.25)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />

        {components.map(component => {
          const start = resolvedPositions[component.from];
          const end = resolvedPositions[component.to];
          if (!start || !end || component.from === component.to) {
            return null;
          }
          const midX = (start.x + end.x) / 2;
          const midY = (start.y + end.y) / 2;
          return (
            <g key={component.id}>
              <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={componentStroke(component.kind)}
                strokeWidth={3}
                strokeLinecap="round"
                opacity={0.9}
              />
              <text
                x={midX}
                y={midY - 6}
                textAnchor="middle"
                fill="var(--muted-foreground)"
                fontSize={10}
                fontWeight={600}
              >
                {componentLabel(component.kind)}
              </text>
            </g>
          );
        })}

        {nodes.map(nodeId => {
          const position = resolvedPositions[nodeId];
          const isGround = nodeId.toLowerCase() === "gnd" || nodeId === "0";
          const isActive =
            (selectingField === "from" && highlightedFrom === nodeId) ||
            (selectingField === "to" && highlightedTo === nodeId);
          const ringColor = isActive ? "hsl(var(--primary))" : "rgba(148,163,184,0.8)";
          return (
            <g key={nodeId}>
              <circle
                cx={position.x}
                cy={position.y}
                r={14}
                fill={isGround ? "#0f172a" : "#1e293b"}
                opacity={0.25}
              />
              <circle
                cx={position.x}
                cy={position.y}
                r={10}
                fill={isGround ? "#0f172a" : "#020817"}
                stroke={ringColor}
                strokeWidth={isActive ? 3 : 1.5}
                onPointerDown={event => beginDrag(nodeId, event)}
              />
              <text
                x={position.x}
                y={position.y + 24}
                textAnchor="middle"
                fill="var(--foreground)"
                fontSize={11}
                fontWeight={600}
              >
                {nodeId}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

interface NodeListEditorProps {
  nodes: string[];
  lockedNodes: Set<string>;
  onRename: (nodeId: string, nextName: string) => void;
  onRemove: (nodeId: string) => void;
}

const NodeListEditor = ({ nodes, lockedNodes, onRename, onRemove }: NodeListEditorProps) => {
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
          const removeDisabled = isGround || lockedNodes.has(node);
          return (
            <div key={node} className="flex items-center gap-2 text-xs">
              <Input
                className="h-8 flex-1 text-xs"
                defaultValue={node}
                readOnly={isGround}
                onBlur={event => {
                  const next = event.target.value.trim();
                  if (!next || next === node) {
                    event.target.value = node;
                    return;
                  }
                  onRename(node, next);
                }}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                disabled={removeDisabled}
                onClick={() => onRemove(node)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </div>
      {lockedNodes.size > 0 && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Connected nodes must be disconnected before removal.
        </p>
      )}
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
