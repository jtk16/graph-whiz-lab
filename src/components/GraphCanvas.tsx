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
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; screenX: number; screenY: number } | null>(null);

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

    const yAxisX = Math.max(0, Math.min(width, mapX(0, width, vp)));
    const xAxisY = Math.max(0, Math.min(height, mapY(0, height, vp)));

    // X-axis
    ctx.beginPath();
    ctx.moveTo(0, xAxisY);
    ctx.lineTo(width, xAxisY);
    ctx.stroke();

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(yAxisX, 0);
    ctx.lineTo(yAxisX, height);
    ctx.stroke();

    // Draw tick marks and labels
    drawTickMarks(ctx, width, height, vp, yAxisX, xAxisY);
  };

  const formatTickLabel = (value: number): string => {
    const absValue = Math.abs(value);
    
    // Use scientific notation for very large or very small numbers
    if (absValue >= 10000 || (absValue < 0.01 && absValue > 0)) {
      return value.toExponential(1);
    }
    
    // Use fixed decimal for reasonable numbers
    if (absValue >= 100) {
      return value.toFixed(0);
    } else if (absValue >= 1) {
      return value.toFixed(1);
    } else {
      return value.toFixed(2);
    }
  };

  const drawTickMarks = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    vp: typeof viewport,
    yAxisX: number,
    xAxisY: number
  ) => {
    const xRange = vp.xMax - vp.xMin;
    const yRange = vp.yMax - vp.yMin;
    const tickSpacing = calculateGridSpacing(Math.max(xRange, yRange));
    
    const tickSize = 8;

    // X-axis ticks and labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    
    for (let x = Math.ceil(vp.xMin / tickSpacing) * tickSpacing; x <= vp.xMax; x += tickSpacing) {
      if (Math.abs(x) < tickSpacing * 0.01) continue; // Skip zero
      
      const px = mapX(x, width, vp);
      
      // Draw tick mark
      ctx.strokeStyle = 'hsl(var(--foreground))';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, xAxisY - tickSize);
      ctx.lineTo(px, xAxisY + tickSize);
      ctx.stroke();
      
      // Draw label with background for visibility
      const label = formatTickLabel(x);
      const labelY = xAxisY + tickSize + 6;
      
      if (labelY >= 0 && labelY < height - 5 && px >= 0 && px <= width) {
        const metrics = ctx.measureText(label);
        const padding = 4;
        
        // Draw semi-transparent background
        ctx.fillStyle = 'hsla(var(--canvas-bg), 0.9)';
        ctx.fillRect(
          px - metrics.width / 2 - padding,
          labelY - 2,
          metrics.width + padding * 2,
          16
        );
        
        // Draw text
        ctx.fillStyle = 'hsl(var(--foreground))';
        ctx.fillText(label, px, labelY);
      }
    }

    // Y-axis ticks and labels
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    for (let y = Math.ceil(vp.yMin / tickSpacing) * tickSpacing; y <= vp.yMax; y += tickSpacing) {
      if (Math.abs(y) < tickSpacing * 0.01) continue; // Skip zero
      
      const py = mapY(y, height, vp);
      
      // Draw tick mark
      ctx.strokeStyle = 'hsl(var(--foreground))';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(yAxisX - tickSize, py);
      ctx.lineTo(yAxisX + tickSize, py);
      ctx.stroke();
      
      // Draw label with background for visibility
      const label = formatTickLabel(y);
      const labelX = yAxisX - tickSize - 6;
      
      if (labelX >= 0 && labelX < width - 5 && py >= 0 && py <= height) {
        const metrics = ctx.measureText(label);
        const padding = 4;
        
        // Draw semi-transparent background
        ctx.fillStyle = 'hsla(var(--canvas-bg), 0.9)';
        ctx.fillRect(
          labelX - metrics.width - padding,
          py - 8,
          metrics.width + padding * 2,
          16
        );
        
        // Draw text
        ctx.fillStyle = 'hsl(var(--foreground))';
        ctx.fillText(label, labelX, py);
      }
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
    const samplesPerPixel = 2; // Increase sampling for smoother curves
    const totalSamples = width * samplesPerPixel;
    let started = false;
    let lastY: number | null = null;
    let sampleCount = 0;

    for (let i = 0; i < totalSamples; i++) {
      const x = vp.xMin + (i / totalSamples) * xRange;
      const px = (i / samplesPerPixel);
      
      try {
        const y = parseAndEvaluate(rhs, x, ast, context);
        if (sampleCount < 3) {
          console.log('Sample point: x=', x, 'y=', y);
          sampleCount++;
        }
        
        if (isFinite(y)) {
          const py = mapY(y, height, vp);
          
          // Only check for discontinuities, not out-of-bounds
          if (lastY !== null && Math.abs(y - lastY) > (vp.yMax - vp.yMin) * 0.8) {
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
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    // Check for shift-click on axes for axis-specific scaling
    if (e.shiftKey) {
      const yAxisX = Math.max(0, Math.min(rect.width, mapX(0, rect.width, viewport)));
      const xAxisY = Math.max(0, Math.min(rect.height, mapY(0, rect.height, viewport)));
      
      const distToYAxis = Math.abs(canvasX - yAxisX);
      const distToXAxis = Math.abs(canvasY - xAxisY);
      
      const threshold = 20; // pixels
      
      if (distToYAxis < threshold && distToYAxis < distToXAxis) {
        // Clicked near Y-axis - scale Y only
        setIsDragging(false);
        startAxisScaling('y', e.clientY);
        return;
      } else if (distToXAxis < threshold) {
        // Clicked near X-axis - scale X only
        setIsDragging(false);
        startAxisScaling('x', e.clientX);
        return;
      }
    }
    
    // Check if clicking near a plotted point
    const clickedPoint = findNearestPoint(canvasX, canvasY, rect.width, rect.height);
    
    if (clickedPoint) {
      setHoveredPoint({
        x: clickedPoint.x,
        y: clickedPoint.y,
        screenX: e.clientX,
        screenY: e.clientY
      });
    } else {
      setHoveredPoint(null);
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setDragStartViewport(viewport);
    }
  };

  const [scalingAxis, setScalingAxis] = useState<{ axis: 'x' | 'y'; startPos: number; startViewport: typeof viewport } | null>(null);

  const startAxisScaling = (axis: 'x' | 'y', startPos: number) => {
    setScalingAxis({ axis, startPos, startViewport: viewport });
  };

  const findNearestPoint = (canvasX: number, canvasY: number, width: number, height: number) => {
    const context = buildDefinitionContext(expressions);
    const threshold = 10; // pixels
    let nearest: { x: number; y: number; distance: number } | null = null;

    for (const expr of expressions) {
      const normalized = expr.normalized.trim();
      if (!normalized || normalized.includes('=')) continue;

      try {
        const ast = parseExpression(normalized, context);
        const mathX = viewport.xMin + (canvasX / width) * (viewport.xMax - viewport.xMin);
        const y = parseAndEvaluate(normalized, mathX, ast, context);

        if (isFinite(y)) {
          const py = mapY(y, height, viewport);
          const distance = Math.abs(py - canvasY);

          if (distance < threshold && (!nearest || distance < nearest.distance)) {
            nearest = { x: mathX, y, distance };
          }
        }
      } catch (e) {
        // Skip invalid expressions
      }
    }

    return nearest;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (scalingAxis) {
      const { axis, startPos, startViewport } = scalingAxis;
      
      if (axis === 'y') {
        // Vertical drag - scale Y axis
        const dy = e.clientY - startPos;
        const scaleFactor = Math.exp(dy / 100); // Exponential scaling
        
        const yCenter = (startViewport.yMin + startViewport.yMax) / 2;
        const yRange = (startViewport.yMax - startViewport.yMin) * scaleFactor;
        
        onViewportChange({
          ...viewport,
          yMin: yCenter - yRange / 2,
          yMax: yCenter + yRange / 2,
        });
      } else {
        // Horizontal drag - scale X axis
        const dx = e.clientX - startPos;
        const scaleFactor = Math.exp(dx / 100);
        
        const xCenter = (startViewport.xMin + startViewport.xMax) / 2;
        const xRange = (startViewport.xMax - startViewport.xMin) * scaleFactor;
        
        onViewportChange({
          ...viewport,
          xMin: xCenter - xRange / 2,
          xMax: xCenter + xRange / 2,
        });
      }
      return;
    }
    
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
    setScalingAxis(null);
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
    <>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block", cursor: scalingAxis ? (scalingAxis.axis === 'x' ? 'ew-resize' : 'ns-resize') : (isDragging ? 'grabbing' : 'grab') }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      {hoveredPoint && (
        <div
          className="absolute bg-popover border border-border rounded-md shadow-lg px-3 py-2 text-sm pointer-events-none z-10"
          style={{
            left: hoveredPoint.screenX + 10,
            top: hoveredPoint.screenY - 30,
          }}
        >
          <div className="font-mono">
            ({hoveredPoint.x.toFixed(3)}, {hoveredPoint.y.toFixed(3)})
          </div>
        </div>
      )}
    </>
  );
};
