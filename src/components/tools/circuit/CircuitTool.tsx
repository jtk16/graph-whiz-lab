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
  COMPONENT_LIBRARY,
  COMPONENT_LOOKUP,
  DEFAULT_NEW_COMPONENT,
  NODE_MARGIN,
  CircuitKind,
  NewComponentState,
  NodePosition,
  SNAP_GRID_SIZE,
  applyNodeSnap,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
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
import { CIRCUIT_PRESETS, DEFAULT_SIM_CONFIG } from "@/lib/circuits/presets";
import {
  buildDifferentialEquations,
  DifferentialEquation,
} from "@/lib/circuits/differentialEquations";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/components/ui/use-toast";
import { Pause, Play, Upload, Trash2, ZoomIn, ZoomOut, Scan, RefreshCcw, ChevronDown, Target, MousePointer, PenTool, Eraser } from "lucide-react";
import { cn } from "@/lib/utils";
import { solveSymbolicCircuit } from "@/lib/circuits/symbolic";
import { CircuitCanvas } from "./CircuitCanvas";
import { ComponentPalette } from "./ComponentPalette";
import { ComponentInspector } from "./ComponentInspector";
import {
  NodeDetailPanel,
  ShortcutLegend,
  TipsList,
  DifferentialEquationList,
} from "./NodeDetailPanel";
import type { ShortcutHint } from "./NodeDetailPanel";
import { NodeListEditor } from "./NodeListEditor";
import { CircuitStatusBar } from "./CircuitStatusBar";
import { DRAG_DATA_COMPONENT, DRAG_DATA_KIND } from "./constants";
import { buildPiecewiseExpression, describeComponent, componentValueLabel } from "./utils";
import type { ViewportState } from "./types";

type ActiveTool = "select" | "wire";

interface WireDraft {
  startNodeId: string;
  startPosition: NodePosition;
  startWasNew: boolean;
}

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

const DEFAULT_NODE_NAMES = extractCircuitNodes(DEFAULT_COMPONENTS);

const HOTKEY_HINTS: ShortcutHint[] = [
  { combo: "W", action: "Stage wire and connect nodes" },
  { combo: "R", action: "Stage resistor" },
  { combo: "C", action: "Stage capacitor" },
  { combo: "L", action: "Stage inductor" },
  { combo: "V", action: "Stage voltage source" },
  { combo: "I", action: "Stage current source" },
  { combo: "G", action: "Drop ground at selected node" },
  { combo: "Ctrl/Cmd + Enter", action: "Commit staged component" },
  { combo: "Backspace / Delete", action: "Remove selected component" },
  { combo: "Esc", action: "Clear selections and node picking" },
];

const EDITOR_TIPS = [
  "Drag components from the library directly onto the canvas to autoconnect.",
  "Drop a netlist item onto a node to retarget its leads instantly.",
  "Rename nodes from the list to annotate probe points and exports.",
];

