import {

  useCallback,

  useEffect,

  useMemo,

  useRef,

  useState,

  useId,

} from "react";

import type { CircuitComponent } from "@/lib/circuits/simulator";

import type { CircuitKind, NodePosition } from "@/lib/circuits/editorModel";

import {

  CANVAS_HEIGHT,

  CANVAS_WIDTH,

  SNAP_GRID_SIZE,

  applyNodeSnap,

  defaultNodePosition,

} from "@/lib/circuits/editorModel";

import {

  componentStroke,

  renderComponentSymbol,

  describeComponent,

  componentValueLabel,

} from "./utils";

import { DRAG_DATA_COMPONENT, DRAG_DATA_KIND } from "./constants";

import type { SelectionRect, ViewportState } from "./types";

export interface CircuitCanvasProps {

  nodes: string[];

  components: CircuitComponent[];

  nodePositions: Record<string, NodePosition>;

  activeTool: "select" | "wire";

  wireDraft: { startNodeId: string; startPosition: NodePosition } | null;

  wirePreview: NodePosition | null;

  selectingField: "from" | "to" | null;

  pendingConnection?: { from?: string; to?: string };

  focusedComponentId?: string | null;

  hoveredComponentId?: string | null;

  highlightedNodes?: Set<string>;

  hoveredNodeId?: string | null;

  selectedComponentIds: ReadonlySet<string>;

  viewport: ViewportState;

  onViewportPan?: (deltaScreen: { x: number; y: number }) => void;

  onViewportZoom?: (zoomFactor: number, screenPoint: { x: number; y: number }) => void;

  onNodePositionChange: (nodeId: string, position: NodePosition) => void;

  onNodeSelect: (nodeId: string, options?: { additive?: boolean }) => void;

  onNodeHover?: (nodeId: string | null) => void;

  onNodeFocus?: (nodeId: string) => void;

  onComponentHover?: (componentId: string | null) => void;

  onComponentSelect?: (componentId: string, options?: { additive?: boolean }) => void;

  onCanvasDropComponentKind?: (kind: CircuitKind, position?: NodePosition) => void;

  onNodeDropComponentKind?: (kind: CircuitKind, nodeId: string) => void;

  onNodeDropComponentInstance?: (componentId: string, nodeId: string) => void;

  onMarqueeSelection?: (selection: {

    nodes: string[];

    components: string[];

    additive: boolean;

  }) => void;

  onWireStart?: (point: { nodeId: string; position: NodePosition; wasCreated: boolean }) => void;

  onWirePreview?: (position: NodePosition) => void;

  onWireComplete?: (point: { nodeId: string; position: NodePosition; wasCreated: boolean }) => void;

  onWireCancel?: () => void;

  onCreateJunction?: (position: NodePosition) => string | null;

  probes: Array<{ id: string; nodeId: string; offset: { x: number; y: number }; voltage: number | null; current: number | null }>;

  onProbeOffsetChange?: (probeId: string, offset: { x: number; y: number }) => void;

  onRemoveProbe?: (probeId: string) => void;

  liveVoltages?: Record<string, number>;

  liveCurrents?: Record<string, number>;

  voltageScale?: number;

  isSpacePressed?: boolean;

