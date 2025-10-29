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
  componentGlyph as getComponentGlyph,
} from "@/lib/circuits/editorModel";
import { componentStroke, renderComponentSymbol, describeComponent } from "./utils";
import { DRAG_DATA_COMPONENT, DRAG_DATA_KIND } from "./constants";
import type { SelectionRect, ViewportState } from "./types";

export interface CircuitCanvasProps {
  nodes: string[];
  components: CircuitComponent[];
  nodePositions: Record<string, NodePosition>;
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
  isSpacePressed?: boolean;
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
  isSpacePressed = false,
}: CircuitCanvasProps) => {
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
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    if (isPanning) {
      svg.style.cursor = "grabbing";
      return;
    }
    svg.style.cursor = isSpacePressed ? "grab" : "default";
  }, [isPanning, isSpacePressed]);
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

  const viewTransform = useMemo(() => {
    const translateX = (-viewport.origin.x) * viewport.scale;
    const translateY = (-viewport.origin.y) * viewport.scale;
    return `matrix(${viewport.scale} 0 0 ${viewport.scale} ${translateX} ${translateY})`;
  }, [viewport]);

  const clientToScreen = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
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

  const handleCanvasPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (isPanning && panStateRef.current && onViewportPan) {
      event.preventDefault();
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
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
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerCancel}
        onPointerLeave={() => onNodeHover?.(null)}
        onWheel={handleCanvasWheel}
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
          <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill={`url(#${majorGridId})`} pointerEvents="none" />
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
            const glyphFill = isFocused ? "hsl(var(--primary))" : "var(--muted-foreground)";
            const groupOpacity = isFocused ? 1 : isHovered ? 0.92 : 0.82;
            const handleSelect = (options?: { additive?: boolean }) =>
              onComponentSelect?.(component.id, options);

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
                <text
                  data-component-id={component.id}
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
          const isHovered = hoveredNodeId === nodeId;
          const isDraggingNode = dragState?.nodeId === nodeId;
          const ringColor =
            isDraggingNode
              ? "hsl(var(--primary))"
              : isActive || isHovered
              ? "hsl(var(--primary))"
              : isHighlighted
              ? "hsl(var(--primary) / 0.7)"
              : "rgba(148,163,184,0.8)";
          const strokeWidth = isDraggingNode ? 3.6 : isActive || isHovered ? 3 : isHighlighted ? 2.4 : 1.5;
          const coordinate = `${Math.round(position.x)}, ${Math.round(position.y)}`;
          return (
            <g key={nodeId} data-node-id={nodeId}>
              <title>{`${nodeId} \u2022 (${coordinate})`}</title>
              {isDraggingNode && (
                <circle
                  cx={position.x}
                  cy={position.y}
                  r={18}
                  fill="none"
                  stroke="hsl(var(--primary) / 0.45)"
                  strokeWidth={1.5}
                  strokeDasharray="6 6"
                  pointerEvents="none"
                />
              )}
              <circle
                data-node-id={nodeId}
                cx={position.x}
                cy={position.y}
                r={14}
                fill={
                  isGround
                    ? "#0f172a"
                    : isDraggingNode
                    ? "hsl(var(--primary) / 0.28)"
                    : isActive || isHovered
                    ? "hsl(var(--primary) / 0.22)"
                    : isHighlighted
                    ? "hsl(var(--primary) / 0.12)"
                    : "#1e293b"
                }
                opacity={isDraggingNode || isActive || isHovered || isHighlighted ? 0.6 : 0.25}
              />
              <circle
                data-node-id={nodeId}
                cx={position.x}
                cy={position.y}
                r={10}
                fill={isGround ? "#0f172a" : isDraggingNode ? "hsl(var(--primary) / 0.2)" : "#020817"}
                stroke={ringColor}
                strokeWidth={strokeWidth}
                onDragOver={handleNodeDragOver}
                onDrop={event => handleNodeDrop(nodeId, event)}
              />
                <text
                  x={position.x}
                  y={position.y + 24}
                  textAnchor="middle"
                  fill={isActive || isHovered || isHighlighted ? "hsl(var(--primary))" : "var(--foreground)"}
                  fontSize={11}
                  fontWeight={600}
                >
                  {nodeId}
                </text>
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
    </div>
  );
};

