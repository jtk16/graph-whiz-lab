import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseExpression } from "@/lib/parser";
import { parseAndEvaluate } from "@/lib/evaluator";
import { buildDefinitionContext, isImplicitRelation } from "@/lib/definitionContext";
import { ToolProps } from "@/lib/tools/types";
import { useTheme } from "next-themes";

interface WorkerRequest {
  jobId: string;
  expressionId: string;
  expression: string;
  definitions: Array<{ normalized: string }>;
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number };
  resolution: number;
}

interface WorkerResponse {
  jobId: string;
  expressionId: string;
  segments: Array<{ points: Array<{ x: number; y: number }> }>;
}

type ParsedExpression = {
  id: string;
  normalized: string;
  color: string;
  ast: ReturnType<typeof parseExpression>;
};

const DEFAULT_VIEWPORT = {
  xMin: -10,
  xMax: 10,
  yMin: -10,
  yMax: 10,
};

const TILE_RESOLUTION_FALLBACK = 64;

const resolveColor = (color: string, computed: CSSStyleDeclaration): string => {
  if (color.includes("var(--")) {
    const match = color.match(/var\((--[^)]+)\)/);
    if (match) {
      const value = computed.getPropertyValue(match[1]).trim();
      if (value) {
        return `hsl(${value})`;
      }
    }
  }
  return color;
};

const mapX = (x: number, width: number, viewport: typeof DEFAULT_VIEWPORT): number =>
  ((x - viewport.xMin) / (viewport.xMax - viewport.xMin)) * width;

