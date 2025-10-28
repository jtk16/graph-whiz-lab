import { useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import type { DragEvent } from "react";
import { ToolProps } from "@/lib/tools/types";
import {
  CircuitComponent,
  SimulationResult,
  SimulationMetrics,
  simulateCircuit,
} from "@/lib/circuits/simulator";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  COMPONENT_COLORS,
  COMPONENT_LIBRARY,
  COMPONENT_LOOKUP,
  DEFAULT_NEW_COMPONENT,
  NODE_MARGIN,
  CircuitKind,
  NewComponentState,
  NodePosition,
  SNAP_GRID_SIZE,
  applyNodeSnap,
  clamp,
  componentGlyph as getComponentGlyph,
  createInitialPositions,
  defaultNodePosition,
  extractCircuitNodes,
  generateNodeName,
  gridKeyForPosition,
  hotkeyToKind,
  CANONICAL_GROUND,
  sanitizeIdentifier,
  stageComponentFromKind,
  stageComponentForNodeDrop,
  retargetComponentToNode,
} from "@/lib/circuits/editorModel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Pause, Play, Upload, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { solveSymbolicCircuit } from "@/lib/circuits/symbolic";

const ANCHOR_OFFSET_STEPS = Array.from({ length: 8 }, (_, index) => index + 2);

const shiftAnchoredPosition = (origin: NodePosition, dx: number, dy: number): NodePosition => {
  return applyNodeSnap({
    x: origin.x + dx,
    y: origin.y + dy,
  });
};

const computeAnchoredPosition = (origin: NodePosition, index: number, fallbackIndex: number): NodePosition => {
  if (index === 0) {
    return origin;
  }
  const referenceKey = gridKeyForPosition(origin);
  for (const step of ANCHOR_OFFSET_STEPS) {
    const magnitude = SNAP_GRID_SIZE * step;
    const offsets = [
      { dx: magnitude, dy: 0 },
      { dx: -magnitude, dy: 0 },
      { dx: 0, dy: magnitude },
      { dx: 0, dy: -magnitude },
      { dx: magnitude, dy: SNAP_GRID_SIZE * (step - 1) },
      { dx: -magnitude, dy: SNAP_GRID_SIZE * (step - 1) },
      { dx: SNAP_GRID_SIZE * (step - 1), dy: magnitude },
      { dx: SNAP_GRID_SIZE * (step - 1), dy: -magnitude },
    ];
    for (const { dx, dy } of offsets) {
      const candidate = shiftAnchoredPosition(origin, dx, dy);
      if (gridKeyForPosition(candidate) !== referenceKey) {
        return candidate;
      }
    }
  }
  return defaultNodePosition(fallbackIndex);
};

const AUTO_NODE_VALUE = "__auto__";

type DifferentialEquation = {
  id: string;
  label: string;
  plain: string;
  latex: string;
};


const DEFAULT_COMPONENTS: CircuitComponent[] = [
  {
    id: "g1",
    kind: "ground",
    from: "n0",
    to: CANONICAL_GROUND,
  },
  {
    id: "vs1",
    kind: "voltage-source",
    from: "vin",
    to: "n0",
    waveform: "dc",
    value: 5,
  },
  {
    id: "r1",
    kind: "resistor",
    from: "vin",
    to: "n0",
    value: 1000,
  },
];

const DEFAULT_SIM = {
  dt: 0.0005,
  duration: 0.1,
};

const DRAG_DATA_KIND = "application/x-circuit-kind";
const DRAG_DATA_COMPONENT = "application/x-circuit-component";

const DEFAULT_NODE_NAMES = extractCircuitNodes(DEFAULT_COMPONENTS);

