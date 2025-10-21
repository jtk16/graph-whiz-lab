import { useEffect, useRef, useState } from "react";
import { parseExpression } from "@/lib/parser";
import { parseAndEvaluate } from "@/lib/evaluator";
import { buildDefinitionContext, DefinitionContext } from "@/lib/definitionContext";

interface Expression {
  id: string;
  latex: string;
  normalized: string;
  color: string;
}

interface GraphCanvasProps {
  expressions: Expression[];
  viewport: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
  };
  onViewportChange: (viewport: GraphCanvasProps['viewport']) => void;
}

export const GraphCanvas = ({ expressions, viewport, onViewportChange }: GraphCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartViewport, setDragStartViewport] = useState(viewport);

  useEffect(() => {
    // Build definition context from all expressions
    const context = buildDefinitionContext(expressions);
    console.log('Definition context:', context);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.scale(dpr, dpr);

    // Get computed styles for colors
    const computedStyle = getComputedStyle(canvas);
    const canvasBg = computedStyle.getPropertyValue('--canvas-bg').trim();
    const gridLine = computedStyle.getPropertyValue('--grid-line').trim();
    const axisLine = computedStyle.getPropertyValue('--axis-line').trim();

    // Clear canvas
    ctx.fillStyle = `hsl(${canvasBg})`;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw grid
    drawGrid(ctx, rect.width, rect.height, viewport, gridLine);

    // Draw axes
    drawAxes(ctx, rect.width, rect.height, viewport, axisLine);

    // Draw expressions (skip definitions)
    expressions.forEach((expr) => {
      const normalized = expr.normalized.trim();
      console.log('Processing expression:', { normalized, hasEquals: normalized.includes('=') });
      if (!normalized) return;
      
      // Skip function definitions (f(x) = ...) and variable definitions (a = ...)
      if (normalized.includes('=')) {
        console.log('Skipping definition:', normalized);
        return;
      }
      
      try {
        drawExpression(ctx, rect.width, rect.height, viewport, expr, context);
      } catch (e) {
        console.error('Error drawing expression:', normalized, e);
      }
    });
  }, [expressions, viewport]);

  const drawGrid = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    vp: typeof viewport,
    gridLineColor: string
  ) => {
    ctx.strokeStyle = `hsl(${gridLineColor})`;
    ctx.lineWidth = 1;

    const xRange = vp.xMax - vp.xMin;
    const yRange = vp.yMax - vp.yMin;
    const gridSpacing = calculateGridSpacing(Math.max(xRange, yRange));

    // Vertical lines
    for (let x = Math.ceil(vp.xMin / gridSpacing) * gridSpacing; x <= vp.xMax; x += gridSpacing) {
      const px = mapX(x, width, vp);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = Math.ceil(vp.yMin / gridSpacing) * gridSpacing; y <= vp.yMax; y += gridSpacing) {
      const py = mapY(y, height, vp);
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(width, py);
      ctx.stroke();
    }
  };

  const drawAxes = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    vp: typeof viewport,
    axisLineColor: string
  ) => {
    ctx.strokeStyle = `hsl(${axisLineColor})`;
    ctx.lineWidth = 2;

    // X-axis
    if (vp.yMin <= 0 && vp.yMax >= 0) {
      const y = mapY(0, height, vp);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Y-axis
    if (vp.xMin <= 0 && vp.xMax >= 0) {
      const x = mapX(0, width, vp);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  };

  const drawExpression = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    vp: typeof viewport,
    expr: Expression,
    context: DefinitionContext
  ) => {
    // Use normalized expression (already has y= removed by normalizer)
    const rhs = expr.normalized.trim();
    
    if (!rhs) return;
    
    let ast;
    try {
      ast = parseExpression(rhs, context);
      console.log('Parsed AST for', rhs, ':', ast);
    } catch (e) {
      console.warn('Parse error:', e);
      return;
    }

    ctx.strokeStyle = expr.color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const xRange = vp.xMax - vp.xMin;
    let started = false;
    let lastY: number | null = null;
    let sampleCount = 0;

    for (let px = 0; px < width; px++) {
      const x = vp.xMin + (px / width) * xRange;
      
      try {
        const y = parseAndEvaluate(rhs, x, ast, context);
        if (sampleCount < 3) {
          console.log('Sample point: x=', x, 'y=', y);
          sampleCount++;
        }
        
        if (isFinite(y)) {
          const py = mapY(y, height, vp);
          
          // Check for discontinuities
          if (lastY !== null && Math.abs(y - lastY) > (vp.yMax - vp.yMin) * 0.5) {
            started = false;
          }
          
          if (!started) {
            ctx.moveTo(px, py);
            started = true;
          } else {
            ctx.lineTo(px, py);
          }
          
          lastY = y;
        } else {
          started = false;
          lastY = null;
        }
      } catch (e) {
        started = false;
        lastY = null;
      }
    }

    ctx.stroke();
  };

  const mapX = (x: number, width: number, vp: typeof viewport): number => {
    return ((x - vp.xMin) / (vp.xMax - vp.xMin)) * width;
  };

  const mapY = (y: number, height: number, vp: typeof viewport): number => {
    return height - ((y - vp.yMin) / (vp.yMax - vp.yMin)) * height;
  };

  const calculateGridSpacing = (range: number): number => {
    const targetLines = 10;
    const roughSpacing = range / targetLines;
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughSpacing)));
    const normalized = roughSpacing / magnitude;

    if (normalized < 2) return magnitude;
    if (normalized < 5) return 2 * magnitude;
    return 5 * magnitude;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragStartViewport(viewport);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    const xRange = dragStartViewport.xMax - dragStartViewport.xMin;
    const yRange = dragStartViewport.yMax - dragStartViewport.yMin;

    const xShift = (-dx / rect.width) * xRange;
    const yShift = (dy / rect.height) * yRange;

    onViewportChange({
      xMin: dragStartViewport.xMin + xShift,
      xMax: dragStartViewport.xMax + xShift,
      yMin: dragStartViewport.yMin + yShift,
      yMax: dragStartViewport.yMax + yShift,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    const xRange = viewport.xMax - viewport.xMin;
    const yRange = viewport.yMax - viewport.yMin;
    
    const xCenter = (viewport.xMin + viewport.xMax) / 2;
    const yCenter = (viewport.yMin + viewport.yMax) / 2;
    
    const newXRange = xRange * zoomFactor;
    const newYRange = yRange * zoomFactor;
    
    onViewportChange({
      xMin: xCenter - newXRange / 2,
      xMax: xCenter + newXRange / 2,
      yMin: yCenter - newYRange / 2,
      yMax: yCenter + newYRange / 2,
    });
  };

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-move"
      style={{ display: "block" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    />
  );
};