const mapY = (y: number, height: number, viewport: typeof DEFAULT_VIEWPORT): number =>
  ((viewport.yMax - y) / (viewport.yMax - viewport.yMin)) * height;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const Graph2DTool = ({
  expressions,
  toolkitDefinitions,
  viewport: externalViewport,
  onViewportChange,
  isActive,
  toolConfig,
}: ToolProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridLayerRef = useRef<HTMLCanvasElement | null>(null);
  const staticDirtyRef = useRef(true);
  const renderRafRef = useRef<number | null>(null);
  const dirtyRef = useRef(true);
  const workerRef = useRef<Worker | null>(null);
  const pendingJobsRef = useRef<Map<string, string>>(new Map());
  const implicitSegmentsRef = useRef<Record<string, WorkerResponse["segments"]>>({});
  const pathCacheRef = useRef<Map<string, { key: string; path: Path2D }>>(new Map());
  const labelCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const [implicitVersion, setImplicitVersion] = useState(0);
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    screenX: number;
    screenY: number;
    expr: { color: string; latex: string; normalized: string };
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartViewport, setDragStartViewport] = useState(externalViewport || DEFAULT_VIEWPORT);
  const [scalingAxis, setScalingAxis] = useState<{
    axis: "x" | "y";
    startPos: number;
    startViewport: typeof DEFAULT_VIEWPORT;
  } | null>(null);
  const { theme, resolvedTheme } = useTheme();

  const viewport = externalViewport || DEFAULT_VIEWPORT;

  const definitionSources = useMemo(
    () => [...expressions, ...toolkitDefinitions].filter((expr) => expr.normalized.trim().includes("=")),
    [expressions, toolkitDefinitions]
  );

  const definitionContext = useMemo(() => buildDefinitionContext(definitionSources), [definitionSources]);

  const explicitExpressions = useMemo(
    () =>
      expressions.filter((expr) => {
        const normalized = expr.normalized.trim();
        if (!normalized) return false;
        if (!normalized.includes("=")) return true;
        const lhs = normalized.split("=")[0].trim();
        return lhs === "y";
      }),
    [expressions]
  );

  const implicitExpressions = useMemo(
    () =>
      expressions.filter((expr) => {
        const normalized = expr.normalized.trim();
        if (!normalized.includes("=")) return false;
        return isImplicitRelation(normalized);
      }),
    [expressions]
  );

  const parsedExplicit = useMemo(() => {
    const parsed = new Map<string, ParsedExpression>();
    explicitExpressions.forEach((expr) => {
      const normalized = expr.normalized.trim();
      if (!normalized) return;
      const rhs = normalized.includes("=") ? normalized.split("=")[1].trim() : normalized;
      try {
        const ast = parseExpression(rhs, definitionContext);
        parsed.set(expr.id, { id: expr.id, normalized: rhs, color: expr.color, ast });
      } catch (error) {
        console.warn("Failed to parse expression:", normalized, error);
      }
    });
    return parsed;
  }, [explicitExpressions, definitionContext]);

  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const computed = getComputedStyle(document.documentElement);
    const colors = {
      canvasBg: computed.getPropertyValue("--canvas-bg").trim(),
      gridLine: computed.getPropertyValue("--grid-line").trim(),
      axisLine: computed.getPropertyValue("--axis-line").trim(),
      foreground: computed.getPropertyValue("--foreground").trim(),
    };

    if (staticDirtyRef.current || !gridLayerRef.current) {
      gridLayerRef.current = createStaticLayer(rect.width, rect.height, viewport, colors, labelCacheRef.current);
      staticDirtyRef.current = false;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gridLayerRef.current) {
      ctx.drawImage(gridLayerRef.current, 0, 0);
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawImplicitCurves(
      ctx,
      rect.width,
      rect.height,
      viewport,
      implicitSegmentsRef.current,
      implicitExpressions.map(({ id, color }) => ({ id, color }))
    );
    drawExplicitCurves(ctx, rect.width, rect.height, viewport, parsedExplicit, pathCacheRef.current, definitionContext);
  }, [viewport, parsedExplicit, definitionContext, implicitExpressions]);

  const scheduleRender = useCallback(() => {
    if (!isActive) return;
    dirtyRef.current = true;
    if (renderRafRef.current !== null) return;
    renderRafRef.current = requestAnimationFrame(() => {
      renderRafRef.current = null;
      if (!dirtyRef.current) return;
      dirtyRef.current = false;
      drawScene();
    });
  }, [isActive, drawScene]);

  const disposeWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const worker = new Worker(new URL("@/workers/implicitCurve.worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;
    const handleMessage = (event: MessageEvent<WorkerResponse>) => {
      const { jobId, segments, expressionId } = event.data;
      if (pendingJobsRef.current.get(expressionId) !== jobId) {
        return;
      }
      pendingJobsRef.current.delete(expressionId);
      implicitSegmentsRef.current[expressionId] = segments;
      setImplicitVersion((prev) => prev + 1);
      scheduleRender();
    };
    worker.addEventListener("message", handleMessage);
    return () => {
      worker.removeEventListener("message", handleMessage);
      disposeWorker();
    };
  }, [disposeWorker, scheduleRender]);

  useEffect(() => {
    if (!workerRef.current || !isActive) return;
    const bounds = {
      xMin: viewport.xMin,
      xMax: viewport.xMax,
      yMin: viewport.yMin,
      yMax: viewport.yMax,
    };
    const resolution =
      typeof toolConfig?.implicitResolution === "number"
        ? Math.max(32, toolConfig.implicitResolution)
        : TILE_RESOLUTION_FALLBACK;

    implicitExpressions.forEach((expr) => {
      const key = [
        expr.id,
        bounds.xMin.toFixed(3),
        bounds.xMax.toFixed(3),
        bounds.yMin.toFixed(3),
        bounds.yMax.toFixed(3),
        resolution,
        expr.normalized,
      ].join("|");

      if (pendingJobsRef.current.get(expr.id) === key) return;
      pendingJobsRef.current.set(expr.id, key);

      const payload: WorkerRequest = {
        jobId: key,
        expressionId: expr.id,
        expression: expr.normalized,
        definitions: definitionSources.map((d) => ({ normalized: d.normalized })),
        bounds,
        resolution,
      };

      workerRef.current?.postMessage(payload);
    });
  }, [implicitExpressions, viewport, definitionSources, isActive, toolConfig, implicitVersion]);

  useEffect(() => {
    const activeIds = new Set(implicitExpressions.map((expr) => expr.id));
    let removed = false;
    Object.keys(implicitSegmentsRef.current).forEach((key) => {
      if (!activeIds.has(key)) {
        delete implicitSegmentsRef.current[key];
        removed = true;
      }
    });
    for (const [exprId] of Array.from(pendingJobsRef.current.keys())) {
      if (!activeIds.has(exprId)) {
        pendingJobsRef.current.delete(exprId);
      }
    }
    if (removed) {
      setImplicitVersion((prev) => prev + 1);
    }
  }, [implicitExpressions]);

  useEffect(() => {
    staticDirtyRef.current = true;
    scheduleRender();
    pathCacheRef.current.clear();
    labelCacheRef.current.clear();
  }, [viewport, theme, resolvedTheme, definitionContext, scheduleRender]);

  useEffect(() => {
    scheduleRender();
  }, [scheduleRender, parsedExplicit, implicitVersion]);

  useEffect(
    () => () => {
      if (renderRafRef.current) {
        cancelAnimationFrame(renderRafRef.current);
      }
    },
    []
  );

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onViewportChange) return;
    if (event.button === 1 || event.metaKey) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const axis = Math.abs(event.clientX - rect.left) > Math.abs(event.clientY - rect.top) ? "x" : "y";
      setScalingAxis({ axis, startPos: axis === "x" ? event.clientX : event.clientY, startViewport: viewport });
      return;
    }
    setIsDragging(true);
    setDragStart({ x: event.clientX, y: event.clientY });
    setDragStartViewport(viewport);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !onViewportChange) return;
    const rect = canvasRef.current.getBoundingClientRect();

    if (scalingAxis) {
      const delta =
        scalingAxis.axis === "x"
          ? (event.clientX - scalingAxis.startPos) / rect.width
          : (event.clientY - scalingAxis.startPos) / rect.height;
      const scaleFactor = Math.exp(-delta * 2);
      const vp = scalingAxis.startViewport;
      if (scalingAxis.axis === "x") {
        const xCenter = (vp.xMin + vp.xMax) / 2;
        const xRange = (vp.xMax - vp.xMin) * scaleFactor;
        onViewportChange({
          ...vp,
          xMin: xCenter - xRange / 2,
          xMax: xCenter + xRange / 2,
        });
      } else {
        const yCenter = (vp.yMin + vp.yMax) / 2;
        const yRange = (vp.yMax - vp.yMin) * scaleFactor;
        onViewportChange({
          ...vp,
          yMin: yCenter - yRange / 2,
          yMax: yCenter + yRange / 2,
        });
      }
      return;
    }

    if (isDragging) {
      const dx = event.clientX - dragStart.x;
      const dy = event.clientY - dragStart.y;
      const xRange = dragStartViewport.xMax - dragStartViewport.xMin;
      const yRange = dragStartViewport.yMax - dragStartViewport.yMin;
      const xShift = -(dx / rect.width) * xRange;
      const yShift = (dy / rect.height) * yRange;
      onViewportChange({
        xMin: dragStartViewport.xMin + xShift,
        xMax: dragStartViewport.xMax + xShift,
        yMin: dragStartViewport.yMin + yShift,
        yMax: dragStartViewport.yMax + yShift,
      });
      return;
    }

    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;
    const nearest = findNearestPoint(
      canvasX,
      canvasY,
      rect.width,
      rect.height,
      viewport,
      parsedExplicit,
      expressions,
      definitionContext
    );
    setHoveredPoint(nearest);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setScalingAxis(null);
  };

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    if (!onViewportChange) return;
    event.preventDefault();
    const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9;
    const xCenter = (viewport.xMin + viewport.xMax) / 2;
    const yCenter = (viewport.yMin + viewport.yMax) / 2;
    const xRange = (viewport.xMax - viewport.xMin) * zoomFactor;
    const yRange = (viewport.yMax - viewport.yMin) * zoomFactor;
    onViewportChange({
      xMin: xCenter - xRange / 2,
      xMax: xCenter + xRange / 2,
      yMin: yCenter - yRange / 2,
      yMax: yCenter + yRange / 2,
    });
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          cursor: scalingAxis ? (scalingAxis.axis === "x" ? "ew-resize" : "ns-resize") : isDragging ? "grabbing" : "grab",
        }}
      />
      {hoveredPoint && (
        <div
          className="absolute bg-background/95 border border-border text-foreground px-3 py-2 rounded-lg text-sm pointer-events-none shadow-lg backdrop-blur-sm z-10"
          style={{
            left: hoveredPoint.screenX + 15,
            top: hoveredPoint.screenY - 50,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: hoveredPoint.expr.color }} />
            <span className="font-medium text-xs opacity-70">
              {hoveredPoint.expr.latex || hoveredPoint.expr.normalized}
            </span>
          </div>
          <div className="font-mono font-semibold">
            ({hoveredPoint.x.toFixed(4)}, {hoveredPoint.y.toFixed(4)})
          </div>
        </div>
      )}
    </div>
  );
};