export function CircuitTool({ isActive }: ToolProps) {
  const [components, setComponents] = useState<CircuitComponent[]>(DEFAULT_COMPONENTS);
  const [newComponent, setNewComponent] = useState<NewComponentState>(DEFAULT_NEW_COMPONENT);
  const [simConfig, setSimConfig] = useState(DEFAULT_SIM);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [metrics, setMetrics] = useState<SimulationMetrics | null>(null);
  const [status, setStatus] = useState<string>("");
  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [extraNodes, setExtraNodes] = useState<string[]>([]);
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>(() =>
    createInitialPositions(DEFAULT_NODE_NAMES)
  );
  const [selectingNodeField, setSelectingNodeField] = useState<"from" | "to" | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [hoveredComponentId, setHoveredComponentId] = useState<string | null>(null);
  const playRef = useRef<number | null>(null);
  const symbolicResult = useMemo(() => {
    try {
      return solveSymbolicCircuit(components);
    } catch {
      return { nodeVoltages: {}, branchCurrents: {}, variables: [] };
    }
  }, [components]);

  const differentialEquations = useMemo<DifferentialEquation[]>(() => {
    const equations: DifferentialEquation[] = [];

    const voltageLabel = (node: string) => `V_${sanitizeIdentifier(node)}(t)`;
    const voltageLabelLatex = (node: string) => `V_{${sanitizeIdentifier(node)}}(t)`;
    const currentLabel = (id: string) => `I_${sanitizeIdentifier(id)}(t)`;
    const currentLabelLatex = (id: string) => `I_{${sanitizeIdentifier(id)}}(t)`;
    const toTimeDomainPlain = (expr: string) => expr.replace(/\bs\b/g, "d/dt");
    const toTimeDomainLatex = (expr: string) => expr.replace(/s/g, "\\frac{d}{dt}");

    components.forEach(component => {
      switch (component.kind) {
        case "resistor":
          equations.push({
            id: `res-${component.id}`,
            label: `${component.id} (Resistor)`,
            plain: `${currentLabel(component.id)} = (${voltageLabel(component.from)} - ${voltageLabel(component.to)}) / ${component.value}`,
            latex: `${currentLabelLatex(component.id)} = \\frac{${voltageLabelLatex(component.from)} - ${voltageLabelLatex(component.to)}}{${component.value}}`,
          });
          break;
        case "capacitor":
          equations.push({
            id: `cap-${component.id}`,
            label: `${component.id} (Capacitor)`,
            plain: `${currentLabel(component.id)} = ${component.value} * d/dt (${voltageLabel(component.from)} - ${voltageLabel(component.to)})`,
            latex: `${currentLabelLatex(component.id)} = ${component.value}\\,\\frac{d}{dt}\\left(${voltageLabelLatex(component.from)} - ${voltageLabelLatex(component.to)}\\right)`,
          });
          break;
        case "inductor":
          equations.push({
            id: `ind-${component.id}`,
            label: `${component.id} (Inductor)`,
            plain: `${voltageLabel(component.from)} - ${voltageLabel(component.to)} = ${component.value} * d/dt ${currentLabel(component.id)}`,
            latex: `${voltageLabelLatex(component.from)} - ${voltageLabelLatex(component.to)} = ${component.value}\\,\\frac{d}{dt}${currentLabelLatex(component.id)}`,
          });
          break;
        case "voltage-source": {
          const header = `${component.id} (Voltage Source)`;
          if (component.waveform === "ac") {
            const amplitude = component.amplitude ?? component.value;
            const frequency = component.frequency ?? DEFAULT_NEW_COMPONENT.frequency;
            const phase = component.phase ?? 0;
            const offset = component.offset ?? 0;
            equations.push({
              id: `vs-${component.id}`,
              label: header,
              plain: `${voltageLabel(component.from)} - ${voltageLabel(component.to)} = ${offset} + ${amplitude} * sin(2*pi * ${frequency} * t + ${phase})`,
              latex: `${voltageLabelLatex(component.from)} - ${voltageLabelLatex(component.to)} = ${offset} + ${amplitude}\\sin(2\\pi ${frequency} t + ${phase})`,
            });
          } else {
            equations.push({
              id: `vs-${component.id}`,
              label: header,
              plain: `${voltageLabel(component.from)} - ${voltageLabel(component.to)} = ${component.value}`,
              latex: `${voltageLabelLatex(component.from)} - ${voltageLabelLatex(component.to)} = ${component.value}`,
            });
          }
          break;
        }
        case "current-source": {
          const header = `${component.id} (Current Source)`;
          if (component.waveform === "ac") {
            const amplitude = component.amplitude ?? component.value;
            const frequency = component.frequency ?? DEFAULT_NEW_COMPONENT.frequency;
            const phase = component.phase ?? 0;
            const offset = component.offset ?? 0;
            equations.push({
              id: `is-${component.id}`,
              label: header,
              plain: `${currentLabel(component.id)} = ${offset} + ${amplitude} * sin(2*pi * ${frequency} * t + ${phase})`,
              latex: `${currentLabelLatex(component.id)} = ${offset} + ${amplitude}\\sin(2\\pi ${frequency} t + ${phase})`,
            });
          } else {
            equations.push({
              id: `is-${component.id}`,
              label: header,
              plain: `${currentLabel(component.id)} = ${component.value}`,
              latex: `${currentLabelLatex(component.id)} = ${component.value}`,
            });
          }
          break;
        }
        default:
          break;
      }
    });

    Object.entries(symbolicResult.nodeVoltages).forEach(([node, data]) => {
      if (!data) return;
      const currentExpr = data.current.trim();
      if (currentExpr === "0") {
        return;
      }
      equations.push({
        id: `node-${node}`,
        label: `Node ${node} KCL`,
        plain: `${currentLabel(node)} = ${toTimeDomainPlain(currentExpr)}`,
        latex: `${currentLabelLatex(node)} = ${toTimeDomainLatex(data.currentLatex)}`,
      });
    });

    return equations;
  }, [components, symbolicResult]);

  const circuitNodes = useMemo(() => {
    const nodes = new Set<string>(extractCircuitNodes(components));
    extraNodes.forEach(node => nodes.add(node));
    return Array.from(nodes);
  }, [components, extraNodes]);

  const connectedNodes = useMemo(() => {
    const used = new Set<string>();
    components.forEach(component => {
      if (component.from) {
        used.add(component.from);
      }
      if (component.to) {
        used.add(component.to);
      }
      if (component.kind === "ground") {
        used.add(CANONICAL_GROUND);
      }
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
      if (prev.kind === "ground") {
        if (nextTo !== CANONICAL_GROUND) {
          nextTo = CANONICAL_GROUND;
          changed = true;
        }
      } else if (!circuitNodes.includes(nextTo)) {
        nextTo = circuitNodes[Math.min(1, circuitNodes.length - 1)] ?? nextFrom;
        changed = true;
      }
      return changed ? { ...prev, from: nextFrom, to: nextTo } : prev;
    });
  }, [circuitNodes]);

  useEffect(() => {
    if (selectedComponentId && !components.some(component => component.id === selectedComponentId)) {
      setSelectedComponentId(null);
    }
  }, [components, selectedComponentId]);

  useEffect(() => {
    if (hoveredComponentId && !components.some(component => component.id === hoveredComponentId)) {
      setHoveredComponentId(null);
    }
  }, [components, hoveredComponentId]);

  useEffect(() => {
    if (!hoveredComponentId && selectedComponentId) {
      setHoveredComponentId(selectedComponentId);
    }
  }, [hoveredComponentId, selectedComponentId]);

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

  const selectedComponent = useMemo(
    () => components.find(component => component.id === selectedComponentId) ?? null,
    [components, selectedComponentId]
  );

  const highlightedNodes = useMemo(() => {
    const nodes = new Set<string>();
    if (selectedComponent) {
      nodes.add(selectedComponent.from);
      nodes.add(selectedComponent.to);
    }
    if (selectingNodeField) {
      if (newComponent.from) {
        nodes.add(newComponent.from);
      }
      if (newComponent.to) {
        nodes.add(newComponent.to);
      }
    }
    if (selectedNode) {
      nodes.add(selectedNode);
    }
    return nodes;
  }, [selectedComponent, selectingNodeField, newComponent.from, newComponent.to, selectedNode]);

  const handleComponentKindSelect = (kind: CircuitKind) => {
    setNewComponent(prev => stageComponentFromKind(prev, kind));
    setSelectingNodeField(kind === "ground" ? "from" : null);
  };

  const handleNodePositionChange = (nodeId: string, position: NodePosition) => {
    const nextPosition = applyNodeSnap(position);
    setNodePositions(prev => ({
      ...prev,
      [nodeId]: nextPosition,
    }));
  };

  const handleNodeSelect = (nodeId: string) => {
    if (selectingNodeField) {
      setNewComponent(prev => ({ ...prev, [selectingNodeField]: nodeId }));
      setSelectingNodeField(null);
      return;
    }
    setNewComponent(prev => {
      if (prev.kind === "ground") {
        return { ...prev, from: nodeId, to: CANONICAL_GROUND };
      }
      if (!prev.from || prev.from === nodeId) {
        return { ...prev, from: nodeId };
      }
      if (!prev.to || prev.to === prev.from || prev.to === nodeId) {
        return { ...prev, to: nodeId };
      }
      return { ...prev, from: prev.to, to: nodeId };
    });
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
    const removedComponents = new Set<string>();
    setComponents(prev =>
      prev.filter(component => {
        const matches = component.from === nodeId || component.to === nodeId;
        if (matches) {
          removedComponents.add(component.id);
        }
        return !matches;
      })
    );

    if (removedComponents.size > 0) {
      setSelectedComponentId(prev => (prev && removedComponents.has(prev) ? null : prev));
      setHoveredComponentId(prev => (prev && removedComponents.has(prev) ? null : prev));
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
      from: prev.from === nodeId ? "" : prev.from,
      to: prev.to === nodeId ? "" : prev.to,
    }));
    setResult(null);
    setIsPlaying(false);
    setPlayhead(0);

    if (removedComponents.size > 0) {
      toast({
        title: `Removed node ${nodeId}`,
        description: `Detached ${removedComponents.size} component${removedComponents.size === 1 ? "" : "s"}.`,
      });
      setStatus(`Removed node ${nodeId} and ${removedComponents.size} connected component${removedComponents.size === 1 ? "" : "s"}.`);
    } else {
      toast({
        title: `Removed node ${nodeId}`,
      });
      setStatus(`Removed node ${nodeId}.`);
    }
  };

  useEffect(() => {
    const buckets = new Map<string, string[]>();
    Object.entries(nodePositions).forEach(([nodeId, position]) => {
      const key = gridKeyForPosition(position);
      const list = buckets.get(key);
      if (list) {
        list.push(nodeId);
      } else {
        buckets.set(key, [nodeId]);
      }
    });

    const aliasEntries: Array<[string, string]> = [];
    buckets.forEach(nodesAtPoint => {
      if (nodesAtPoint.length < 2) return;
      const canonical =
        nodesAtPoint.find(node => node.toLowerCase() === "gnd" || node === "0") ?? nodesAtPoint[0];
      nodesAtPoint.forEach(node => {
        if (node !== canonical) {
          aliasEntries.push([node, canonical]);
        }
      });
    });

    components.forEach(component => {
      if (component.kind === "ground" && component.from && component.from !== CANONICAL_GROUND) {
        aliasEntries.push([component.from, CANONICAL_GROUND]);
      }
    });

    if (aliasEntries.length === 0) {
      const usesGround = components.some(component => component.kind === "ground");
      if (!usesGround) {
        setNodePositions(prev => {
          if (!(CANONICAL_GROUND in prev)) {
            return prev;
          }
          const next = { ...prev };
          delete next[CANONICAL_GROUND];
          return next;
        });
        setExtraNodes(prev => prev.filter(node => node !== CANONICAL_GROUND));
      }
      return;
    }

    const aliasMap = new Map(aliasEntries);

    setComponents(prev =>
      prev.map(component => ({
        ...component,
        from: aliasMap.get(component.from) ?? component.from,
        to: aliasMap.get(component.to) ?? component.to,
      }))
    );

    setNodePositions(prev => {
      const next: Record<string, NodePosition> = {};
      Object.entries(prev).forEach(([nodeId, position]) => {
        if (aliasMap.has(nodeId)) {
          return;
        }
        next[nodeId] = position;
      });
      return next;
    });

    setExtraNodes(prev => prev.filter(node => !aliasMap.has(node)));
    setNewComponent(prev => ({
      ...prev,
      from: aliasMap.get(prev.from) ?? prev.from,
      to: aliasMap.get(prev.to) ?? prev.to,
    }));
    setSelectedNode(prev => (prev ? aliasMap.get(prev) ?? prev : prev));
  }, [nodePositions, components]);

  const handleAddNode = () => {
    const name = generateNodeName(circuitNodes);
    setExtraNodes(prev => [...prev, name]);
    setNodePositions(prev => ({
      ...prev,
      [name]: defaultNodePosition(Object.keys(prev).length),
    }));
    setNewComponent(prev => ({
      ...prev,
      ...(prev.kind === "ground" ? { from: name } : { to: name }),
    }));
  };

  const addComponent = useCallback(
    (stateOverride?: NewComponentState, anchor?: NodePosition) => {
      const placement = { ...(stateOverride ?? newComponent) };
      const kind = placement.kind;
      const isGround = kind === "ground";
      if (isGround) {
        placement.to = CANONICAL_GROUND;
      }
      const id = `${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

      const existingNodes = new Set<string>(circuitNodes);
      const createdNodes: string[] = [];

      const ensureNode = (candidate?: string | null): string => {
        const trimmed = candidate?.trim() ?? "";
        if (trimmed) {
          if (!existingNodes.has(trimmed)) {
            existingNodes.add(trimmed);
            createdNodes.push(trimmed);
          }
          return trimmed;
        }
        const generated = generateNodeName(Array.from(existingNodes));
        existingNodes.add(generated);
        createdNodes.push(generated);
        return generated;
      };

      let fromId = ensureNode(placement.from);
      let toCandidate = placement.to;
      if (!isGround && toCandidate === fromId) {
        toCandidate = "";
      }
      let toId = ensureNode(toCandidate);
      if (!isGround && toId === fromId) {
        toId = ensureNode("");
      }

      const baseAnchor = anchor ? applyNodeSnap(anchor) : null;
      const newNodePositions: Record<string, NodePosition> = {};
      if (createdNodes.length) {
        createdNodes.forEach((nodeName, index) => {
          const fallbackIndex = Object.keys(nodePositions).length + index;
          const position = baseAnchor
            ? computeAnchoredPosition(baseAnchor, index, fallbackIndex)
            : defaultNodePosition(fallbackIndex);
          newNodePositions[nodeName] = position;
        });
      }

      let component: CircuitComponent;
      if (isGround) {
        toId = ensureNode(CANONICAL_GROUND);
        component = {
          id,
          kind: "ground",
          from: fromId,
          to: toId,
        } as CircuitComponent;
      } else if (kind === "wire") {
        component = {
          id,
          kind: "wire",
          from: fromId,
          to: toId,
        };
      } else if (kind === "voltage-source" || kind === "current-source") {
        const waveform = placement.waveform ?? "dc";
        const fallbackMagnitude = kind === "current-source" ? 0.001 : DEFAULT_NEW_COMPONENT.value;
        const amplitude = waveform === "ac" ? placement.amplitude ?? fallbackMagnitude : undefined;
        const rawMagnitude = waveform === "dc" ? placement.value : amplitude;
        const safeMagnitude = Math.max(rawMagnitude ?? fallbackMagnitude, 1e-9);
        component = {
          id,
          kind,
          from: fromId,
          to: toId,
          waveform,
          value: safeMagnitude,
          amplitude: waveform === "ac" ? Math.max(amplitude ?? fallbackMagnitude, 1e-9) : undefined,
          frequency: waveform === "ac" ? placement.frequency ?? DEFAULT_NEW_COMPONENT.frequency : undefined,
          phase: waveform === "ac" ? placement.phase ?? DEFAULT_NEW_COMPONENT.phase : undefined,
          offset: waveform === "ac" ? placement.offset ?? DEFAULT_NEW_COMPONENT.offset : undefined,
        } as CircuitComponent;
      } else {
        const safeValue =
          placement.value && Number.isFinite(placement.value)
            ? Math.max(placement.value, 1e-6)
            : DEFAULT_NEW_COMPONENT.value;
        component = {
          id,
          kind,
          from: fromId,
          to: toId,
          value: safeValue,
        } as CircuitComponent;
      }

      setComponents(prev => [...prev, component]);

      if (createdNodes.length) {
        setExtraNodes(prev => {
          const next = [...prev];
          createdNodes.forEach(node => {
            if (!next.includes(node)) {
              next.push(node);
            }
          });
          return next;
        });
        setNodePositions(prev => {
          const next = { ...prev };
          createdNodes.forEach(node => {
            next[node] = newNodePositions[node];
          });
          return next;
        });
      }

      setSelectingNodeField(null);
      setSelectedComponentId(component.id);
      setHoveredComponentId(component.id);
      setSelectedNode(prev =>
        createdNodes.length
          ? createdNodes.find(node => node !== CANONICAL_GROUND) ?? createdNodes[0]
          : isGround
          ? fromId
          : prev
      );
      setNewComponent({
        ...placement,
        from: "",
        to: isGround ? CANONICAL_GROUND : "",
      });
      setResult(null);
      setMetrics(null);
      setIsPlaying(false);
      setPlayhead(0);

      const label = COMPONENT_LOOKUP[kind]?.label ?? kind;
      if (isGround) {
        setStatus(`${label} anchored at ${fromId}`);
      } else {
        setStatus(`${label} placed between ${fromId} and ${toId}`);
      }
    },
    [newComponent, circuitNodes, nodePositions]
  );

  const removeComponent = useCallback((id: string) => {
    setComponents(prev => prev.filter(comp => comp.id !== id));
    setSelectedComponentId(prev => (prev === id ? null : prev));
    setHoveredComponentId(prev => (prev === id ? null : prev));
  }, []);

  const simulate = () => {
    const invalidComponent = components.find(component => component.from === component.to);
    if (invalidComponent) {
      const message = `Component ${invalidComponent.id} must connect two distinct nodes.`;
      setResult(null);
      setMetrics(null);
      setStatus(message);
      toast({
        title: "Invalid circuit",
        description: message,
        variant: "destructive",
      });
      return;
    }

    const hasGround = components.some(component => component.kind === "ground");
    if (!hasGround) {
      const message = "Add at least one ground component before running the simulation.";
      setResult(null);
      setMetrics(null);
      setStatus(message);
      toast({
        title: "Ground reference missing",
        description: message,
        variant: "destructive",
      });
      return;
    }

    try {
      const res = simulateCircuit(components, simConfig);
      setResult(res);
      setMetrics(res.metrics ?? null);
      setPlayhead(0);
      const summary = res.metrics
        ? `Assembly ${res.metrics.assemblyMs.toFixed(2)} ms, solve ${res.metrics.solveMs.toFixed(2)} ms.`
        : "Simulation completed.";
      setStatus(`Simulated ${res.time.length} steps (${simConfig.duration}s). ${summary}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Simulation failed";
      setResult(null);
      setMetrics(null);
      setStatus(message);
      toast({
        title: "Simulation failed",
        description: message,
        variant: "destructive",
      });
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

  const handleComponentSelect = useCallback(
    (componentId: string) => {
      const component = components.find(comp => comp.id === componentId);
      if (component) {
        const preferred =
          component.from.toLowerCase() === "gnd" ? component.to : component.from;
        setSelectedNode(preferred);
      }
      setSelectedComponentId(componentId);
      setHoveredComponentId(componentId);
    },
    [components]
  );

  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName.toLowerCase();
        if (["input", "textarea", "select"].includes(tag) || target.isContentEditable) {
          return;
        }
      }

      const lower = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const hotkeyKind = hotkeyToKind[lower];
      if (hotkeyKind) {
        event.preventDefault();
        setNewComponent(prev => stageComponentFromKind(prev, hotkeyKind));
        setSelectingNodeField(null);
        return;
      }

      if ((event.key === "Backspace" || event.key === "Delete") && selectedComponentId) {
        event.preventDefault();
        removeComponent(selectedComponentId);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        addComponent();
        return;
      }

      if (event.key === "Escape") {
        if (selectingNodeField || selectedComponentId || hoveredComponentId || selectedNode) {
          event.preventDefault();
          setSelectingNodeField(null);
          setSelectedComponentId(null);
          setHoveredComponentId(null);
          setSelectedNode(null);
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isActive,
    selectedComponentId,
    removeComponent,
    addComponent,
    selectingNodeField,
    hoveredComponentId,
    selectedNode,
  ]);

  const handleCanvasDropKind = (kind: CircuitKind, position?: NodePosition) => {
    const staged = stageComponentFromKind(newComponent, kind);
    const placement: NewComponentState = { ...staged, from: "", to: "" };
    addComponent(placement, position);
  };

  const handleNodeDropKind = (kind: CircuitKind, nodeId: string) => {
    const staged = stageComponentForNodeDrop(newComponent, kind, nodeId);
    const placement: NewComponentState = { ...staged, to: "" };
    const anchor = nodePositions[nodeId];
    addComponent(placement, anchor);
    setSelectedNode(nodeId);
  };

  const handleNodeDropComponentInstance = (componentId: string, nodeId: string) => {
    setComponents(prev =>
      prev.map(component => {
        if (component.id !== componentId) {
          return component;
        }
        return retargetComponentToNode(component, nodeId);
      })
    );
    setSelectedComponentId(componentId);
    setHoveredComponentId(componentId);
    setSelectedNode(nodeId);
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-4">
      <Card className="space-y-6 p-4">
        <div className="grid gap-6 xl:grid-cols-[280px,1fr]">
          <div className="flex flex-col gap-4">
            <ComponentPalette
              selectedKind={newComponent.kind}
              onSelect={handleComponentKindSelect}
            />
            <div className="space-y-4 rounded-lg border bg-muted/30 p-3 text-xs">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Placement</p>
                  <p className="text-[11px] text-muted-foreground">
                    Drop or place components to auto-create nodes. Snap overlapping nodes to connect nets.
                  </p>
                </div>
                <Badge variant="secondary" className="font-mono">
                  {getComponentGlyph(newComponent.kind)}
                </Badge>
              </div>
              <div className="rounded border bg-background/80 px-3 py-2 font-mono text-[11px]">
                {`${newComponent.from || "auto"} &rarr; ${newComponent.to || "auto"}`}
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-2">
                  <Label className="w-20">Type</Label>
                  <Select value={newComponent.kind} onValueChange={value => handleComponentKindSelect(value as CircuitKind)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPONENT_LIBRARY.map(def => (
                        <SelectItem key={def.kind} value={def.kind}>
                          {def.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className={cn("flex items-center gap-2", newComponent.kind === "ground" && "md:col-span-2")}>\r\n                  <Label className="w-20">From</Label>
                  <Select
                    value={newComponent.from ? newComponent.from : AUTO_NODE_VALUE}
                    onValueChange={value =>
                      setNewComponent(prev => ({
                        ...prev,
                        from: value === AUTO_NODE_VALUE ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Auto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AUTO_NODE_VALUE}>Auto</SelectItem>
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
                    value={newComponent.to ? newComponent.to : AUTO_NODE_VALUE}
                    onValueChange={value =>
                      setNewComponent(prev => ({
                        ...prev,
                        to: value === AUTO_NODE_VALUE ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Auto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AUTO_NODE_VALUE}>Auto</SelectItem>
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
                {newComponent.kind === "voltage-source" || newComponent.kind === "current-source" ? (
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
                        <Label className="w-24">
                          {newComponent.kind === "current-source" ? "Current (A)" : "Voltage (V)"}
                        </Label>
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
                          <Label className="w-24">
                            {newComponent.kind === "current-source" ? "Amplitude (A)" : "Amplitude (V)"}
                          </Label>
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
                          <Label className="w-24">
                            {newComponent.kind === "current-source" ? "Offset (A)" : "Offset (V)"}
                          </Label>
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
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm" onClick={() => addComponent()}>
                  Place component
                </Button>
                <span className="text-xs text-muted-foreground">
                  Components create nodes automatically; drag or overlap nodes to form connections.
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Visual circuit workspace</h3>
                <p className="text-xs text-muted-foreground">
                  Choose a symbol, then drag or click nodes to route the schematic.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded border px-2 py-1 text-[11px] text-muted-foreground">
                  {SNAP_GRID_SIZE}px grid snapping enforced. Overlap nodes to merge connections.
                </div>
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
              focusedComponentId={selectedComponentId}
              hoveredComponentId={hoveredComponentId}
              highlightedNodes={highlightedNodes}
              onNodePositionChange={handleNodePositionChange}
              onNodeSelect={handleNodeSelect}
              onNodeFocus={nodeId => {
                setSelectedNode(nodeId);
                setSelectedComponentId(null);
              }}
              onComponentHover={componentId => {
                if (componentId) {
                  setHoveredComponentId(componentId);
                  return;
                }
                if (selectedComponentId) {
                  setHoveredComponentId(selectedComponentId);
                  return;
                }
                setHoveredComponentId(null);
              }}
              onComponentSelect={handleComponentSelect}
              onCanvasDropComponentKind={handleCanvasDropKind}
              onNodeDropComponentKind={handleNodeDropKind}
              onNodeDropComponentInstance={handleNodeDropComponentInstance}
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
          </div>
        </div>
      </Card>
      <div className="grid flex-1 gap-4 xl:grid-cols-[320px,1fr]">
        <div className="flex flex-col gap-4">
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
                  <span className="min-w-[60px] text-right text-xs text-muted-foreground">
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
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {components.map(component => {
                const isActive = selectedComponentId === component.id;
                const label = COMPONENT_LOOKUP[component.kind]?.label ?? component.kind;
                return (
                  <div
                    key={component.id}
                    role="button"
                    tabIndex={0}
                    draggable
                    onDragStart={event => {
                      event.dataTransfer.setData(DRAG_DATA_COMPONENT, component.id);
                      event.dataTransfer.setData("text/plain", component.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() => handleComponentSelect(component.id)}
                    onKeyDown={event => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleComponentSelect(component.id);
                      }
                    }}
                    onMouseEnter={() => setHoveredComponentId(component.id)}
                    onMouseLeave={() => setHoveredComponentId(null)}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded border px-3 py-2 text-xs transition-colors",
                      isActive
                        ? "border-primary bg-primary/10"
                        : "hover:border-primary/60 hover:bg-primary/5"
                    )}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={isActive ? "default" : "secondary"} className="font-mono">
                          {getComponentGlyph(component.kind)}
                        </Badge>
                        <span className="text-xs font-semibold capitalize">{label}</span>
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {component.from} &rarr; {component.to}
                      </span>
                      <span className="text-muted-foreground">{describeComponent(component)}</span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Remove ${component.kind}`}
                      onClick={event => {
                        event.stopPropagation();
                        removeComponent(component.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
              {components.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  Add components to build a circuit.
                </p>
              )}
            </div>
            {selectedComponent ? (
              <ComponentInspector
                component={selectedComponent}
                nodes={circuitNodes}
                onUpdate={updater =>
                  setComponents(prev =>
                    prev.map(comp => (comp.id === selectedComponent.id ? updater(comp) : comp))
                  )
                }
                onRemove={() => removeComponent(selectedComponent.id)}
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                Select a component to inspect and tweak its parameters.
              </p>
            )}
          </Card>
        </div>
        <div className="flex flex-col gap-4">
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
                        "flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2 text-xs transition-colors",
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
      </div>
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

interface ComponentPaletteProps {
  selectedKind: CircuitKind;
  onSelect: (kind: CircuitKind) => void;
}

function ComponentPalette({ selectedKind, onSelect }: ComponentPaletteProps) {
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
}

const MIN_SYMBOL_LENGTH = 56;

function renderComponentSymbol(
  kind: CircuitKind,
  rawLength: number,
  color: string,
  strokeWidth = 3
): JSX.Element {
  const length = Math.max(rawLength, 1);
  if (!Number.isFinite(length)) {
    return <line x1={0} y1={0} x2={0} y2={0} stroke={color} strokeWidth={strokeWidth} />;
  }

  if (kind === "wire" || length <= MIN_SYMBOL_LENGTH) {
    return (
      <line
        x1={0}
        y1={0}
        x2={length}
        y2={0}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    );
  }

  if (kind === "voltage-source") {
    const center = length / 2;
    const radius = Math.min(18, Math.max(12, length / 6));
    const glyphOffset = radius * 0.5;
    const glyphStroke = Math.max(1.2, strokeWidth * 0.7);
    return (
      <>
        <line
          x1={0}
          y1={0}
          x2={center - radius}
          y2={0}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <circle
          cx={center}
          cy={0}
          r={radius}
          fill="var(--background)"
          stroke={color}
          strokeWidth={strokeWidth}
        />
        <line
          x1={center}
          y1={-glyphOffset - 4}
          x2={center}
          y2={-glyphOffset + 4}
          stroke={color}
          strokeWidth={glyphStroke}
          strokeLinecap="round"
        />
        <line
          x1={center - 6}
          y1={-glyphOffset}
          x2={center + 6}
          y2={-glyphOffset}
          stroke={color}
          strokeWidth={glyphStroke}
          strokeLinecap="round"
        />
        <line
          x1={center - 6}
          y1={glyphOffset}
          x2={center + 6}
          y2={glyphOffset}
          stroke={color}
          strokeWidth={glyphStroke}
          strokeLinecap="round"
        />
        <line
          x1={center + radius}
          y1={0}
          x2={length}
          y2={0}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </>
    );
  }

  if (kind === "current-source") {
    const center = length / 2;
    const radius = Math.min(18, Math.max(12, length / 6));
    const arrowLength = radius * 0.8;
    const glyphStroke = Math.max(1.2, strokeWidth * 0.7);
    const arrowHeadPoints = [
      `${center - 4},${-arrowLength * 0.5 + 8}`,
      `${center},${-arrowLength * 0.5}`,
      `${center + 4},${-arrowLength * 0.5 + 8}`,
    ].join(" ");
    return (
      <>
        <line
          x1={0}
          y1={0}
          x2={center - radius}
          y2={0}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <circle
          cx={center}
          cy={0}
          r={radius}
          fill="var(--background)"
          stroke={color}
          strokeWidth={strokeWidth}
        />
        <line
          x1={center}
          y1={arrowLength * 0.5}
          x2={center}
          y2={-arrowLength * 0.5}
          stroke={color}
          strokeWidth={glyphStroke}
          strokeLinecap="round"
        />
        <polyline
          points={arrowHeadPoints}
          fill="none"
          stroke={color}
          strokeWidth={glyphStroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1={center + radius}
          y1={0}
          x2={length}
          y2={0}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </>
    );
  }

  const { start, end } = computeSymbolLayout(length);

  if (kind === "resistor") {
    const zigCount = 4;
    const amplitude = 10;
    const segment = (end - start) / (zigCount * 2);
    const points: string[] = [`${start.toFixed(2)},0`];
    for (let i = 0; i < zigCount * 2; i++) {
      const x = start + segment * (i + 1);
      const y = i % 2 === 0 ? -amplitude : amplitude;
      points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    points.push(`${end.toFixed(2)},0`);
    return (
      <>
        <line
          x1={0}
          y1={0}
          x2={start}
          y2={0}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <line
          x1={end}
          y1={0}
          x2={length}
          y2={0}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </>
    );
  }

  if (kind === "capacitor") {
    const plateHeight = 16;
    return (
      <>
        <line
          x1={0}
          y1={0}
          x2={start}
          y2={0}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <line
          x1={start}
          y1={-plateHeight}
          x2={start}
          y2={plateHeight}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <line
          x1={end}
          y1={-plateHeight}
          x2={end}
          y2={plateHeight}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <line
          x1={end}
          y1={0}
          x2={length}
          y2={0}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </>
    );
  }

  if (kind === "inductor") {
    const loops = 4;
    const segment = (end - start) / loops;
    const half = segment / 2;
    const radius = Math.min(10, segment * 0.6);
    let d = `M ${start.toFixed(2)} 0`;
    for (let i = 0; i < loops; i++) {
      d += ` q ${half.toFixed(2)} ${(-radius).toFixed(2)} ${half.toFixed(2)} 0`;
      d += ` q ${half.toFixed(2)} ${radius.toFixed(2)} ${half.toFixed(2)} 0`;
    }
    return (
      <>
        <line
          x1={0}
          y1={0}
          x2={start}
          y2={0}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1={end}
          y1={0}
          x2={length}
          y2={0}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </>
    );
  }

  return (
    <line
      x1={0}
      y1={0}
      x2={length}
      y2={0}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  );
}

type OrthogonalOrientation = "horizontal" | "vertical";

interface RouteSegment {
  start: NodePosition;
  end: NodePosition;
  isSymbolSegment?: boolean;
}

interface OrthogonalRouteResult {
  segments: RouteSegment[];
  symbolStart: NodePosition | null;
  symbolEnd: NodePosition | null;
  orientation: OrthogonalOrientation;
}

function dedupeRoutePoints(points: NodePosition[]): NodePosition[] {
  if (points.length <= 1) {
    return points;
  }
  const filtered: NodePosition[] = [points[0]];
  for (let index = 1; index < points.length; index += 1) {
    const prev = filtered[filtered.length - 1];
    const current = points[index];
    if (prev.x === current.x && prev.y === current.y) {
      continue;
    }
    filtered.push(current);
  }
  return filtered;
}

function computeOrthogonalRoute(start: NodePosition, end: NodePosition): OrthogonalRouteResult {
  if (start.x === end.x && start.y === end.y) {
    return {
      segments: [],
      symbolStart: null,
      symbolEnd: null,
      orientation: "horizontal",
    };
  }

  if (start.x === end.x || start.y === end.y) {
    const orientation: OrthogonalOrientation = start.y === end.y ? "horizontal" : "vertical";
    return {
      segments: [
        {
          start,
          end,
          isSymbolSegment: true,
        },
      ],
      symbolStart: start,
      symbolEnd: end,
      orientation,
    };
  }

  const horizontalPreferred = Math.abs(start.x - end.x) >= Math.abs(start.y - end.y);
  const points = horizontalPreferred
    ? [
        start,
        { x: start.x, y: (start.y + end.y) / 2 },
        { x: end.x, y: (start.y + end.y) / 2 },
        end,
      ]
    : [
        start,
        { x: (start.x + end.x) / 2, y: start.y },
        { x: (start.x + end.x) / 2, y: end.y },
        end,
      ];

  const uniquePoints = dedupeRoutePoints(points);
  const segments: RouteSegment[] = [];
  for (let index = 0; index < uniquePoints.length - 1; index += 1) {
    const segmentStart = uniquePoints[index];
    const segmentEnd = uniquePoints[index + 1];
    const isSymbolSegment = index === 1 && uniquePoints.length >= 3;
    segments.push({ start: segmentStart, end: segmentEnd, isSymbolSegment });
  }

  const symbolSegment = segments.find(segment => segment.isSymbolSegment) ?? segments[0];
  return {
    segments,
    symbolStart: symbolSegment?.start ?? null,
    symbolEnd: symbolSegment?.end ?? null,
    orientation: horizontalPreferred ? "horizontal" : "vertical",
  };
}

function composeSymbolTransform(
  start: NodePosition,
  end: NodePosition,
  orientation: OrthogonalOrientation
): string {
  if (orientation === "horizontal") {
    if (end.x >= start.x) {
      return `translate(${start.x} ${start.y})`;
    }
    return `translate(${start.x} ${start.y}) scale(-1 1)`;
  }
  if (end.y >= start.y) {
    return `translate(${start.x} ${start.y}) rotate(90)`;
  }
  return `translate(${start.x} ${start.y}) rotate(-90)`;
}

function orthogonalPathD(start: NodePosition, end: NodePosition): string {
  const { segments } = computeOrthogonalRoute(start, end);
  if (segments.length === 0) {
    return "";
  }
  const commands = [`M ${segments[0].start.x} ${segments[0].start.y}`];
  segments.forEach(segment => {
    commands.push(`L ${segment.end.x} ${segment.end.y}`);
  });
  return commands.join(" ");
}

function computeSymbolLayout(length: number) {
  const minLead = 14;
  const minBody = 28;
  let lead = Math.min(Math.max(length * 0.18, minLead), 32);
  let body = length - lead * 2;
  if (body < minBody) {
    lead = Math.max((length - minBody) / 2, 10);
    body = length - lead * 2;
  }
  const start = lead;
  const end = length - lead;
  return { start, end, body };
}

interface CircuitCanvasProps {
  nodes: string[];
  components: CircuitComponent[];
  nodePositions: Record<string, NodePosition>;
  selectingField: "from" | "to" | null;
  pendingConnection?: { from?: string; to?: string };
  focusedComponentId?: string | null;
  hoveredComponentId?: string | null;
  highlightedNodes?: Set<string>;
  onNodePositionChange: (nodeId: string, position: NodePosition) => void;
  onNodeSelect: (nodeId: string) => void;
  onNodeFocus?: (nodeId: string) => void;
  onComponentHover?: (componentId: string | null) => void;
  onComponentSelect?: (componentId: string) => void;
  onCanvasDropComponentKind?: (kind: CircuitKind, position?: NodePosition) => void;
  onNodeDropComponentKind?: (kind: CircuitKind, nodeId: string) => void;
  onNodeDropComponentInstance?: (componentId: string, nodeId: string) => void;
}

const CircuitCanvas = ({
  nodes,
  components,
  nodePositions,
  selectingField,
  pendingConnection,
  focusedComponentId,
  hoveredComponentId,
  highlightedNodes,
  onNodePositionChange,
  onNodeSelect,
  onNodeFocus,
  onComponentHover,
  onComponentSelect,
  onCanvasDropComponentKind,
  onNodeDropComponentKind,
  onNodeDropComponentInstance,
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
  const minorGridId = `${patternId}_minor`;
  const majorGridId = `${patternId}_major`;

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

  const previewPath =
    highlightedFrom &&
    highlightedTo &&
    highlightedFrom !== highlightedTo &&
    resolvedPositions[highlightedFrom] &&
    resolvedPositions[highlightedTo]
      ? orthogonalPathD(
          resolvedPositions[highlightedFrom],
          resolvedPositions[highlightedTo]
        )
      : null;

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

  const resolveDropPosition = (clientX: number, clientY: number): NodePosition | null => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const pointerX = (clientX - rect.left) * scaleX;
    const pointerY = (clientY - rect.top) * scaleY;
    return applyNodeSnap({ x: pointerX, y: pointerY });
  };

  const handleCanvasDragOver = (event: DragEvent<HTMLDivElement>) => {
    const types = Array.from(event.dataTransfer?.types ?? []);
    if (types.includes(DRAG_DATA_KIND) || types.includes(DRAG_DATA_COMPONENT)) {
      event.preventDefault();
      event.dataTransfer!.dropEffect = types.includes(DRAG_DATA_KIND) ? "copy" : "move";
    }
  };

  const handleCanvasDrop = (event: DragEvent<HTMLDivElement>) => {
    const dataTransfer = event.dataTransfer;
    if (!dataTransfer) return;
    const kindData = dataTransfer.getData(DRAG_DATA_KIND);
    if (kindData && onCanvasDropComponentKind) {
      event.preventDefault();
      const dropPosition = resolveDropPosition(event.clientX, event.clientY);
      onCanvasDropComponentKind(kindData as CircuitKind, dropPosition ?? undefined);
    }
  };

  const handleNodeDragOver = (event: DragEvent<SVGCircleElement>) => {
    const types = Array.from(event.dataTransfer?.types ?? []);
    if (types.includes(DRAG_DATA_KIND) || types.includes(DRAG_DATA_COMPONENT)) {
      event.preventDefault();
      event.dataTransfer!.dropEffect = types.includes(DRAG_DATA_KIND) ? "copy" : "move";
    }
  };

  const handleNodeDrop = (nodeId: string, event: DragEvent<SVGCircleElement>) => {
    const dataTransfer = event.dataTransfer;
    if (!dataTransfer) return;
    const componentId = dataTransfer.getData(DRAG_DATA_COMPONENT);
    const kindData = dataTransfer.getData(DRAG_DATA_KIND);
    if (componentId && onNodeDropComponentInstance) {
      event.preventDefault();
      onNodeDropComponentInstance(componentId, nodeId);
    }
    if (kindData && onNodeDropComponentKind) {
      event.preventDefault();
      onNodeDropComponentKind(kindData as CircuitKind, nodeId);
    }
  };

  return (
    <div className="rounded-lg border bg-background/80 p-3" onDragOver={handleCanvasDragOver} onDrop={handleCanvasDrop}>
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
          <pattern id={minorGridId} width={SNAP_GRID_SIZE} height={SNAP_GRID_SIZE} patternUnits="userSpaceOnUse">
            <path
              d={`M ${SNAP_GRID_SIZE} 0 L 0 0 0 ${SNAP_GRID_SIZE}`}
              fill="none"
              stroke="rgba(148,163,184,0.25)"
              strokeWidth={0.75}
            />
          </pattern>
          <pattern
            id={majorGridId}
            width={SNAP_GRID_SIZE * 4}
            height={SNAP_GRID_SIZE * 4}
            patternUnits="userSpaceOnUse"
          >
            <rect width="100%" height="100%" fill={`url(#${minorGridId})`} />
            <path
              d={`M ${SNAP_GRID_SIZE * 4} 0 L 0 0 0 ${SNAP_GRID_SIZE * 4}`}
              fill="none"
              stroke="rgba(148,163,184,0.35)"
              strokeWidth={1.2}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${majorGridId})`} />

        {components.map(component => {
          const start = resolvedPositions[component.from];
          const end = resolvedPositions[component.to];
          if (!start || !end || component.from === component.to) {
            return null;
          }
          const {
            segments,
            symbolStart,
            symbolEnd,
            orientation,
          } = computeOrthogonalRoute(start, end);
          if (!segments || !symbolStart || !symbolEnd) {
            return null;
          }
          const length = Math.hypot(symbolEnd.x - symbolStart.x, symbolEnd.y - symbolStart.y);
          const baseColor = componentStroke(component.kind);
          const isFocused = component.id === focusedComponentId;
          const isHovered = component.id === hoveredComponentId && !isFocused;
          const strokeWidth = isFocused ? 4 : isHovered ? 3.4 : 2.8;
          const accentColor = isFocused ? "hsl(var(--primary))" : baseColor;
          const midX = (start.x + end.x) / 2;
          const midY = (start.y + end.y) / 2;
          const glyphFill = isFocused ? "hsl(var(--primary))" : "var(--muted-foreground)";
          const groupOpacity = isFocused ? 1 : isHovered ? 0.92 : 0.82;
          const handleSelect = () => onComponentSelect?.(component.id);
          return (
            <g
              key={component.id}
              role="button"
              tabIndex={0}
              aria-label={`${component.kind} from ${component.from} to ${component.to}`}
              aria-pressed={isFocused}
              onClick={handleSelect}
              onKeyDown={event => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleSelect();
                }
              }}
              onPointerEnter={() => onComponentHover?.(component.id)}
              onPointerLeave={() => onComponentHover?.(null)}
              onFocus={() => onComponentHover?.(component.id)}
              onBlur={() => onComponentHover?.(null)}
              style={{ cursor: "pointer" }}
            >
              {segments.map((segment, index) => {
                if (segment.isSymbolSegment) {
                  return null;
                }
                return (
                  <line
                    key={`segment-${component.id}-${index}`}
                    x1={segment.start.x}
                    y1={segment.start.y}
                    x2={segment.end.x}
                    y2={segment.end.y}
                    stroke={accentColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    opacity={groupOpacity}
                  />
                );
              })}
              <g
                transform={composeSymbolTransform(symbolStart, symbolEnd, orientation)}
                opacity={groupOpacity}
              >
                {renderComponentSymbol(component.kind, length, accentColor, strokeWidth)}
              </g>
              <text
                x={midX}
                y={midY - 10}
                textAnchor="middle"
                fill={glyphFill}
                fontSize={11}
                fontWeight={600}
              >
                {getComponentGlyph(component.kind)}
              </text>
              <title>{describeComponent(component)}</title>
            </g>
          );
        })}

        {previewPath && (
          <path
            d={previewPath}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            strokeDasharray="8 6"
            opacity={0.6}
          />
        )}

        {nodes.map(nodeId => {
          const position = resolvedPositions[nodeId];
          const isGround = nodeId.toLowerCase() === "gnd" || nodeId === "0";
          const isActive =
            (selectingField === "from" && highlightedFrom === nodeId) ||
            (selectingField === "to" && highlightedTo === nodeId);
          const isHighlighted = highlightedNodes?.has(nodeId);
          const ringColor = isActive
            ? "hsl(var(--primary))"
            : isHighlighted
            ? "hsl(var(--primary))"
            : "rgba(148,163,184,0.8)";
          const strokeWidth = isActive ? 3 : isHighlighted ? 2.4 : 1.5;
          const coordinate = `${Math.round(position.x)}, ${Math.round(position.y)}`;
          return (
            <g key={nodeId}>
              <title>
                {nodeId} â€¢ ({coordinate})
              </title>
              <circle
                cx={position.x}
                cy={position.y}
                r={14}
                fill={
                  isGround
                    ? "#0f172a"
                    : isHighlighted
                    ? "hsl(var(--primary) / 0.18)"
                    : "#1e293b"
                }
                opacity={isHighlighted ? 0.45 : 0.25}
              />
              <circle
                cx={position.x}
                cy={position.y}
                r={10}
                fill={isGround ? "#0f172a" : "#020817"}
                stroke={ringColor}
                strokeWidth={strokeWidth}
                onDragOver={handleNodeDragOver}
                onDrop={event => handleNodeDrop(nodeId, event)}
                onPointerDown={event => beginDrag(nodeId, event)}
              />
              <text
                x={position.x}
                y={position.y + 24}
                textAnchor="middle"
                fill={isHighlighted ? "hsl(var(--primary))" : "var(--foreground)"}
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
          const isConnected = lockedNodes.has(node);
          return (
            <div key={node} className="flex items-center gap-2 text-xs">
              <Input
                className="h-8 flex-1 text-xs"
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

const DifferentialEquationList = ({ equations }: DifferentialEquationListProps) => {
  if (!equations.length) {
    return <p className="text-xs text-muted-foreground">Add reactive elements or sources to generate symbolic equations.</p>;
  }

  return (
    <div className="space-y-2 text-xs">
      {equations.map(eq => (
        <div key={eq.id} className="rounded border px-3 py-2">
          <p className="font-semibold">{eq.label}</p>
          <p className="font-mono text-[11px]">{eq.plain}</p>
          <p className="text-[11px] text-muted-foreground break-words">{eq.latex}</p>
        </div>
      ))}
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

interface ComponentInspectorProps {
  component: CircuitComponent;
  nodes: string[];
  onUpdate: (updater: (component: CircuitComponent) => CircuitComponent) => void;
  onRemove: () => void;
}

const ComponentInspector = ({ component, nodes, onUpdate, onRemove }: ComponentInspectorProps) => {
  const label = COMPONENT_LOOKUP[component.kind]?.label ?? component.kind;
  const glyph = getComponentGlyph(component.kind);
  const isSource = component.kind === "voltage-source" || component.kind === "current-source";
  const isPassive =
    component.kind === "resistor" || component.kind === "capacitor" || component.kind === "inductor";
  const isGround = component.kind === "ground";
  const valueUnit =
    component.kind === "resistor"
      ? "Î©"
      : component.kind === "capacitor"
      ? "F"
      : component.kind === "inductor"
      ? "H"
      : component.kind === "current-source"
      ? "A"
      : component.kind === "voltage-source"
      ? "V"
      : "";

  const handleNodeChange = (field: "from" | "to", value: string) => {
    onUpdate(prev => ({ ...prev, [field]: value } as CircuitComponent));
  };

  const handleSwap = () => {
    onUpdate(prev => ({ ...prev, from: prev.to, to: prev.from } as CircuitComponent));
  };

  const handleValueChange = (value: number) => {
    onUpdate(prev => {
      if (prev.kind === "resistor" || prev.kind === "capacitor" || prev.kind === "inductor") {
        return { ...prev, value: Math.max(Math.abs(value) || DEFAULT_NEW_COMPONENT.value, 1e-9) } as typeof prev;
      }
      if (prev.kind === "voltage-source" || prev.kind === "current-source") {
        return { ...prev, value: Math.max(Math.abs(value) || DEFAULT_NEW_COMPONENT.value, 1e-9) } as typeof prev;
      }
      return prev;
    });
  };

  const handleWaveformChange = (waveform: "dc" | "ac") => {
    onUpdate(prev => {
      if (prev.kind === "voltage-source" || prev.kind === "current-source") {
        const next = { ...prev, waveform } as typeof prev;
        if (waveform === "dc") {
          next.amplitude = undefined;
          next.frequency = undefined;
          next.phase = undefined;
          next.offset = undefined;
        } else {
          next.amplitude = prev.amplitude ?? prev.value;
          next.frequency = prev.frequency ?? DEFAULT_NEW_COMPONENT.frequency;
          next.phase = prev.phase ?? DEFAULT_NEW_COMPONENT.phase;
          next.offset = prev.offset ?? 0;
        }
        return next;
      }
      return prev;
    });
  };

  const handleSourceField = (field: "amplitude" | "frequency" | "phase" | "offset", value: number) => {
    onUpdate(prev => {
      if (prev.kind === "voltage-source" || prev.kind === "current-source") {
        let sanitized = value;
        if (field === "amplitude") {
          sanitized = Math.max(Math.abs(value) || prev.value, 1e-9);
        } else if (field === "frequency") {
          sanitized = Math.max(Math.abs(value) || DEFAULT_NEW_COMPONENT.frequency, 0);
        } else if (field === "offset") {
          sanitized = Number.isFinite(value) ? value : 0;
        } else if (field === "phase") {
          sanitized = Number.isFinite(value) ? value : 0;
        }
        return { ...prev, [field]: sanitized } as typeof prev;
      }
      return prev;
    });
  };

  const waveform = isSource ? component.waveform : undefined;
  const amplitude = isSource && component.waveform === "ac" ? component.amplitude ?? component.value : component.value;
  const frequency = isSource && component.waveform === "ac" ? component.frequency ?? DEFAULT_NEW_COMPONENT.frequency : undefined;
  const phase = isSource && component.waveform === "ac" ? component.phase ?? DEFAULT_NEW_COMPONENT.phase : undefined;
  const offset = isSource && component.waveform === "ac" ? component.offset ?? 0 : undefined;

  return (
    <div className="space-y-3 rounded border bg-muted/30 p-3 text-xs">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold capitalize">{label}</p>
          <p className="font-mono text-[11px] text-muted-foreground">
            {component.from} &rarr; {component.to}
          </p>
        </div>
        <Badge variant="secondary" className="font-mono">
          {glyph}
        </Badge>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <div className={cn("flex items-center gap-2", isGround && "md:col-span-2")}>\r\n          <Label className="w-12">From</Label>
          <Select value={component.from} onValueChange={value => handleNodeChange("from", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {nodes.map(node => (
                <SelectItem key={node} value={node}>
                  {node}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="w-12">To</Label>
          <Select value={component.to} onValueChange={value => handleNodeChange("to", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {nodes.map(node => (
                <SelectItem key={node} value={node}>
                  {node}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {isGround && (
        <p className="text-[11px] text-muted-foreground">
          Ground enforces {component.from || "(unset)"} at 0 V.
        </p>
      )}
      {isSource ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="w-20">Waveform</Label>
            <Select value={waveform} onValueChange={value => handleWaveformChange(value as "dc" | "ac")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dc">DC</SelectItem>
                <SelectItem value="ac">AC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {component.waveform === "dc" ? (
            <div className="flex items-center gap-2">
              <Label className="w-20">
                {component.kind === "current-source" ? "Current" : "Voltage"} ({valueUnit})
              </Label>
              <Input
                type="number"
                value={component.value}
                onChange={e => handleValueChange(parseFloat(e.target.value) || component.value)}
              />
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              <div className="flex items-center gap-2">
                <Label className="w-20">
                  {component.kind === "current-source" ? "Amplitude" : "Amplitude"} ({valueUnit})
                </Label>
                <Input
                  type="number"
                  value={amplitude ?? component.value}
                  onChange={e => handleSourceField("amplitude", parseFloat(e.target.value) || amplitude || component.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-20">Frequency (Hz)</Label>
                <Input
                  type="number"
                  value={frequency}
                  onChange={e => handleSourceField("frequency", parseFloat(e.target.value) || DEFAULT_NEW_COMPONENT.frequency)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-20">Phase (rad)</Label>
                <Input
                  type="number"
                  value={phase}
                  onChange={e => handleSourceField("phase", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-20">Offset ({valueUnit})</Label>
                <Input
                  type="number"
                  value={offset}
                  onChange={e => handleSourceField("offset", parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          )}
        </div>
      ) : isPassive ? (
        <div className="flex items-center gap-2">
          <Label className="w-20">Value ({valueUnit})</Label>
          <Input
            type="number"
            value={component.value}
            onChange={e => handleValueChange(parseFloat(e.target.value) || component.value)}
          />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={handleSwap}>
          Swap terminals
        </Button>
        <Button size="sm" variant="destructive" onClick={onRemove}>
          Remove component
        </Button>
      </div>
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
    case "current-source":
      return component.waveform === "ac"
        ? `${component.amplitude ?? component.value} A AC`
        : `${component.value} A DC`;
    case "ground":
      return `Ground reference at ${component.from}`;
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














