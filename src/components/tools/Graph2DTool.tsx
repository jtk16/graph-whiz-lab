import { useEffect, useRef, useState } from "react";
import { parseExpression } from "@/lib/parser";
import { parseAndEvaluate } from "@/lib/evaluator";
import { buildDefinitionContext } from "@/lib/definitionContext";
import { ToolProps } from "@/lib/tools/types";
import { ImplicitCurve2DEvaluator } from "@/lib/computation/evaluators/ImplicitCurve2DEvaluator";
import { MathType } from "@/lib/types";

export const Graph2DTool = ({ 
  expressions, 
  toolkitDefinitions,
  viewport: externalViewport, 
  onViewportChange,
  isActive 
}: ToolProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartViewport, setDragStartViewport] = useState(externalViewport);
  const [hoveredPoint, setHoveredPoint] = useState<{ 
    x: number; 
    y: number; 
    screenX: number; 
    screenY: number; 
    expr: any 
  } | null>(null);
  const [parsedExpressions, setParsedExpressions] = useState<Map<string, any>>(new Map());
  const [scalingAxis, setScalingAxis] = useState<{ 
    axis: 'x' | 'y'; 
    startPos: number; 
    startViewport: any 
  } | null>(null);

  const viewport = externalViewport || {
    xMin: -10,
    xMax: 10,
    yMin: -10,
    yMax: 10
  };

  // Parse and cache expressions
  useEffect(() => {
    if (!isActive) return;
    
    const definitions = [...expressions, ...toolkitDefinitions].filter(e => 
      e.normalized.trim().includes('=')
    );
    const context = buildDefinitionContext(definitions);
    
    const newParsed = new Map();
    expressions.forEach((expr) => {
      const normalized = expr.normalized.trim();
      if (!normalized || normalized.includes('=')) return;
      
      try {
        const ast = parseExpression(normalized, context);
        newParsed.set(expr.id, ast);
      } catch (e) {
        console.error('Error parsing expression:', normalized, e);
      }
    });
    
    setParsedExpressions(newParsed);
  }, [expressions, toolkitDefinitions, isActive]);

  // Main render effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // If not active, clear the canvas and return
    if (!isActive) {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    
    const definitions = [...expressions, ...toolkitDefinitions].filter(e => 
      e.normalized.trim().includes('=')
    );
    const context = buildDefinitionContext(definitions);

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.scale(dpr, dpr);

    const computedStyle = getComputedStyle(canvas);
    const canvasBg = computedStyle.getPropertyValue('--canvas-bg').trim();
    const gridLine = computedStyle.getPropertyValue('--grid-line').trim();
    const axisLine = computedStyle.getPropertyValue('--axis-line').trim();
    const foregroundColor = computedStyle.getPropertyValue('--foreground').trim();

    ctx.fillStyle = `hsl(${canvasBg})`;
    ctx.fillRect(0, 0, rect.width, rect.height);

    drawGrid(ctx, rect.width, rect.height, viewport, gridLine, foregroundColor);
    drawAxes(ctx, rect.width, rect.height, viewport, axisLine, canvasBg, foregroundColor);

    expressions.forEach((expr) => {
      const normalized = expr.normalized.trim();
      if (!normalized) return;
      
      try {
        // Check if this is an implicit relation
        const isImplicit = normalized.includes('=') && !normalized.includes('==');
        if (isImplicit) {
          // Check if it's a definition or an implicit relation
          const lhs = normalized.split('=')[0].trim();
          const isDefinition = lhs.match(/^[a-z_][a-z0-9_]*(\([^)]*\))?$/i);
          
          if (!isDefinition) {
            // This is an implicit relation, draw it
            drawImplicitCurve(ctx, rect.width, rect.height, viewport, expr, context);
          }
        } else {
          // Regular function expression
          drawExpression(ctx, rect.width, rect.height, viewport, expr, context);
        }
      } catch (e) {
        console.error('Error drawing expression:', normalized, e);
      }
    });

    if (hoveredPoint) {
      ctx.beginPath();
      ctx.arc(hoveredPoint.screenX, hoveredPoint.screenY, 6, 0, 2 * Math.PI);
      ctx.fillStyle = hoveredPoint.expr.color;
      ctx.fill();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [expressions, toolkitDefinitions, viewport, hoveredPoint, isActive]);

  const drawGrid = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    vp: typeof viewport,
    gridLineColor: string,
    foregroundColor: string
  ) => {
    ctx.strokeStyle = `hsl(${gridLineColor})`;
    ctx.lineWidth = 1;

    const xRange = vp.xMax - vp.xMin;
    const yRange = vp.yMax - vp.yMin;
    const gridSpacing = calculateGridSpacing(Math.max(xRange, yRange));

    for (let x = Math.ceil(vp.xMin / gridSpacing) * gridSpacing; x <= vp.xMax; x += gridSpacing) {
      const px = mapX(x, width, vp);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();
    }

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
    axisLineColor: string,
    canvasBg: string,
    foregroundColor: string
  ) => {
    ctx.strokeStyle = `hsl(${axisLineColor})`;
    ctx.lineWidth = 2;

    const yAxisX = Math.max(0, Math.min(width, mapX(0, width, vp)));
    const xAxisY = Math.max(0, Math.min(height, mapY(0, height, vp)));

    ctx.beginPath();
    ctx.moveTo(0, xAxisY);
    ctx.lineTo(width, xAxisY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(yAxisX, 0);
    ctx.lineTo(yAxisX, height);
    ctx.stroke();

    drawTickMarks(ctx, width, height, vp, yAxisX, xAxisY, canvasBg, foregroundColor);
  };

  const formatTickLabel = (value: number): string => {
    const absValue = Math.abs(value);
    
    if (absValue >= 10000 || (absValue < 0.01 && absValue > 0)) {
      return value.toExponential(1);
    }
    
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
    xAxisY: number,
    canvasBg: string,
    foregroundColor: string
  ) => {
    const xRange = vp.xMax - vp.xMin;
    const yRange = vp.yMax - vp.yMin;
    const tickSpacing = calculateGridSpacing(Math.max(xRange, yRange));
    
    const tickSize = 8;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    
    for (let x = Math.ceil(vp.xMin / tickSpacing) * tickSpacing; x <= vp.xMax; x += tickSpacing) {
      if (Math.abs(x) < tickSpacing * 0.01) continue;
      
      const px = mapX(x, width, vp);
      
      ctx.strokeStyle = `hsl(${foregroundColor})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, xAxisY - tickSize);
      ctx.lineTo(px, xAxisY + tickSize);
      ctx.stroke();
      
      const label = formatTickLabel(x);
      const labelY = xAxisY + tickSize + 6;
      
      if (labelY >= 0 && labelY < height - 5 && px >= 0 && px <= width) {
        const metrics = ctx.measureText(label);
        const padding = 4;
        
        ctx.fillStyle = `hsl(${canvasBg} / 0.95)`;
        ctx.fillRect(
          px - metrics.width / 2 - padding,
          labelY - 2,
          metrics.width + padding * 2,
          16
        );
        
        ctx.fillStyle = `hsl(${foregroundColor})`;
        ctx.fillText(label, px, labelY);
      }
    }

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    for (let y = Math.ceil(vp.yMin / tickSpacing) * tickSpacing; y <= vp.yMax; y += tickSpacing) {
      if (Math.abs(y) < tickSpacing * 0.01) continue;
      
      const py = mapY(y, height, vp);
      
      ctx.strokeStyle = `hsl(${foregroundColor})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(yAxisX - tickSize, py);
      ctx.lineTo(yAxisX + tickSize, py);
      ctx.stroke();
      
      const label = formatTickLabel(y);
      const labelX = yAxisX - tickSize - 6;
      
      if (labelX >= 0 && labelX < width - 5 && py >= 0 && py <= height) {
        const metrics = ctx.measureText(label);
        const padding = 4;
        
        ctx.fillStyle = `hsl(${canvasBg} / 0.95)`;
        ctx.fillRect(
          labelX - metrics.width - padding,
          py - 8,
          metrics.width + padding * 2,
          16
        );
        
        ctx.fillStyle = `hsl(${foregroundColor})`;
        ctx.fillText(label, labelX, py);
      }
    }
  };

  const drawImplicitCurve = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    vp: typeof viewport,
    expr: any,
    context: any
  ) => {
    const normalized = expr.normalized.trim();
    if (!normalized) return;
    
    try {
      const ast = parseExpression(normalized, context);
      const evaluator = new ImplicitCurve2DEvaluator(ast, context);
      const curveData = evaluator.evaluateCurve({
        bounds: { xMin: vp.xMin, xMax: vp.xMax, yMin: vp.yMin, yMax: vp.yMax },
        resolution: 100
      });
      
      // Resolve color
      let resolvedColor = expr.color;
      if (expr.color.includes('var(--')) {
        const varMatch = expr.color.match(/var\((--[^)]+)\)/);
        if (varMatch) {
          const varName = varMatch[1];
          const computedStyle = getComputedStyle(document.documentElement);
          const varValue = computedStyle.getPropertyValue(varName).trim();
          if (varValue) {
            resolvedColor = `hsl(${varValue})`;
          }
        }
      }
      
      ctx.strokeStyle = resolvedColor;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Render each segment
      curveData.segments.forEach(segment => {
        if (segment.points.length < 2) return;
        
        ctx.beginPath();
        segment.points.forEach((point, i) => {
          const px = mapX(point.x, width, vp);
          const py = mapY(point.y, height, vp);
          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        });
        ctx.stroke();
      });
    } catch (e) {
      console.warn('Error drawing implicit curve:', e);
    }
  };

  const drawExpression = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    vp: typeof viewport,
    expr: any,
    context: any
  ) => {
    const rhs = expr.normalized.trim();
    if (!rhs) return;
    
    let ast;
    try {
      ast = parseExpression(rhs, context);
    } catch (e) {
      console.warn('Parse error:', e);
      return;
    }

    let resolvedColor = expr.color;
    if (expr.color.includes('var(--')) {
      const varMatch = expr.color.match(/var\((--[^)]+)\)/);
      if (varMatch) {
        const varName = varMatch[1];
        const computedStyle = getComputedStyle(document.documentElement);
        const varValue = computedStyle.getPropertyValue(varName).trim();
        if (varValue) {
          resolvedColor = `hsl(${varValue})`;
        }
      }
    }
    
    ctx.strokeStyle = resolvedColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const xRange = vp.xMax - vp.xMin;
    const samplesPerPixel = 2;
    const totalSamples = width * samplesPerPixel;
    let started = false;
    let lastY: number | null = null;

    for (let i = 0; i < totalSamples; i++) {
      const x = vp.xMin + (i / totalSamples) * xRange;
      const px = (i / samplesPerPixel);
      
      try {
        const y = parseAndEvaluate(rhs, x, ast, context);
        
        if (isFinite(y)) {
          const py = mapY(y, height, vp);
          
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
    
    if (e.shiftKey) {
      const yAxisX = Math.max(0, Math.min(rect.width, mapX(0, rect.width, viewport)));
      const xAxisY = Math.max(0, Math.min(rect.height, mapY(0, rect.height, viewport)));
      
      const distToYAxis = Math.abs(canvasX - yAxisX);
      const distToXAxis = Math.abs(canvasY - xAxisY);
      
      const threshold = 20;
      
      if (distToYAxis < threshold && distToYAxis < distToXAxis) {
        setIsDragging(false);
        startAxisScaling('y', e.clientY);
        return;
      } else if (distToXAxis < threshold) {
        setIsDragging(false);
        startAxisScaling('x', e.clientX);
        return;
      }
    }
    
    setHoveredPoint(null);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragStartViewport(viewport);
  };

  const startAxisScaling = (axis: 'x' | 'y', startPos: number) => {
    setScalingAxis({ axis, startPos, startViewport: viewport });
  };

  const findNearestPoint = (canvasX: number, canvasY: number, width: number, height: number) => {
    const definitions = [...expressions, ...toolkitDefinitions].filter(e => 
      e.normalized.trim().includes('=')
    );
    const context = buildDefinitionContext(definitions);
    const threshold = 15;
    let nearest: any = null;

    for (const expr of expressions) {
      const normalized = expr.normalized.trim();
      if (!normalized || normalized.includes('=')) continue;

      const ast = parsedExpressions.get(expr.id);
      if (!ast) continue;

      try {
        const mathX = viewport.xMin + (canvasX / width) * (viewport.xMax - viewport.xMin);
        const y = parseAndEvaluate(normalized, mathX, ast, context);

        if (isFinite(y)) {
          const py = mapY(y, height, viewport);
          const distance = Math.abs(py - canvasY);

          if (distance < threshold && (!nearest || distance < nearest.distance)) {
            nearest = { x: mathX, y, expr, distance, screenX: canvasX, screenY: py };
          }
        }
      } catch (e) {
        // Skip
      }
    }

    return nearest;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !onViewportChange) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    
    if (scalingAxis) {
      const delta = scalingAxis.axis === 'x' 
        ? (e.clientX - scalingAxis.startPos) / rect.width
        : (e.clientY - scalingAxis.startPos) / rect.height;
      
      const scaleFactor = Math.exp(-delta * 2);
      const vp = scalingAxis.startViewport;
      
      if (scalingAxis.axis === 'x') {
        const xCenter = (vp.xMin + vp.xMax) / 2;
        const xRange = (vp.xMax - vp.xMin) * scaleFactor;
        onViewportChange({
          ...vp,
          xMin: xCenter - xRange / 2,
          xMax: xCenter + xRange / 2
        });
      } else {
        const yCenter = (vp.yMin + vp.yMax) / 2;
        const yRange = (vp.yMax - vp.yMin) * scaleFactor;
        onViewportChange({
          ...vp,
          yMin: yCenter - yRange / 2,
          yMax: yCenter + yRange / 2
        });
      }
      return;
    }
    
    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      const xRange = dragStartViewport.xMax - dragStartViewport.xMin;
      const yRange = dragStartViewport.yMax - dragStartViewport.yMin;
      
      const xShift = -(dx / rect.width) * xRange;
      const yShift = (dy / rect.height) * yRange;
      
      onViewportChange({
        xMin: dragStartViewport.xMin + xShift,
        xMax: dragStartViewport.xMax + xShift,
        yMin: dragStartViewport.yMin + yShift,
        yMax: dragStartViewport.yMax + yShift
      });
    } else {
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;
      const nearest = findNearestPoint(canvasX, canvasY, rect.width, rect.height);
      setHoveredPoint(nearest);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setScalingAxis(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!onViewportChange) return;
    
    e.preventDefault();
    const scaleFactor = e.deltaY > 0 ? 1.1 : 0.9;
    
    const xCenter = (viewport.xMin + viewport.xMax) / 2;
    const yCenter = (viewport.yMin + viewport.yMax) / 2;
    const xRange = (viewport.xMax - viewport.xMin) * scaleFactor;
    const yRange = (viewport.yMax - viewport.yMin) * scaleFactor;
    
    onViewportChange({
      xMin: xCenter - xRange / 2,
      xMax: xCenter + xRange / 2,
      yMin: yCenter - yRange / 2,
      yMax: yCenter + yRange / 2
    });
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none"
        style={{
          '--canvas-bg': 'var(--canvas-bg)',
          '--grid-line': 'var(--grid-line)',
          '--axis-line': 'var(--axis-line)',
        } as React.CSSProperties}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      {hoveredPoint && (
        <div 
          className="absolute bg-popover text-popover-foreground px-3 py-2 rounded-lg shadow-lg text-sm pointer-events-none border"
          style={{
            left: hoveredPoint.screenX + 10,
            top: hoveredPoint.screenY - 30
          }}
        >
          ({hoveredPoint.x.toFixed(3)}, {hoveredPoint.y.toFixed(3)})
        </div>
      )}
    </div>
  );
};