const createStaticLayer = (
  width: number,
  height: number,
  viewport: typeof DEFAULT_VIEWPORT,
  colors: Record<string, string>,
  labelCache: Map<string, HTMLCanvasElement>
) => {
  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement("canvas");
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = `hsl(${colors.canvasBg})`;
  ctx.fillRect(0, 0, width, height);
  drawGrid(ctx, width, height, viewport, colors.gridLine, colors.foreground, labelCache);
  drawAxes(ctx, width, height, viewport, colors.axisLine, colors.canvasBg, colors.foreground, labelCache);
  return canvas;
};

const drawGrid = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  viewport: typeof DEFAULT_VIEWPORT,
  gridColor: string,
  labelColor: string,
  labelCache: Map<string, HTMLCanvasElement>
) => {
  ctx.save();
  ctx.strokeStyle = `hsl(${gridColor})`;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.35;

  const step = chooseStep(viewport.xMin, viewport.xMax, width);
  for (let x = Math.ceil(viewport.xMin / step) * step; x <= viewport.xMax; x += step) {
    const px = mapX(x, width, viewport);
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, height);
    ctx.stroke();
  }

  const yStep = chooseStep(viewport.yMin, viewport.yMax, height);
  for (let y = Math.ceil(viewport.yMin / yStep) * yStep; y <= viewport.yMax; y += yStep) {
    const py = mapY(y, height, viewport);
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(width, py);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  const font = "12px var(--font-mono, ui-monospace)";
  for (let x = Math.ceil(viewport.xMin / step) * step; x <= viewport.xMax; x += step) {
    const px = mapX(x, width, viewport);
    drawLabelSprite(ctx, formatTick(x), px, height - 10, font, `hsl(${labelColor})`, "center", "bottom", labelCache);
  }

  for (let y = Math.ceil(viewport.yMin / yStep) * yStep; y <= viewport.yMax; y += yStep) {
    const py = mapY(y, height, viewport);
    drawLabelSprite(ctx, formatTick(y), 14, py, font, `hsl(${labelColor})`, "left", "middle", labelCache);
  }
  ctx.restore();
};