export function CircuitTool({ isActive }: ToolProps) {
  const [components, setComponents] = useState<CircuitComponent[]>(DEFAULT_COMPONENTS);
  const [newComponent, setNewComponent] = useState<NewComponentState>(DEFAULT_NEW_COMPONENT);
  const [simConfig, setSimConfig] = useState(DEFAULT_SIM_CONFIG);
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
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedComponentIds, setSelectedComponentIds] = useState<Set<string>>(new Set());
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [viewport, setViewport] = useState<ViewportState>({
    origin: { x: 0, y: 0 },
    scale: 1,
  });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId?: string;
    componentId?: string;
  } | null>(null);
  const [activeTool, setActiveTool] = useState<ActiveTool>("select");
  const [wireDraft, setWireDraft] = useState<WireDraft | null>(null);
  const [wirePreview, setWirePreview] = useState<NodePosition | null>(null);
  const [probes, setProbes] = useState<Array<{ id: string; nodeId: string; offset: { x: number; y: number } }>>([]);
  const [showNodePanel, setShowNodePanel] = useState(false);
  const playRef = useRef<number | null>(null);
  const circuitNodes = useMemo(() => extractCircuitNodes(components), [components]);
  const allNodes = useMemo(() => {
    const set = new Set<string>(circuitNodes);
    extraNodes.forEach(node => set.add(node));
    return Array.from(set);
  }, [circuitNodes, extraNodes]);
  const nodeConnectionCounts = useMemo(() => {
    const counts: Record<string, number> = Object.create(null);
    components.forEach(component => {
      if (component.from) {
        counts[component.from] = (counts[component.from] ?? 0) + 1;
      }
      if (component.to) {
        counts[component.to] = (counts[component.to] ?? 0) + 1;
      }
    });
    return counts;
  }, [components]);
  const liveVoltages = useMemo(() => {
    if (!result) return {};
    const map: Record<string, number> = {};
    Object.entries(result.nodeVoltages).forEach(([node, series]) => {
      map[node] = series[playhead] ?? 0;
    });
    return map;
  }, [result, playhead]);
  const liveCurrents = useMemo(() => {
    if (!result) return {};
    const map: Record<string, number> = {};
    Object.entries(result.nodeCurrents).forEach(([node, series]) => {
      map[node] = series[playhead] ?? 0;
    });
    return map;
  }, [result, playhead]);
  const probeDisplays = useMemo(
    () =>
      probes.map(probe => ({
        ...probe,
        voltage: liveVoltages[probe.nodeId] ?? null,
        current: liveCurrents[probe.nodeId] ?? null,
      })),
    [probes, liveVoltages, liveCurrents]
  );
  const symbolicResult = useMemo(() => {
    try {
      return solveSymbolicCircuit(components);
    } catch {
      return { nodeVoltages: {}, branchCurrents: {}, variables: [] };
    }
  }, [components]);
  const differentialEquations = useMemo<DifferentialEquation[]>(
    () => buildDifferentialEquations(components),
    [components]
  );

  const applyPreset = (label: string, componentsToLoad: CircuitComponent[], description?: string) => {
    const cloned = componentsToLoad.map(component => ({ ...component }));
    setComponents(cloned);
    const nodes = extractCircuitNodes(cloned);
    const baselineNodes = new Set(DEFAULT_NODE_NAMES);
    setExtraNodes(nodes.filter(node => !baselineNodes.has(node)));
    setNodePositions(createInitialPositions(nodes));
    setViewport({ origin: { x: 0, y: 0 }, scale: 1 });
    setSelectedComponentId(null);
    setSelectedComponentIds(() => new Set());
    setHoveredComponentId(null);
    setHoveredNodeId(null);
    setSelectedNode(null);
    setSelectedNodeIds(() => new Set());
    setSelectingNodeField(null);
    setNewComponent(DEFAULT_NEW_COMPONENT);
    setResult(null);
    setMetrics(null);
    setPlayhead(0);
    setIsPlaying(false);
    setWireDraft(null);
    setWirePreview(null);
    setActiveTool("select");
    setProbes([]);
    const descriptionText = description ? `${label} - ${description}` : label;
    toast({
      title: "Preset loaded",
      description: descriptionText,
    });
    setStatus(`Loaded preset: ${descriptionText}`);
  };

  const loadPreset = (presetId: string) => {
    const preset = CIRCUIT_PRESETS.find(entry => entry.id === presetId);
    if (!preset) {
      applyPreset("Starter (Grounded source)", DEFAULT_COMPONENTS);
      return;
    }
    applyPreset(preset.label, preset.components, preset.description);
  };

  useEffect(() => {
    const validIds = new Set(components.map(component => component.id));
    setSelectedComponentIds(prev => {
      const filtered = new Set<string>();
      prev.forEach(id => {
        if (validIds.has(id)) {
          filtered.add(id);
        }
      });
      if (filtered.size === prev.size) {
        return prev;
      }
      const filteredArray = Array.from(filtered);
      const nextPrimary =
        filtered.size > 0
          ? filtered.has(selectedComponentId ?? "")
            ? selectedComponentId
            : filteredArray[filteredArray.length - 1] ?? null
          : null;
      if (selectedComponentId !== nextPrimary) {
        setSelectedComponentId(nextPrimary);
      }
      return filtered;
    });
  }, [components, selectedComponentId]);

  useEffect(() => {
    const validNodeIds = new Set(allNodes);
    setSelectedNodeIds(prev => {
      const filtered = new Set<string>();
      prev.forEach(id => {
        if (validNodeIds.has(id)) {
          filtered.add(id);
        }
      });
      if (filtered.size === prev.size) {
        return prev;
      }
      const filteredArray = Array.from(filtered);
      const nextPrimary =
        filtered.size > 0
          ? filtered.has(selectedNode ?? "")
            ? selectedNode
            : filteredArray[filteredArray.length - 1] ?? null
          : null;
      if (selectedNode !== nextPrimary) {
        setSelectedNode(nextPrimary);
      }
      return filtered;
    });
  }, [allNodes, selectedNode]);

  const clampScale = useCallback((next: number) => Math.min(Math.max(next, 0.25), 4), []);

  const updateViewportPan = useCallback((deltaScreen: { x: number; y: number }) => {
    setViewport(prev => ({
      origin: {
        x: prev.origin.x - deltaScreen.x / prev.scale,
        y: prev.origin.y - deltaScreen.y / prev.scale,
      },
      scale: prev.scale,
    }));
  }, []);

  const applyViewportZoom = useCallback(
    (zoomFactor: number, anchor?: { x: number; y: number }) => {
      setViewport(prev => {
        const nextScale = clampScale(prev.scale * zoomFactor);
        if (nextScale === prev.scale) {
          return prev;
        }
        const screenPoint = anchor ?? { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
        const worldPoint = {
          x: screenPoint.x / prev.scale + prev.origin.x,
          y: screenPoint.y / prev.scale + prev.origin.y,
        };
        const nextOrigin = {
          x: worldPoint.x - screenPoint.x / nextScale,
          y: worldPoint.y - screenPoint.y / nextScale,
        };
        return {
          origin: nextOrigin,
          scale: nextScale,
        };
      });
    },
    [clampScale]
  );

  const updateViewportZoom = useCallback(
    (zoomFactor: number, screenPoint: { x: number; y: number }) => {
      applyViewportZoom(zoomFactor, screenPoint);
    },
    [applyViewportZoom]
  );

  const handleZoomIn = useCallback(() => applyViewportZoom(1.2), [applyViewportZoom]);

  const handleZoomOut = useCallback(() => applyViewportZoom(1 / 1.2), [applyViewportZoom]);

  const handleResetViewport = useCallback(() => {
    setViewport({ origin: { x: 0, y: 0 }, scale: 1 });
    setStatus("Viewport reset");
  }, []);

  const handleZoomToFit = useCallback(() => {
    if (allNodes.length === 0) {
      setViewport({ origin: { x: 0, y: 0 }, scale: 1 });
      setStatus("Viewport centered on origin");
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    allNodes.forEach(nodeId => {
      const position = nodePositions[nodeId];
      if (!position) {
        return;
      }
      minX = Math.min(minX, position.x);
      minY = Math.min(minY, position.y);
      maxX = Math.max(maxX, position.x);
      maxY = Math.max(maxY, position.y);
    });
    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
      setViewport({ origin: { x: 0, y: 0 }, scale: 1 });
      setStatus("Viewport centered on origin");
      return;
    }
    const padding = NODE_MARGIN * 2;
    const width = Math.max(maxX - minX, 1);
    const height = Math.max(maxY - minY, 1);
    const widthWithPadding = width + padding;
    const heightWithPadding = height + padding;
    const scaleX = CANVAS_WIDTH / widthWithPadding;
    const scaleY = CANVAS_HEIGHT / heightWithPadding;
    const nextScale = clampScale(Math.min(scaleX, scaleY));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    setViewport({
      origin: {
        x: centerX - CANVAS_WIDTH / (2 * nextScale),
        y: centerY - CANVAS_HEIGHT / (2 * nextScale),
      },
      scale: nextScale,
    });
    setStatus("Framed circuit to fit viewport");
  }, [allNodes, nodePositions, clampScale]);

  const handleZoomSelection = useCallback(() => {
    const nodes = new Set<string>();
    selectedNodeIds.forEach(node => nodes.add(node));
    if (selectedComponentIds.size) {
      components.forEach(component => {
        if (selectedComponentIds.has(component.id)) {
          nodes.add(component.from);
          nodes.add(component.to);
        }
      });
    }
    if (nodes.size === 0) {
      handleZoomToFit();
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    nodes.forEach(nodeId => {
      const position = nodePositions[nodeId];
      if (!position) return;
      minX = Math.min(minX, position.x);
      minY = Math.min(minY, position.y);
      maxX = Math.max(maxX, position.x);
      maxY = Math.max(maxY, position.y);
    });
    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
      handleZoomToFit();
      return;
    }
    const padding = NODE_MARGIN * 2;
    const width = Math.max(maxX - minX, 1);
    const height = Math.max(maxY - minY, 1);
    const widthWithPadding = width + padding;
    const heightWithPadding = height + padding;
    const scaleX = CANVAS_WIDTH / widthWithPadding;
    const scaleY = CANVAS_HEIGHT / heightWithPadding;
    const nextScale = clampScale(Math.min(scaleX, scaleY));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    setViewport({
      origin: {
        x: centerX - CANVAS_WIDTH / (2 * nextScale),
        y: centerY - CANVAS_HEIGHT / (2 * nextScale),
      },
      scale: nextScale,
    });
  }, [
    selectedNodeIds,
    selectedComponentIds,
    components,
    nodePositions,
    clampScale,
    handleZoomToFit,
  ]);

  const clearSelection = useCallback(() => {
    setSelectedComponentIds(() => new Set());
    setSelectedComponentId(null);
    setSelectedNode(null);
    setSelectedNodeIds(() => new Set());
    setSelectingNodeField(null);
    setHoveredComponentId(null);
    setHoveredNodeId(null);
  }, []);

  useEffect(() => {
    if (!components.length) return;
    handleZoomToFit();
  }, [components.length, handleZoomToFit]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      setIsSpacePressed(true);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    setNodePositions(prev => {
      const next = { ...prev };
      let changed = false;
      Object.keys(next).forEach(key => {
        if (!allNodes.includes(key)) {
          delete next[key];
          changed = true;
        }
      });
      allNodes.forEach((node, index) => {
        if (!next[node]) {
          next[node] = defaultNodePosition(index);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [allNodes]);

  useEffect(() => {
    if (allNodes.length === 0) return;
    setNewComponent(prev => {
      let changed = false;
      let nextFrom = prev.from;
      let nextTo = prev.to;
      if (!allNodes.includes(nextFrom)) {
        nextFrom = allNodes[0];
        changed = true;
      }
      if (prev.kind === "ground") {
        if (nextTo !== CANONICAL_GROUND) {
          nextTo = CANONICAL_GROUND;
          changed = true;
        }
      } else if (!allNodes.includes(nextTo)) {
        nextTo = allNodes[Math.min(1, allNodes.length - 1)] ?? nextFrom;
        changed = true;
      }
      return changed ? { ...prev, from: nextFrom, to: nextTo } : prev;
    });
  }, [allNodes]);

  useEffect(() => {
    setProbes(prev => {
      const filtered = prev.filter(probe => allNodes.includes(probe.nodeId));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [allNodes]);

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
    const nodes = new Set<string>(allNodes);
    if (result) {
      Object.keys(result.nodeVoltages).forEach(node => nodes.add(node));
    }
    Object.keys(symbolicResult.nodeVoltages).forEach(node => nodes.add(node));
    return Array.from(nodes);
  }, [allNodes, result, symbolicResult]);

  const selectedComponents = useMemo(
    () => components.filter(component => selectedComponentIds.has(component.id)),
    [components, selectedComponentIds]
  );

  const selectedComponent = useMemo(() => {
    if (selectedComponentId && selectedComponentIds.has(selectedComponentId)) {
      return components.find(component => component.id === selectedComponentId) ?? null;
    }
    return selectedComponents.length ? selectedComponents[selectedComponents.length - 1] : null;
  }, [components, selectedComponentId, selectedComponentIds, selectedComponents]);

  const highlightedNodes = useMemo(() => {
    const nodes = new Set<string>();
    selectedComponents.forEach(component => {
      nodes.add(component.from);
      nodes.add(component.to);
    });
    selectedNodeIds.forEach(id => nodes.add(id));
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
    if (hoveredNodeId) {
      nodes.add(hoveredNodeId);
    }
    return nodes;
  }, [
    selectedComponents,
    selectedNodeIds,
    selectingNodeField,
    newComponent.from,
    newComponent.to,
    selectedNode,
    hoveredNodeId,
  ]);

  const handleComponentKindSelect = (kind: CircuitKind) => {
    if (kind === "wire") {
      setNewComponent(prev => ({ ...prev, kind: "wire" }));
      setActiveTool("wire");
      setSelectingNodeField(null);
      setStatus("Wire tool active – click the canvas to place junctions and route wires.");
      return;
    }
    cancelWireDraft();
    setActiveTool("select");
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

  const handleNodeSelect = useCallback(
    (nodeId: string, options?: { additive?: boolean }) => {
      if (selectingNodeField) {
        setNewComponent(prev => ({ ...prev, [selectingNodeField]: nodeId }));
        setSelectingNodeField(null);
        return;
      }

      setSelectedNodeIds(prev => {
        const next = options?.additive ? new Set(prev) : new Set<string>();
        if (options?.additive) {
          if (next.has(nodeId)) {
            next.delete(nodeId);
          } else {
            next.add(nodeId);
          }
        } else {
          next.add(nodeId);
        }
        const nextArray = Array.from(next);
        setSelectedNode(nextArray.length ? nextArray[nextArray.length - 1] ?? null : null);
        return next;
      });

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
    },
    [selectingNodeField, setNewComponent, setSelectedNodeIds, setSelectedNode]
  );
  const handleMarqueeSelection = useCallback(
    ({ nodes, components, additive }: { nodes: string[]; components: string[]; additive: boolean }) => {
      const uniqueNodes = Array.from(new Set(nodes));
      const uniqueComponents = Array.from(new Set(components));

      setSelectedNodeIds(prev => {
        const next = additive ? new Set(prev) : new Set<string>();
        uniqueNodes.forEach(id => next.add(id));
        return next;
      });

      setSelectedComponentIds(prev => {
        const next = additive ? new Set(prev) : new Set<string>();
        uniqueComponents.forEach(id => next.add(id));
        return next;
      });

      if (!additive || uniqueNodes.length > 0) {
        setSelectedNode(uniqueNodes.length ? uniqueNodes[uniqueNodes.length - 1] : null);
      }
      if (!additive || uniqueComponents.length > 0) {
        const nextPrimary = uniqueComponents.length ? uniqueComponents[uniqueComponents.length - 1] : null;
        setSelectedComponentId(nextPrimary);
      }
    },
    [setSelectedNodeIds, setSelectedComponentIds, setSelectedNode, setSelectedComponentId]
  );

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
    const exists = allNodes.some(
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

  const handleRemoveNode = useCallback((nodeId: string) => {
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
    setProbes(prev => prev.filter(probe => probe.nodeId !== nodeId));

    if (removedComponents.size > 0) {
      setSelectedComponentIds(prev => {
        if (prev.size === 0) {
          return prev;
        }
        let changed = false;
        const next = new Set(prev);
        removedComponents.forEach(id => {
          if (next.delete(id)) {
            changed = true;
          }
        });
        return changed ? next : prev;
      });
      setSelectedComponentId(prev => (prev && removedComponents.has(prev) ? null : prev));
      setHoveredComponentId(prev => (prev && removedComponents.has(prev) ? null : prev));
    }

    setExtraNodes(prev => prev.filter(node => node !== nodeId));
    setNodePositions(prev => {
      const next = { ...prev };
      delete next[nodeId];
      return next;
    });
    setSelectedNodeIds(prev => {
      if (!prev.has(nodeId)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(nodeId);
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
        title: `Removed junction ${nodeId}`,
        description: `Detached ${removedComponents.size} component${removedComponents.size === 1 ? "" : "s"}.`,
      });
      setStatus(`Removed junction ${nodeId} and ${removedComponents.size} connected component${removedComponents.size === 1 ? "" : "s"}.`);
    } else {
      toast({
        title: `Removed junction ${nodeId}`,
      });
      setStatus(`Removed junction ${nodeId}.`);
    }
  }, []);

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
    const name = generateNodeName(allNodes);
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

  const createJunctionAt = useCallback(
    (position: NodePosition): string => {
      const snapped = applyNodeSnap(position);
      const existing = new Set<string>([...allNodes]);
      const name = generateNodeName(Array.from(existing));
      setExtraNodes(prev => (prev.includes(name) ? prev : [...prev, name]));
      setNodePositions(prev => ({
        ...prev,
        [name]: snapped,
      }));
      setSelectedNode(name);
      setSelectedNodeIds(prev => {
        const next = new Set(prev);
        next.add(name);
        return next;
      });
      return name;
    },
    [allNodes]
  );

  const discardJunction = useCallback(
    (nodeId: string) => {
      const inUse = components.some(component => component.from === nodeId || component.to === nodeId);
      if (inUse) {
        return;
      }
      setExtraNodes(prev => prev.filter(node => node !== nodeId));
      setNodePositions(prev => {
        if (!(nodeId in prev)) {
          return prev;
        }
        const next = { ...prev };
        delete next[nodeId];
        return next;
      });
      setSelectedNodeIds(prev => {
        if (!prev.has(nodeId)) {
          return prev;
        }
        const next = new Set(prev);
        next.delete(nodeId);
        return next;
      });
      setSelectedNode(prev => (prev === nodeId ? null : prev));
    },
    [components]
  );

  const cancelWireDraft = useCallback(() => {
    setWirePreview(null);
    setWireDraft(prev => {
      if (prev?.startWasNew) {
        discardJunction(prev.startNodeId);
      }
      return null;
    });
  }, [discardJunction]);

  interface WirePoint {
    nodeId: string;
    position: NodePosition;
    wasCreated: boolean;
  }

  const addComponent = useCallback(
    (stateOverride?: NewComponentState, anchor?: NodePosition) => {
      const placement = { ...(stateOverride ?? newComponent) };
      const kind = placement.kind;
      const isGround = kind === "ground";
      if (isGround) {
        placement.to = CANONICAL_GROUND;
      }
      const id = `${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

      const existingNodes = new Set<string>(allNodes);
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
    [newComponent, allNodes, nodePositions]
  );

  const handleWireStart = useCallback(
    (point: WirePoint) => {
      setActiveTool("wire");
      setWireDraft({
        startNodeId: point.nodeId,
        startPosition: point.position,
        startWasNew: point.wasCreated,
      });
      setWirePreview(point.position);
      setSelectedNode(point.nodeId);
      setSelectingNodeField(null);
      setStatus("Wire tool active – click to place junctions and route segments. Press Esc to cancel.");
    },
    [setStatus]
  );

  const handleWirePreviewUpdate = useCallback((position: NodePosition) => {
    setWirePreview(position);
  }, []);

  const handleWireComplete = useCallback(
    (point: WirePoint) => {
      if (!wireDraft) {
        return;
      }
      const fromId = wireDraft.startNodeId;
      const toId = point.nodeId;
      if (fromId === toId) {
        if (point.wasCreated) {
          discardJunction(point.nodeId);
        }
        setWirePreview(point.position);
        return;
      }
      addComponent(
        {
          ...DEFAULT_NEW_COMPONENT,
          kind: "wire",
          from: fromId,
          to: toId,
        },
        point.position
      );
      setStatus(`Wire routed ${fromId} → ${toId}`);
      setWireDraft({
        startNodeId: toId,
        startPosition: point.position,
        startWasNew: false,
      });
    setWirePreview(point.position);
    setSelectedNode(toId);
  },
  [wireDraft, addComponent, discardJunction, setStatus, setSelectedNode]
);

  const handleWireCancel = useCallback(() => {
    cancelWireDraft();
    setActiveTool("select");
  }, [cancelWireDraft]);

  useEffect(() => {
    if (activeTool !== "wire") {
      cancelWireDraft();
    }
  }, [activeTool, cancelWireDraft]);

  useEffect(() => {
    if (wireDraft && !allNodes.includes(wireDraft.startNodeId)) {
      cancelWireDraft();
    }
  }, [wireDraft, allNodes, cancelWireDraft]);

  const addProbe = useCallback(
    (nodeId: string) => {
      setProbes(prev => {
        if (prev.some(probe => probe.nodeId === nodeId)) {
          return prev;
        }
        return [
          ...prev,
          {
            id: `probe-${nodeId}-${Date.now().toString(36)}`,
            nodeId,
            offset: { x: 36, y: -52 },
          },
        ];
      });
      setStatus(`Probe attached to ${nodeId}`);
    },
    [setStatus]
  );

  const removeProbe = useCallback(
    (probeId: string) => {
      setProbes(prev => {
        const existing = prev.find(probe => probe.id === probeId);
        if (!existing) {
          return prev;
        }
        setStatus(`Removed probe from ${existing.nodeId}`);
        return prev.filter(probe => probe.id !== probeId);
      });
    },
    [setStatus]
  );

  const updateProbeOffset = useCallback((probeId: string, offset: { x: number; y: number }) => {
    setProbes(prev =>
      prev.map(probe => (probe.id === probeId ? { ...probe, offset } : probe))
    );
  }, []);

  const removeComponents = useCallback(
    (ids: Iterable<string>) => {
      const removalSet = new Set(ids);
      if (removalSet.size === 0) {
        return;
      }

      setComponents(prev => prev.filter(component => !removalSet.has(component.id)));

      setSelectedComponentIds(prev => {
        if (prev.size === 0) {
          return prev;
        }
        let changed = false;
        const next = new Set(prev);
        removalSet.forEach(id => {
          if (next.delete(id)) {
            changed = true;
          }
        });
        if (!changed) {
          return prev;
        }
        const nextArray = Array.from(next);
        setSelectedComponentId(nextArray.length ? nextArray[nextArray.length - 1] ?? null : null);
        return next;
      });

      setHoveredComponentId(prev => (prev && removalSet.has(prev) ? null : prev));
      const removedCount = removalSet.size;
      const removedIds = Array.from(removalSet);
      setStatus(removedCount === 1 ? `Removed component ${removedIds[0]}` : `Removed ${removedCount} components`);
    },
    []
  );

  const removeComponent = useCallback((id: string) => removeComponents([id]), [removeComponents]);

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
    (componentId: string, options?: { additive?: boolean }) => {
      const component = components.find(comp => comp.id === componentId) ?? null;
      if (component && !options?.additive) {
        const preferred = component.from.toLowerCase() === "gnd" ? component.to : component.from;
        setSelectedNode(preferred);
        setSelectedNodeIds(new Set([preferred]));
      }

      setSelectedComponentIds(prev => {
        const next = options?.additive ? new Set(prev) : new Set<string>();
        if (options?.additive) {
          if (next.has(componentId)) {
            next.delete(componentId);
          } else {
            next.add(componentId);
          }
        } else {
          next.add(componentId);
        }
        const nextArray = Array.from(next);
        setSelectedComponentId(nextArray.length ? nextArray[nextArray.length - 1] ?? null : null);
        return next;
      });

      setHoveredComponentId(componentId);
    },
    [
      components,
      setSelectedNode,
      setSelectedNodeIds,
      setSelectedComponentIds,
      setSelectedComponentId,
      setHoveredComponentId,
    ]
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
        if (hotkeyKind === "wire") {
          setNewComponent(prev => ({ ...prev, kind: "wire" }));
          setActiveTool("wire");
          setSelectingNodeField(null);
          setStatus("Wire tool active – click to place junctions and route wires.");
        } else {
          cancelWireDraft();
          setActiveTool("select");
          setNewComponent(prev => stageComponentFromKind(prev, hotkeyKind));
          setSelectingNodeField(hotkeyKind === "ground" ? "from" : null);
        }
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        if (selectedComponentIds.size > 0) {
          event.preventDefault();
          removeComponents(selectedComponentIds);
          return;
        }
        if (selectedNodeIds.size > 0) {
          event.preventDefault();
          const nodesToRemove = Array.from(selectedNodeIds);
          nodesToRemove.forEach(nodeId => handleRemoveNode(nodeId));
          return;
        }
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        addComponent();
        return;
      }

      if (event.key === "Escape") {
        if (wireDraft || selectingNodeField || selectedComponentId || hoveredComponentId || selectedNode) {
          event.preventDefault();
          cancelWireDraft();
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
    selectedComponentIds,
    selectedNodeIds,
    removeComponents,
    handleRemoveNode,
    addComponent,
    selectingNodeField,
    hoveredComponentId,
    selectedNode,
    wireDraft,
    cancelWireDraft,
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

  const handleNodeHover = useCallback((nodeId: string | null) => {
    setHoveredNodeId(nodeId);
  }, []);

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

  const displayedStatus = status && status.trim().length ? status : "Workspace ready.";

  return (
    <div className="flex h-full flex-col bg-slate-100">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex h-full flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="min-w-[220px]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Circuit workspace</p>
          <p className="text-sm font-medium text-slate-800">{displayedStatus}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Load preset
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[260px] space-y-1">
              {CIRCUIT_PRESETS.map(preset => (
                <DropdownMenuItem
                  key={preset.id}
                  className="space-y-1"
                  onSelect={() => loadPreset(preset.id)}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{preset.label}</span>
                    <span className="text-xs text-slate-600">{preset.description}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={clearSelection}>
            <Eraser className="mr-2 h-4 w-4" />
            Clear selection
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomSelection}>
            <Target className="mr-2 h-4 w-4" />
            Zoom selection
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomToFit}>
            <Scan className="mr-2 h-4 w-4" />
            Frame all
          </Button>
          <Button size="sm" onClick={simulate}>
            <Play className="mr-2 h-4 w-4" />
            Run
          </Button>
        </div>
      </div>
      <Card className="flex-1 overflow-hidden border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid h-full min-h-0 gap-6 xl:grid-cols-[300px,1fr]">
          <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-2">
            <ComponentPalette
              selectedKind={newComponent.kind}
              onSelect={handleComponentKindSelect}
            />
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Placement</p>
                  <p className="text-[11px] text-slate-600">
                    Drop or place components to auto-create nodes. Snap overlapping nodes to connect nets.
                  </p>
                </div>
                <Badge variant="secondary" className="font-mono">
                  {getComponentGlyph(newComponent.kind)}
                </Badge>
              </div>
              <div className="rounded border border-slate-200 bg-white px-3 py-2 font-mono text-[11px] text-slate-700">
                {`${newComponent.from || "auto"} → ${newComponent.to || "auto"}`}
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-2">
                  <Label className="w-20">Type</Label>
                  <Select value={newComponent.kind} onValueChange={value => handleComponentKindSelect(value as CircuitKind)}>
                    <SelectTrigger className="w-full">
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
                <div className={cn("flex items-center gap-2", newComponent.kind === "ground" && "md:col-span-2")}>
                  <Label className="w-20">From</Label>
                  <Select
                    value={newComponent.from ? newComponent.from : AUTO_NODE_VALUE}
                    onValueChange={value =>
                      setNewComponent(prev => ({
                        ...prev,
                        from: value === AUTO_NODE_VALUE ? "" : value,
                      }))
                    }
                  >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Auto" />
                  </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AUTO_NODE_VALUE}>Auto</SelectItem>
                      {allNodes.map(node => (
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
                   <SelectTrigger className="w-full">
                      <SelectValue placeholder="Auto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AUTO_NODE_VALUE}>Auto</SelectItem>
                      {allNodes.map(node => (
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
                        <SelectTrigger className="w-full">
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
                <span className="text-xs text-slate-600">
                  Drop components onto the sheet, then draw wires with W or by clicking junctions.
                </span>
              </div>
            </div>
          <Card className="space-y-4 border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold">Workflow Tips</h3>
            <ShortcutLegend items={HOTKEY_HINTS} />
            <TipsList tips={EDITOR_TIPS} />
          </Card>
          </div>
          <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-2">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={activeTool === "select" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (activeTool !== "select") {
                      cancelWireDraft();
                      setActiveTool("select");
                    }
                  }}
                >
                  <MousePointer className="mr-2 h-4 w-4" />
                  Select
                </Button>
                <Button
                  variant={activeTool === "wire" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (activeTool === "wire") {
                      cancelWireDraft();
                      setActiveTool("select");
                    } else {
                      setNewComponent(prev => ({ ...prev, kind: "wire" }));
                      setActiveTool("wire");
                      setStatus("Wire tool active – click to place junctions and route wires.");
                    }
                  }}
                >
                  <PenTool className="mr-2 h-4 w-4" />
                  Wire
                </Button>
                <Badge variant="outline" className="font-mono text-[11px] text-slate-600">
                  Pan: hold Space
                </Badge>
                <Badge variant="outline" className="font-mono text-[11px] text-slate-600">
                  {SNAP_GRID_SIZE}px grid
                </Badge>
                <Button variant="outline" size="sm" onClick={handleAddNode}>
                  Add junction
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Button type="button" size="icon" variant="ghost" aria-label="Zoom out" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" aria-label="Zoom in" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" aria-label="Zoom to fit" onClick={handleZoomToFit}>
                  <Scan className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" aria-label="Reset viewport" onClick={handleResetViewport}>
                  <RefreshCcw className="h-4 w-4" />
                </Button>
                <Badge variant="secondary" className="ml-2 font-mono text-[11px]">
                  {`${Math.round(viewport.scale * 100)}%`}
                </Badge>
              </div>
            </div>
            {components.length === 0 && (
              <div className="rounded border border-dashed border-slate-300 bg-white/90 p-3 text-xs text-slate-600">
                Empty sheet — drag a component from the palette, or press R/C/L/V to place a part. Press W to draw wires.
              </div>
            )}
            <CircuitCanvas
              nodes={allNodes}
              components={components}
              nodePositions={nodePositions}
              activeTool={activeTool}
              wireDraft={wireDraft}
              wirePreview={wirePreview}
              selectingField={selectingNodeField}
              pendingConnection={{ from: newComponent.from, to: newComponent.to }}
              focusedComponentId={selectedComponentId}
              hoveredComponentId={hoveredComponentId}
              highlightedNodes={highlightedNodes}
              selectedComponentIds={selectedComponentIds}
              viewport={viewport}
              onViewportPan={updateViewportPan}
              onViewportZoom={updateViewportZoom}
              hoveredNodeId={hoveredNodeId}
              onNodePositionChange={handleNodePositionChange}
              onNodeSelect={handleNodeSelect}
              onNodeHover={handleNodeHover}
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
              onMarqueeSelection={handleMarqueeSelection}
              onWireStart={handleWireStart}
              onWirePreview={handleWirePreviewUpdate}
              onWireComplete={handleWireComplete}
              onWireCancel={handleWireCancel}
              onCreateJunction={createJunctionAt}
              onContextMenuRequest={({ clientX, clientY, nodeId, componentId }) => {
                setContextMenu({ x: clientX, y: clientY, nodeId: nodeId ?? undefined, componentId: componentId ?? undefined });
              }}
              probes={probeDisplays}
              onProbeOffsetChange={updateProbeOffset}
              onRemoveProbe={removeProbe}
              liveVoltages={liveVoltages}
              liveCurrents={liveCurrents}
              isSpacePressed={isSpacePressed}
            />
            {contextMenu && (
              <div
                className="fixed z-50 min-w-[180px] rounded-md border border-slate-200 bg-white p-2 text-sm shadow-lg"
                style={{ left: contextMenu.x + 4, top: contextMenu.y + 4 }}
                onMouseLeave={() => setContextMenu(null)}
              >
                <div className="flex flex-col gap-1">
                  {contextMenu.nodeId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start"
                      onClick={() => {
                        const nodeId = contextMenu.nodeId!;
                        const position = nodePositions[nodeId] ?? defaultNodePosition(0);
                        setActiveTool("wire");
                        setWireDraft({ startNodeId: nodeId, startPosition: position, startWasNew: false });
                        setWirePreview(position);
                        setContextMenu(null);
                        setStatus(`Wire tool active – starting at ${nodeId}`);
                      }}
                    >
                      Start wire here
                    </Button>
                  )}
                  {contextMenu.nodeId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start"
                      onClick={() => {
                        addProbe(contextMenu.nodeId!);
                        setContextMenu(null);
                      }}
                    >
                      Add probe on node
                    </Button>
                  )}
                  {contextMenu.componentId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start text-red-600 hover:text-red-600"
                      onClick={() => {
                        removeComponent(contextMenu.componentId!);
                        setContextMenu(null);
                      }}
                    >
                      Delete component
                    </Button>
                  )}
                  {!contextMenu.componentId && !contextMenu.nodeId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start"
                      onClick={() => {
                        handleZoomToFit();
                        setContextMenu(null);
                      }}
                    >
                      Zoom to fit
                    </Button>
                  )}
                </div>
              </div>
            )}
            <Card className="space-y-3 border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-700">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Symbolic differential equations
                </h4>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {differentialEquations.length}
                </Badge>
              </div>
              {differentialEquations.length ? (
                <div className="max-h-60 overflow-y-auto pr-1">
                  <DifferentialEquationList equations={differentialEquations} />
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  Run a simulation to derive the Laplace-domain model of this circuit.
                </p>
              )}
            </Card>
            <Collapsible open={showNodePanel} onOpenChange={setShowNodePanel}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300">
                <span>Nets & junctions ({allNodes.length})</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-slate-400 transition-transform duration-200",
                    showNodePanel ? "rotate-180" : "rotate-0"
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <NodeListEditor
                  nodes={allNodes}
                  connectionCounts={nodeConnectionCounts}
                  selectedNodeIds={selectedNodeIds}
                  onRename={handleRenameNode}
                  onRemove={handleRemoveNode}
                />
              </CollapsibleContent>
            </Collapsible>
            {selectingNodeField && (
              <p className="rounded bg-primary/5 px-3 py-1 text-xs text-primary">
                Click a junction to set the {selectingNodeField === "from" ? "start" : "end"} connection.
              </p>
            )}
          </div>
        </div>
      </Card>
      <div className="grid flex-1 min-h-0 gap-4 xl:grid-cols-[320px,1fr]">
        <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-2">
          <Card className="space-y-4 border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-800">Simulation Settings</h3>
              <Button size="sm" onClick={simulate}>
                <Play className="mr-2 h-4 w-4" />
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
                  <span className="min-w-[60px] text-right text-xs text-slate-600">
                    {currentTime.toFixed(4)}s
                  </span>
                </div>
              </div>
              {status && <p className="text-slate-600">{status}</p>}
            </div>
          </Card>
          <Card className="space-y-4 border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Netlist ({components.length})</h3>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {components.map(component => {
                const isActive = selectedComponentIds.has(component.id);
                const label = COMPONENT_LOOKUP[component.kind]?.label ?? component.kind;
                const fromLabel = component.from || "(unset)";
                const toLabel =
                  component.to || (component.kind === "ground" ? CANONICAL_GROUND : "(unset)");
                const valueLabel = componentValueLabel(component);
                return (
                  <div
                    key={component.id}
                    data-component-id={component.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isActive}
                    draggable
                    onDragStart={event => {
                      event.dataTransfer.setData(DRAG_DATA_COMPONENT, component.id);
                      event.dataTransfer.setData("text/plain", component.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={event => {
                      event.preventDefault();
                      handleComponentSelect(component.id, {
                        additive: event.shiftKey || event.metaKey || event.ctrlKey,
                      });
                    }}
                    onKeyDown={event => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleComponentSelect(component.id, {
                          additive: event.shiftKey || event.metaKey || event.ctrlKey,
                        });
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
                        {component.kind !== "wire" && (
                          <span className="font-mono text-[11px] text-primary/80">{valueLabel}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-slate-600">
                        <Badge variant="outline" className="font-mono text-[10px] uppercase">
                          {fromLabel}
                        </Badge>
                        <span aria-hidden="true" className="text-slate-600">
                          {"\u2192"}
                        </span>
                        <Badge variant="outline" className="font-mono text-[10px] uppercase">
                          {toLabel}
                        </Badge>
                      </div>
                      <span className="text-slate-600">{describeComponent(component)}</span>
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
                <p className="py-6 text-center text-xs text-slate-600">
                  Add components to build a circuit.
                </p>
              )}
            </div>
            {selectedComponent ? (
              <ComponentInspector
                component={selectedComponent}
                nodes={allNodes}
                onUpdate={updater =>
                  setComponents(prev =>
                    prev.map(comp => (comp.id === selectedComponent.id ? updater(comp) : comp))
                  )
                }
                onRemove={() => removeComponent(selectedComponent.id)}
              />
            ) : (
              <p className="text-xs text-slate-600">
                Select a component to inspect and tweak its parameters.
              </p>
            )}
          </Card>
        </div>
        <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-2">
          <Card className="flex-1 space-y-4 overflow-hidden border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Node Observations</h3>
              <span className="text-xs text-slate-600">
                {result ? `${result.time.length} samples` : "Simulate to view data"}
              </span>
            </div>
            {result ? (
              <div className="space-y-3 overflow-auto pr-1">
                {nodeList.length === 0 && (
                  <p className="text-xs text-slate-600">No non-ground nodes detected.</p>
                )}
                {nodeList.map(node => {
                  const voltages = result?.nodeVoltages[node];
                  const currents = result?.nodeCurrents[node];
                  const vNow = voltages ? voltages[playhead] ?? 0 : 0;
                  const iNow = currents ? currents[playhead] ?? 0 : 0;
                  const probeForNode = probes.find(probe => probe.nodeId === node) ?? null;
                  const hasProbe = Boolean(probeForNode);
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
                        <span className="flex items-center gap-2 font-semibold">
                          {node}
                          {hasProbe && (
                            <Badge variant="outline" className="font-mono text-[10px] uppercase text-primary">
                              Probe
                            </Badge>
                          )}
                        </span>
                        <span className="text-slate-600">
                          V = {voltages ? vNow.toFixed(4) : "n/a"} V, I = {currents ? iNow.toExponential(3) : "n/a"} A
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={hasProbe ? "default" : "outline"}
                          onClick={e => {
                            e.stopPropagation();
                            if (hasProbe && probeForNode) {
                              removeProbe(probeForNode.id);
                            } else {
                              addProbe(node);
                            }
                          }}
                        >
                          <Target className="mr-1 h-3 w-3" />
                          {hasProbe ? "Active" : "Probe"}
                        </Button>
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
              <div className="flex h-full items-center justify-center text-sm text-slate-600">
                Run a simulation to inspect node voltages and currents.
              </div>
            )}
          </Card>
          <Card className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Circuit Analysis</h3>
              <Badge variant="outline" className="font-mono text-[11px]">
                {differentialEquations.length}
              </Badge>
            </div>
            {metrics ? (
              <div className="grid gap-1 font-mono text-[11px] text-slate-600">
                <span>Steps: {metrics.steps}</span>
                <span>Assembly: {metrics.assemblyMs.toFixed(2)} ms</span>
                <span>Solve: {metrics.solveMs.toFixed(2)} ms</span>
                <span>Matrix size: {metrics.matrixSize}</span>
                <span>Components: {metrics.componentCount}</span>
              </div>
            ) : (
              <p className="text-xs text-slate-600">
                Run a simulation to populate timing metrics and symbolic equations.
              </p>
            )}
            <div className="max-h-64 overflow-auto">
              <DifferentialEquationList equations={differentialEquations} />
            </div>
          </Card>
          <Card className="flex-1 border border-slate-200 bg-white p-4 shadow-sm">
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
              <div className="flex h-full items-center justify-center text-sm text-slate-600">
                Click a node to inspect numeric and symbolic details.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
    <CircuitStatusBar
      mode={activeTool}
      gridSize={SNAP_GRID_SIZE}
      snapEnabled={true}
      cursorPosition={null}
      statusMessage={displayedStatus}
      showWarning={null}
    />
  </div>
  );
}