  onContextMenuRequest?: (info: { clientX: number; clientY: number; nodeId?: string; componentId?: string }) => void;

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

export const CircuitCanvas = ({

  nodes,

  components,

  nodePositions,

  activeTool,

  wireDraft,

  wirePreview,

  selectingField,

  pendingConnection,

  focusedComponentId,

  hoveredComponentId,

  highlightedNodes,

  hoveredNodeId,

  selectedComponentIds,

  viewport,

  onViewportPan,

  onViewportZoom,

  onNodePositionChange,

  onNodeSelect,

  onNodeHover,

  onNodeFocus,

  onComponentHover,

  onComponentSelect,

  onCanvasDropComponentKind,

  onNodeDropComponentKind,

  onNodeDropComponentInstance,

  onMarqueeSelection,

  onWireStart,

  onWirePreview,

  onWireComplete,

  onWireCancel,

  onCreateJunction,

  probes = [],

  onProbeOffsetChange,

  onRemoveProbe,

  liveVoltages,

  liveCurrents,

  voltageScale = 1,

  isSpacePressed = false,

}: CircuitCanvasProps) => {

  const containerRef = useRef<HTMLDivElement | null>(null);

  const [canvasSize, setCanvasSize] = useState({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

  const svgRef = useRef<SVGSVGElement | null>(null);

  const dragMovedRef = useRef(false);

  const [dragState, setDragState] = useState<{

    nodeId: string;

    pointerId: number;

    offsetX: number;

    offsetY: number;

  } | null>(null);

  const dragRafRef = useRef<number | null>(null);

  const pendingDragPosition = useRef<NodePosition | null>(null);

  const panStateRef = useRef<{ pointerX: number; pointerY: number } | null>(null);

  const [isPanning, setIsPanning] = useState(false);

  const isWireTool = activeTool === "wire";

  const probeMap = useMemo(() => new Map(probes.map(probe => [probe.id, probe])), [probes]);

  const [probeDrag, setProbeDrag] = useState<{

    probeId: string;

    pointerId: number;

    origin: { x: number; y: number };

    startOffset: { x: number; y: number };

  } | null>(null);

  useEffect(() => {

    if (typeof ResizeObserver === "undefined") {

      return;

    }

    const node = containerRef.current;

    if (!node) return;

    const observer = new ResizeObserver(entries => {

      const entry = entries[0];

      if (!entry) return;

      const { width, height } = entry.contentRect;

      setCanvasSize(prev => {

        const nextWidth = Math.max(width, 640);

        const nextHeight = Math.max(height, 420);

        if (Math.abs(prev.width - nextWidth) < 1 && Math.abs(prev.height - nextHeight) < 1) {

          return prev;

        }

        return { width: nextWidth, height: nextHeight };

      });

    });

    observer.observe(node);

    return () => observer.disconnect();

  }, []);

  useEffect(() => {

    const svg = svgRef.current;

    if (!svg) return;

    if (isPanning) {

      svg.style.cursor = "grabbing";

      return;

    }

    if (isWireTool) {

      svg.style.cursor = "crosshair";

      return;

    }

    svg.style.cursor = isSpacePressed ? "grab" : "default";

  }, [isPanning, isSpacePressed, isWireTool]);

  const marqueeStateRef = useRef<{

    pointerId: number;

    origin: NodePosition;

    additive: boolean;

  } | null>(null);

  const [marqueeRect, setMarqueeRect] = useState<SelectionRect | null>(null);

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

  const wireStartPosition =

    wireDraft ? resolvedPositions[wireDraft.startNodeId] ?? wireDraft.startPosition : null;

  const wirePreviewPath = useMemo(() => {

    if (!wireStartPosition || !wirePreview) return null;

    const { segments } = computeOrthogonalRoute(wireStartPosition, wirePreview);

    if (segments.length === 0) return null;

    const commands = [`M ${segments[0].start.x} ${segments[0].start.y}`];

    segments.forEach(segment => {

      commands.push(`L ${segment.end.x} ${segment.end.y}`);

    });

    return commands.join(" ");

  }, [wireStartPosition, wirePreview]);

  const isTransientStart = wireDraft ? !nodes.includes(wireDraft.startNodeId) : false;

  const previewMatchesNode =

    Boolean(wirePreview) &&

    nodes.some(node => {

      const pos = resolvedPositions[node];

      return pos && wirePreview && pos.x === wirePreview.x && pos.y === wirePreview.y;

    });

  const viewTransform = useMemo(() => {

    const translateX = (-viewport.origin.x) * viewport.scale;

    const translateY = (-viewport.origin.y) * viewport.scale;

    return `matrix(${viewport.scale} 0 0 ${viewport.scale} ${translateX} ${translateY})`;

  }, [viewport]);

  const clientToScreen = (clientX: number, clientY: number): { x: number; y: number } | null => {

    const rect = svgRef.current?.getBoundingClientRect();

    if (!rect || rect.width === 0 || rect.height === 0) return null;

    const width = canvasSize.width;

    const height = canvasSize.height;

    return {

      x: ((clientX - rect.left) / rect.width) * width,

      y: ((clientY - rect.top) / rect.height) * height,

    };

  };

  const getComponentIdFromEvent = (event: React.PointerEvent<SVGSVGElement> | PointerEvent): string | null => {

    const target = event.target as HTMLElement | null;

    if (!target) return null;

    const direct = target.getAttribute("data-component-id");

    if (direct) return direct;

    const node = target.closest("[data-component-id]");

    return node?.getAttribute("data-component-id") ?? null;

  };

  const getNodeIdFromEvent = (event: React.PointerEvent<SVGSVGElement> | PointerEvent): string | null => {

    const target = event.target as HTMLElement | null;

    if (!target) return null;

    const direct = target.getAttribute("data-node-id");

    if (direct) return direct;

    const parent = target.closest("[data-node-id]");

    return parent?.getAttribute("data-node-id") ?? null;

  };

  const releasePointerCapture = useCallback(

    (pointerId: number) => {

      const svg = svgRef.current;

      if (svg && svg.hasPointerCapture?.(pointerId)) {

        svg.releasePointerCapture(pointerId);

      }

    },

    []

  );

  const worldToScreen = (world: NodePosition): { x: number; y: number } => ({

    x: (world.x - viewport.origin.x) * viewport.scale,

    y: (world.y - viewport.origin.y) * viewport.scale,

  });

  const pointerToCanvas = (clientX: number, clientY: number): { x: number; y: number } | null => {

    const screen = clientToScreen(clientX, clientY);

    if (!screen) return null;

    return {

      x: screen.x / viewport.scale + viewport.origin.x,

      y: screen.y / viewport.scale + viewport.origin.y,

    };

  };

  const createSelectionRect = (a: NodePosition, b: NodePosition): SelectionRect => ({

    xMin: Math.min(a.x, b.x),

    yMin: Math.min(a.y, b.y),

    xMax: Math.max(a.x, b.x),

    yMax: Math.max(a.y, b.y),

  });

  const beginNodeDrag = (

    nodeId: string,

    event: React.PointerEvent<SVGSVGElement>,

    options?: { additive?: boolean }

  ) => {

    event.preventDefault();

    const pointer = pointerToCanvas(event.clientX, event.clientY);

    if (!pointer) return;

    const current = resolvedPositions[nodeId];

    dragMovedRef.current = false;

    onNodeHover?.(nodeId);

    triggerNodeSelection(nodeId, options);

    setDragState({

      nodeId,

      pointerId: event.pointerId,

      offsetX: pointer.x - current.x,

      offsetY: pointer.y - current.y,

    });

    event.currentTarget.setPointerCapture(event.pointerId);

  };

  const triggerNodeSelection = (nodeId: string, options?: { additive?: boolean }) => {

    onNodeFocus?.(nodeId);

    onNodeSelect(nodeId, options);

  };

  const beginProbeDrag = (

    probeId: string,

    event: React.PointerEvent<SVGGElement>

  ) => {

    if (!onProbeOffsetChange) return;

    event.preventDefault();

    const screen = clientToScreen(event.clientX, event.clientY);

    if (!screen) return;

    const probe = probeMap.get(probeId);

    if (!probe) return;

    setProbeDrag({

      probeId,

      pointerId: event.pointerId,

      origin: screen,

      startOffset: { ...probe.offset },

    });

    event.currentTarget.setPointerCapture(event.pointerId);

  };

  const handleCanvasPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {

    if (isPanning && panStateRef.current && onViewportPan) {

      event.preventDefault();

      const rect = svgRef.current?.getBoundingClientRect();

      if (!rect) return;

      const scaleX = canvasSize.width / rect.width;

      const scaleY = canvasSize.height / rect.height;

      const delta = {

        x: (event.clientX - panStateRef.current.pointerX) * scaleX,

        y: (event.clientY - panStateRef.current.pointerY) * scaleY,

      };

      if (delta.x !== 0 || delta.y !== 0) {

        onViewportPan(delta);

        panStateRef.current.pointerX = event.clientX;

        panStateRef.current.pointerY = event.clientY;

      }

      return;

    }

    if (isWireTool && wireDraft) {

      const pointer = pointerToCanvas(event.clientX, event.clientY);

      if (pointer) {

        onWirePreview?.(applyNodeSnap(pointer));

      }

    }

    if (marqueeStateRef.current) {

      event.preventDefault();

      const pointer = pointerToCanvas(event.clientX, event.clientY);

      if (!pointer) return;

      setMarqueeRect(createSelectionRect(marqueeStateRef.current.origin, pointer));

      return;

    }

    if (dragState) {

      return;

    }

    const screenPoint = clientToScreen(event.clientX, event.clientY);

    if (!screenPoint) return;

    if (onNodeHover) {

      let closestNodeId: string | null = null;

      let closestDistance = Infinity;

      nodes.forEach(nodeId => {

        const screenPos = worldToScreen(resolvedPositions[nodeId]);

        const distance = Math.hypot(screenPos.x - screenPoint.x, screenPos.y - screenPoint.y);

        if (distance < closestDistance) {

          closestDistance = distance;

          closestNodeId = nodeId;

        }

      });

      const thresholdPx = 28;

      onNodeHover(closestDistance <= thresholdPx ? closestNodeId : null);

    }

    if (onComponentHover) {

      const componentId = getComponentIdFromEvent(event.nativeEvent);

      if (componentId || hoveredComponentId) {

        onComponentHover(componentId ?? null);

      }

    }

  };

  const handleCanvasPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {

    const nodeId = getNodeIdFromEvent(event);

    const componentId = getComponentIdFromEvent(event.nativeEvent);

    const additive = event.shiftKey || event.metaKey || event.ctrlKey;

    const pointer = pointerToCanvas(event.clientX, event.clientY);

    if (isWireTool && event.button === 0 && !isSpacePressed) {

      event.preventDefault();

      if (!pointer) return;

      const snapped = applyNodeSnap(pointer);

      let resolvedNodeId = nodeId;

      let wasCreated = false;

      if (!resolvedNodeId && onCreateJunction) {

        const created = onCreateJunction(snapped);

        if (created) {

          resolvedNodeId = created;

          wasCreated = true;

        }

      }

      if (!resolvedNodeId) {

        return;

      }

      const resolvedPosition = resolvedPositions[resolvedNodeId] ?? snapped;

      if (!wireDraft) {

        onWireStart?.({ nodeId: resolvedNodeId, position: resolvedPosition, wasCreated });

        onWirePreview?.(snapped);

      } else {

        onWireComplete?.({ nodeId: resolvedNodeId, position: resolvedPosition, wasCreated });

      }

      return;

    }

    const shouldPan =

      isSpacePressed ||

      event.button === 1 ||

      event.button === 2 ||

      (!nodeId && !componentId && event.button === 0 && !additive);

    const shouldMarquee = !nodeId && !componentId && event.button === 0 && additive;

    if (shouldPan) {

      if (!onViewportPan) return;

      event.preventDefault();

      panStateRef.current = { pointerX: event.clientX, pointerY: event.clientY };

      setIsPanning(true);

      onNodeHover?.(null);

      onComponentHover?.(null);

      event.currentTarget.setPointerCapture(event.pointerId);

      return;

    }

    if (nodeId && event.button === 0) {

      beginNodeDrag(nodeId, event, { additive });

      return;

    }

    if (componentId && event.button === 0) {

      onComponentSelect?.(componentId, { additive });

      return;

    }

    if (shouldMarquee) {

      const origin = pointerToCanvas(event.clientX, event.clientY);

      if (!origin) return;

      marqueeStateRef.current = {

        pointerId: event.pointerId,

        origin,

        additive,

      };

      setMarqueeRect({ xMin: origin.x, yMin: origin.y, xMax: origin.x, yMax: origin.y });

      onNodeHover?.(null);

      onComponentHover?.(null);

      event.currentTarget.setPointerCapture(event.pointerId);

    }

  };

  const handleCanvasPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {

    if (marqueeStateRef.current) {

      const state = marqueeStateRef.current;

      const pointer = pointerToCanvas(event.clientX, event.clientY) ?? state.origin;

      const rect = createSelectionRect(state.origin, pointer);

      marqueeStateRef.current = null;

      setMarqueeRect(null);

      releasePointerCapture(event.pointerId);

      if (onMarqueeSelection) {

        const contains = (candidate: SelectionRect, position: NodePosition) =>

          position.x >= candidate.xMin &&

          position.x <= candidate.xMax &&

          position.y >= candidate.yMin &&

          position.y <= candidate.yMax;

        const nodesInRect = nodes.filter(node => contains(rect, resolvedPositions[node]));

        const componentsInRect = components.filter(component => {

          const fromPos = resolvedPositions[component.from];

          const toPos = resolvedPositions[component.to];

          if (!fromPos || !toPos) return false;

          return contains(rect, fromPos) && contains(rect, toPos);

        });

        onMarqueeSelection({

          nodes: Array.from(new Set(nodesInRect)),

          components: Array.from(new Set(componentsInRect.map(component => component.id))),

          additive: state.additive,

        });

      }

      return;

    }

    releasePointerCapture(event.pointerId);

    if (isPanning) {

      panStateRef.current = null;

      setIsPanning(false);

    }

  };

  const handleCanvasPointerCancel = (event: React.PointerEvent<SVGSVGElement>) => {

    if (marqueeStateRef.current) {

      marqueeStateRef.current = null;

      setMarqueeRect(null);

    }

    releasePointerCapture(event.pointerId);

    if (isPanning) {

      panStateRef.current = null;

      setIsPanning(false);

    }

    if (isWireTool) {

      onWireCancel?.();

    }

  };

  const handleCanvasWheel = (event: React.WheelEvent<SVGSVGElement>) => {

    if (!onViewportZoom) return;

    event.preventDefault();

    const screenPoint = clientToScreen(event.clientX, event.clientY);

    if (!screenPoint) return;

    const delta = event.deltaMode === 1 ? event.deltaY * 32 : event.deltaY;

    const factor = Math.exp(-delta * 0.0012);

    onViewportZoom(factor, screenPoint);

  };

  useEffect(() => {

    if (!dragState) return;

    const handlePointerMove = (event: PointerEvent) => {

      event.preventDefault();

      const pointer = pointerToCanvas(event.clientX, event.clientY);

      if (!pointer) return;

      dragMovedRef.current = true;

      pendingDragPosition.current = {

        x: pointer.x - dragState.offsetX,

        y: pointer.y - dragState.offsetY,

      };

      if (dragRafRef.current === null) {

        dragRafRef.current = window.requestAnimationFrame(() => {

          dragRafRef.current = null;

          if (pendingDragPosition.current) {

            onNodePositionChange(dragState.nodeId, pendingDragPosition.current);

            pendingDragPosition.current = null;

          }

        });

      }

    };

    const finalizeDrag = () => {

      if (dragRafRef.current !== null) {

        window.cancelAnimationFrame(dragRafRef.current);

        dragRafRef.current = null;

      }

      if (pendingDragPosition.current) {

        onNodePositionChange(dragState.nodeId, pendingDragPosition.current);

        pendingDragPosition.current = null;

      }

      releasePointerCapture(dragState.pointerId);

      dragMovedRef.current = false;

      setDragState(null);

      onNodeHover?.(null);

    };

    const handlePointerUp = () => {

      if (dragState && !dragMovedRef.current) {

        triggerNodeSelection(dragState.nodeId);

      }

      finalizeDrag();

    };

    const handlePointerCancel = () => {

      finalizeDrag();

    };

    window.addEventListener("pointermove", handlePointerMove);

    window.addEventListener("pointerup", handlePointerUp);

    window.addEventListener("pointercancel", handlePointerCancel);

    return () => {

      if (dragRafRef.current !== null) {

        window.cancelAnimationFrame(dragRafRef.current);

        dragRafRef.current = null;

      }

      pendingDragPosition.current = null;

      window.removeEventListener("pointermove", handlePointerMove);

      window.removeEventListener("pointerup", handlePointerUp);

      window.removeEventListener("pointercancel", handlePointerCancel);

    };

  }, [dragState, onNodePositionChange, onNodeFocus, onNodeSelect, viewport]);

  useEffect(() => {

    if (!probeDrag) return;

    const handlePointerMove = (event: PointerEvent) => {

      if (!onProbeOffsetChange) return;

      event.preventDefault();

      const screen = clientToScreen(event.clientX, event.clientY);

      if (!screen) return;

      const delta = {

        x: screen.x - probeDrag.origin.x,

        y: screen.y - probeDrag.origin.y,

      };

      const nextOffset = {

        x: probeDrag.startOffset.x + delta.x,

        y: probeDrag.startOffset.y + delta.y,

      };

      onProbeOffsetChange(probeDrag.probeId, nextOffset);

    };

    const handlePointerEnd = (event: PointerEvent) => {

      if (event.pointerId === probeDrag.pointerId) {

        releasePointerCapture(event.pointerId);

        setProbeDrag(null);

      }

    };

    window.addEventListener("pointermove", handlePointerMove);

    window.addEventListener("pointerup", handlePointerEnd);

    window.addEventListener("pointercancel", handlePointerEnd);

    return () => {

      window.removeEventListener("pointermove", handlePointerMove);

      window.removeEventListener("pointerup", handlePointerEnd);

      window.removeEventListener("pointercancel", handlePointerEnd);

    };

  }, [probeDrag, onProbeOffsetChange, releasePointerCapture]);

  const resolveDropPosition = (clientX: number, clientY: number): NodePosition | null => {

    const screen = clientToScreen(clientX, clientY);

    if (!screen) return null;

    const world = {

      x: screen.x / viewport.scale + viewport.origin.x,

      y: screen.y / viewport.scale + viewport.origin.y,

    };

    return applyNodeSnap(world);

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

  const gridBounds = useMemo(() => {

    const visibleWidth = canvasSize.width / viewport.scale;

    const visibleHeight = canvasSize.height / viewport.scale;

    const padding = SNAP_GRID_SIZE * 12;

    return {

      x: viewport.origin.x - padding,

      y: viewport.origin.y - padding,

      width: visibleWidth + padding * 2,

      height: visibleHeight + padding * 2,

    };

  }, [

    canvasSize.width,

    canvasSize.height,

    viewport.origin.x,

    viewport.origin.y,

    viewport.scale,

  ]);

  const zoomPercent = Math.round(viewport.scale * 100);

  return (

    <div

      ref={containerRef}

      className="relative flex-1 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/70"

      onDragOver={handleCanvasDragOver}

      onDrop={handleCanvasDrop}

    >

      <svg

        ref={svgRef}

        viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}

        className="h-full w-full select-none touch-none"

        onPointerDown={handleCanvasPointerDown}

        onPointerMove={handleCanvasPointerMove}

        onPointerUp={handleCanvasPointerUp}

        onPointerCancel={handleCanvasPointerCancel}

        onPointerLeave={() => onNodeHover?.(null)}

        onWheel={handleCanvasWheel}
        onContextMenu={event => {
          event.preventDefault();
          const componentId = getComponentIdFromEvent(event as any) || undefined;
          const nodeId = getNodeIdFromEvent(event as any) || undefined;
          if (typeof onContextMenuRequest === "function") {
            const anyEvent = event as any;
            const cx = anyEvent.clientX ?? anyEvent.nativeEvent?.clientX;
            const cy = anyEvent.clientY ?? anyEvent.nativeEvent?.clientY;
            onContextMenuRequest({ clientX: cx, clientY: cy, nodeId, componentId });
          }
        }}

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

        <g transform={viewTransform}>

          <rect

            x={gridBounds.x}

            y={gridBounds.y}

            width={gridBounds.width}

            height={gridBounds.height}

            fill={`url(#${majorGridId})`}

            opacity={0.92}

            pointerEvents="none"

          />

          <g pointerEvents="none" opacity={0.25}>

            <line x1={viewport.origin.x - gridBounds.width} y1={0} x2={viewport.origin.x + gridBounds.width} y2={0} stroke="rgba(148,163,184,0.4)" strokeWidth={1.2} strokeDasharray="6 6" />

            <line x1={0} y1={viewport.origin.y - gridBounds.height} x2={0} y2={viewport.origin.y + gridBounds.height} stroke="rgba(148,163,184,0.4)" strokeWidth={1.2} strokeDasharray="6 6" />

          </g>

          {components.map(component => {

            const start = resolvedPositions[component.from];

            const end = resolvedPositions[component.to];

            if (!start || !end || component.from === component.to) {

              return null;

            }

            const { segments, symbolStart, symbolEnd, orientation } = computeOrthogonalRoute(start, end);

            if (!segments || !symbolStart || !symbolEnd) {

              return null;

            }

            const length = Math.hypot(symbolEnd.x - symbolStart.x, symbolEnd.y - symbolStart.y);

            const baseColor = componentStroke(component.kind);

            const isSelected = selectedComponentIds.has(component.id);

            const isHovered = component.id === hoveredComponentId && !isSelected;

            const isFocused = component.id === focusedComponentId;

            const strokeWidth = isSelected ? 4 : isHovered ? 3.4 : 2.8;

            const accentColor = isSelected ? "hsl(var(--primary))" : baseColor;

            const midX = (start.x + end.x) / 2;

            const midY = (start.y + end.y) / 2;

            const groupOpacity = isFocused ? 1 : isHovered ? 0.92 : 0.82;

            const handleSelect = (options?: { additive?: boolean }) =>

              onComponentSelect?.(component.id, options);

            const label = componentValueLabel(component);

            const isHorizontal = orientation === "horizontal";

            const direction =

              orientation === "horizontal"

                ? symbolEnd.x >= symbolStart.x

                  ? 1

                  : -1

                : symbolEnd.y >= symbolStart.y

                ? 1

                : -1;

            const labelPosition = isHorizontal

              ? {

                  x: midX,

                  y: midY + 26,

                  anchor: "middle" as const,

                }

              : {

                  x: midX + (direction >= 0 ? 32 : -32),

                  y: midY + 4,

                  anchor: direction >= 0 ? ("start" as const) : ("end" as const),

                };

            const labelColor = isSelected ? "hsl(var(--primary))" : "var(--foreground)";

            return (

              <g

                data-component-id={component.id}

                key={component.id}

                role="button"

                tabIndex={0}

                aria-label={`${component.kind} from ${component.from} to ${component.to}`}

                aria-pressed={isSelected}

                onClick={event => {

                  event.preventDefault();

                  handleSelect({ additive: event.shiftKey || event.metaKey || event.ctrlKey });

                }}

                onKeyDown={event => {

                  if (event.key === "Enter" || event.key === " ") {

                    event.preventDefault();

                    handleSelect({ additive: event.shiftKey || event.metaKey || event.ctrlKey });

                  }

                }}

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

                      data-component-id={component.id}

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

                  data-component-id={component.id}

                  transform={composeSymbolTransform(symbolStart, symbolEnd, orientation)}

                  opacity={groupOpacity}

                >

                  {renderComponentSymbol(component.kind, length, accentColor, strokeWidth)}

                </g>

                {component.kind !== "wire" && (

                  <text

                    data-component-id={component.id}

                    x={labelPosition.x}

                    y={labelPosition.y}

                    textAnchor={labelPosition.anchor}

                    fill={labelColor}

                    fontSize={11}

                    fontWeight={500}

                    paintOrder="stroke"

                    stroke="rgba(10,15,28,0.75)"

                    strokeWidth={3}

                  >

                    {label}

                  </text>

                )}

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

          {wirePreviewPath && (

            <path

              d={wirePreviewPath}

              fill="none"

              stroke="hsl(var(--primary))"

              strokeWidth={2.4}

              strokeDasharray="4 4"

              opacity={0.75}

            />

          )}

          {wireStartPosition && isTransientStart && (

            <circle

              cx={wireStartPosition.x}

              cy={wireStartPosition.y}

              r={6}

              fill="hsl(var(--primary) / 0.2)"

              stroke="hsl(var(--primary))"

              strokeWidth={2}

              pointerEvents="none"

            />

          )}

          {wireStartPosition && wirePreview && !previewMatchesNode && (

            <circle

              cx={wirePreview.x}

              cy={wirePreview.y}

              r={4}

              fill="hsl(var(--primary))"

              stroke="hsl(var(--primary) / 0.5)"

              strokeWidth={1.2}

              pointerEvents="none"

            />

          )}

          {nodes.map(nodeId => {
            const position = resolvedPositions[nodeId];
            if (!position) {
              return null;
            }
            const isGround = nodeId.toLowerCase() === "gnd" || nodeId === "0";
            const isActive =
              (selectingField === "from" && highlightedFrom === nodeId) ||
              (selectingField === "to" && highlightedTo === nodeId);
            const isHighlighted = highlightedNodes?.has(nodeId);
            const isHovered = hoveredNodeId === nodeId;
            const isDraggingNode = dragState?.nodeId === nodeId;
            const showLabel = isActive || isHighlighted || isHovered || isDraggingNode;
            const nodeVoltage = liveVoltages?.[nodeId] ?? 0;
            const voltageIntensity =
              voltageScale > 0 ? Math.min(Math.abs(nodeVoltage) / voltageScale, 1) : 0;
            const markerRadius = isGround ? 6 : 5;
            const baseFill = isGround ? "#0f172a" : "#111827";
            const dynamicFill = isGround
              ? baseFill
              : `hsl(var(--primary) / ${0.25 + 0.45 * voltageIntensity})`;
            const ringColor = isGround
              ? "hsl(var(--primary))"
              : `hsl(var(--primary) / ${0.4 + 0.3 * voltageIntensity})`;
            const coordinate = `${Math.round(position.x)}, ${Math.round(position.y)}`;
            return (
              <g key={nodeId} data-node-id={nodeId}>
                <title>{`${nodeId} - (${coordinate})`}</title>
                <circle
                  data-node-id={nodeId}
                  cx={position.x}
                  cy={position.y}
                  r={markerRadius + 2.5}
                  fill="rgba(15,23,42,0.4)"
                  stroke="rgba(15,23,42,0.6)"
                  strokeWidth={1.4}
                />
                <circle
                  data-node-id={nodeId}
                  cx={position.x}
                  cy={position.y}
                  r={markerRadius}
                  fill={dynamicFill}
                  stroke={showLabel ? "hsl(var(--primary))" : ringColor}
                  strokeWidth={showLabel ? 2.4 : 1.6}
                  onDragOver={handleNodeDragOver}
                  onDrop={event => handleNodeDrop(nodeId, event)}
                />
                {showLabel && (
                  <text
                    x={position.x}
                    y={position.y + 18}
                    textAnchor="middle"
                    fill="hsl(var(--primary))"
                    fontSize={10}
                    fontWeight={600}
                    paintOrder="stroke"
                    stroke="rgba(10,15,28,0.75)"
                    strokeWidth={3}
                  >
                    {nodeId}
                  </text>
                )}
              </g>
            );
          })}
          {probes.map(probe => {
            const nodePosition = resolvedPositions[probe.nodeId];
            if (!nodePosition) {
              return null;
            }
            const offset = probe.offset ?? { x: 0, y: 0 };
            const overlayX = nodePosition.x + offset.x / viewport.scale;
            const overlayY = nodePosition.y + offset.y / viewport.scale;
            const voltageText =
              typeof probe.voltage === "number"
                ? `V ${probe.voltage.toFixed(2)}`
                : "V --";
            const currentText =
              typeof probe.current === "number"
                ? `I ${probe.current.toFixed(2)}`
                : "I --";
            return (
              <g key={probe.id} transform={`translate(${overlayX} ${overlayY})`}>
                <g
                  className="cursor-move"
                  onPointerDown={event => beginProbeDrag(probe.id, event)}
                >
                  <rect
                    x={-54}
                    y={-58}
                    width={118}
                    height={64}
                    rx={8}
                    fill="rgba(15,23,42,0.88)"
                    stroke="hsl(var(--primary) / 0.5)"
                    strokeWidth={1.2}
                  />
                  <text
                    x={0}
                    y={-34}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={600}
                    fill="hsl(var(--primary))"
                  >
                    {probe.nodeId}
                  </text>
                  <text
                    x={0}
                    y={-12}
                    textAnchor="middle"
                    fontSize={11}
                    fill="var(--foreground)"
                  >
                    {voltageText}
                  </text>
                  <text
                    x={0}
                    y={8}
                    textAnchor="middle"
                    fontSize={11}
                    fill="var(--foreground)"
                  >
                    {currentText}
                  </text>
                </g>
                {onRemoveProbe && (
                  <g
                    transform="translate(52 -56)"
                    onPointerDown={event => event.stopPropagation()}
                    onClick={() => onRemoveProbe(probe.id)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={-10}
                      y={-10}
                      width={20}
                      height={20}
                      rx={4}
                      fill="rgba(15,23,42,0.95)"
                      stroke="hsl(var(--primary) / 0.4)"
                      strokeWidth={1}
                    />
                    <text
                      x={0}
                      y={4}
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight={600}
                      fill="hsl(var(--primary))"
                    >
                      ×
                    </text>
                  </g>
                )}
              </g>
            );
          })}
          {marqueeRect && (

            <rect

              x={marqueeRect.xMin}

              y={marqueeRect.yMin}

              width={Math.max(marqueeRect.xMax - marqueeRect.xMin, 0)}

              height={Math.max(marqueeRect.yMax - marqueeRect.yMin, 0)}

              fill="hsl(var(--primary) / 0.12)"

              stroke="hsl(var(--primary))"

              strokeDasharray="6 4"

              pointerEvents="none"

            />

          )}

        </g>

      </svg>

      <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-1 rounded bg-slate-900/70 px-2 py-1 text-[11px] font-mono text-slate-200/90 shadow-sm">

        <span>{zoomPercent}% - origin ({Math.round(viewport.origin.x)}, {Math.round(viewport.origin.y)})</span>

        <span>{nodes.length} nodes - {components.length} components</span>

      </div>

    </div>

  );

};