const drawAxes = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  viewport: typeof DEFAULT_VIEWPORT,
  axisColor: string,
  canvasBg: string,
  labelColor: string,
  labelCache: Map<string, HTMLCanvasElement>
) => {
  const axisX = mapY(0, height, viewport);
  const axisY = mapX(0, width, viewport);
  ctx.save();
  ctx.strokeStyle = `hsl(${axisColor})`;
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  if (axisX >= 0 && axisX <= height) {
    ctx.moveTo(0, axisX);
    ctx.lineTo(width, axisX);
  }
  if (axisY >= 0 && axisY <= width) {
    ctx.moveTo(axisY, 0);
    ctx.lineTo(axisY, height);
  }
  ctx.stroke();
  ctx.restore();

  ctx.save();
  const font = "14px var(--font-mono, ui-monospace)";
  if (axisY >= 0 && axisY <= width) {
    drawLabelSprite(
      ctx,
      "y",
      clamp(axisY - 6, 6, width - 6),
      10,
      font,
      `hsl(${labelColor})`,
      "right",
      "top",
      labelCache
    );
  }
  if (axisX >= 0 && axisX <= height) {
    drawLabelSprite(
      ctx,
      "x",
      width - 10,
      clamp(axisX - 6, 6, height - 6),
      font,
      `hsl(${labelColor})`,
      "left",
      "bottom",
      labelCache
    );
  }
  ctx.restore();
};

const chooseStep = (min: number, max: number, pixels: number) => {
  const targetLines = pixels / 80;
  const rawStep = (max - min) / targetLines;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const candidates = [1, 2, 2.5, 5, 10];
  const normalized = rawStep / magnitude;
  const step = candidates.find((c) => c >= normalized) ?? 10;
  return step * magnitude;
};

const drawLabelSprite = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string,
  align: CanvasTextAlign,
  baseline: CanvasTextBaseline,
  cache: Map<string, HTMLCanvasElement>
) => {
  const sprite = getLabelSprite(text, font, color, cache);
  if (!sprite) return;
  const dpr = window.devicePixelRatio || 1;
  const width = sprite.width / dpr;
  const height = sprite.height / dpr;
  let offsetX = x;
  if (align === "center") {
    offsetX -= width / 2;
  } else if (align === "right") {
    offsetX -= width;
  }
  let offsetY = y;
  switch (baseline) {
    case "middle":
      offsetY -= height / 2;
      break;
    case "bottom":
    case "ideographic":
    case "alphabetic":
      offsetY -= height;
      break;
    case "hanging":
      offsetY += 0;
      break;
    case "top":
    default:
      break;
  }
  ctx.drawImage(sprite, offsetX, offsetY, width, height);
};

const getLabelSprite = (
  text: string,
  font: string,
  color: string,
  cache: Map<string, HTMLCanvasElement>
) => {
  const key = `${font}|${color}|${text}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  if (!measureCtx) return null;
  measureCtx.font = font;
  const metrics = measureCtx.measureText(text);
  const fontMatch = font.match(/(\d+(\.\d+)?)px/);
  const fontSize = fontMatch ? Number(fontMatch[1]) : 12;
  const padding = 4;
  const width = Math.ceil(metrics.width + padding * 2);
  const height = Math.ceil(fontSize + padding * 2);
  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement("canvas");
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(dpr, dpr);
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(text, padding, padding);
  cache.set(key, canvas);
  return canvas;
};

const formatTick = (value: number) => {
  if (Math.abs(value) < 1e-3 || Math.abs(value) > 1e4) {
    return value.toExponential(1);
  }
  if (Math.abs(value) < 1) {
    return value.toFixed(2);
  }
  if (Math.abs(value) < 10) {
    return value.toFixed(1);
  }
  return value.toFixed(0);
};

const drawExplicitCurves = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  viewport: typeof DEFAULT_VIEWPORT,
  parsedExpressions: Map<string, ParsedExpression>,
  cache: Map<string, { key: string; path: Path2D }>,
  context: ReturnType<typeof buildDefinitionContext>
) => {
  const computed = getComputedStyle(document.documentElement);
  parsedExpressions.forEach((expr, exprId) => {
    const cacheKey = [
      exprId,
      viewport.xMin.toFixed(3),
      viewport.xMax.toFixed(3),
      viewport.yMin.toFixed(3),
      viewport.yMax.toFixed(3),
      width,
      height,
    ].join("|");

    let cached = cache.get(exprId);
    if (!cached || cached.key !== cacheKey) {
      const path = new Path2D();
      const samplesPerPixel = 1.5;
      const totalSamples = Math.max(200, Math.floor(width * samplesPerPixel));
      const xRange = viewport.xMax - viewport.xMin;
      let started = false;
      let prevY: number | null = null;
      for (let i = 0; i <= totalSamples; i++) {
        const x = viewport.xMin + (i / totalSamples) * xRange;
        const px = mapX(x, width, viewport);
        try {
          const y = parseAndEvaluate(expr.normalized, x, expr.ast, context);
          if (!Number.isFinite(y)) {
            started = false;
            prevY = null;
            continue;
          }
          const py = mapY(y, height, viewport);
          if (prevY !== null && Math.abs(y - prevY) > (viewport.yMax - viewport.yMin) * 0.9) {
            started = false;
          }
          if (!started) {
            path.moveTo(px, py);
            started = true;
          } else {
            path.lineTo(px, py);
          }
          prevY = y;
        } catch {
          started = false;
          prevY = null;
        }
      }
      cache.set(exprId, { key: cacheKey, path });
      cached = { key: cacheKey, path };
    }
    ctx.save();
    ctx.strokeStyle = resolveColor(expr.color, computed);
    ctx.lineWidth = 2.2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke(cached.path);
    ctx.restore();
  });
};

const drawImplicitCurves = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  viewport: typeof DEFAULT_VIEWPORT,
  segments: Record<string, WorkerResponse["segments"]>,
  expressions: Array<{ id: string; color: string }>
) => {
  const computed = getComputedStyle(document.documentElement);
  expressions.forEach((expr) => {
    const data = segments[expr.id];
    if (!data) return;
    ctx.save();
    ctx.strokeStyle = resolveColor(expr.color, computed);
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    data.forEach((segment) => {
      if (!segment.points || segment.points.length < 2) return;
      ctx.beginPath();
      segment.points.forEach((point, index) => {
        const px = mapX(point.x, width, viewport);
        const py = mapY(point.y, height, viewport);
        if (index === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      });
      ctx.stroke();
    });
    ctx.restore();
  });
};

const findNearestPoint = (
  canvasX: number,
  canvasY: number,
  width: number,
  height: number,
  viewport: typeof DEFAULT_VIEWPORT,
  parsedExpressions: Map<string, ParsedExpression>,
  expressions: ToolProps["expressions"],
  context: ReturnType<typeof buildDefinitionContext>
) => {
  let nearest:
    | {
        x: number;
        y: number;
        screenX: number;
        screenY: number;
        expr: ToolProps["expressions"][number];
        distance: number;
      }
    | null = null;
  const threshold = 15;
  parsedExpressions.forEach((parsed, exprId) => {
    const exprMeta = expressions.find((expr) => expr.id === exprId);
    if (!exprMeta) return;
    const xRange = viewport.xMax - viewport.xMin;
    const samples = Math.max(200, width);
    for (let i = 0; i <= samples; i++) {
      const x = viewport.xMin + (i / samples) * xRange;
      const px = mapX(x, width, viewport);
      try {
        const y = parseAndEvaluate(parsed.normalized, x, parsed.ast, context);
        if (!Number.isFinite(y)) continue;
        const py = mapY(y, height, viewport);
        const dist = Math.hypot(px - canvasX, py - canvasY);
        if (dist < threshold && (!nearest || dist < nearest.distance)) {
          nearest = {
            x,
            y,
            screenX: px,
            screenY: py,
            expr: exprMeta,
            distance: dist,
          };
        }
      } catch {
        // ignore
      }
    }
  });
  return nearest;
};
