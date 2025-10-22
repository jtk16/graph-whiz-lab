import { useRef, useState, useMemo } from 'react';
import { ToolProps } from '@/lib/tools/types';
import { parseExpression } from '@/lib/parser';
import { buildDefinitionContext } from '@/lib/definitionContext';
import { useScene3D } from '@/hooks/useScene3D';
import { SurfaceEvaluator } from '@/lib/computation/evaluators/SurfaceEvaluator';
import { ParametricCurveEvaluator } from '@/lib/computation/evaluators/ParametricCurveEvaluator';
import { Surface3D } from '@/components/3d/Surface3D';
import { Curve3D } from '@/components/3d/Curve3D';
import { cartesianSpace, getSpace } from '@/lib/computation/spaces';
import { Graph3DControls } from './Graph3DControls';
import { inferType, MathType } from '@/lib/types';

export const Graph3DTool = ({ 
  expressions, 
  toolkitDefinitions,
  viewport,
  onViewportChange,
  toolConfig,
  isActive 
}: ToolProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spaceId, setSpaceId] = useState<string>(toolConfig?.spaceId || 'cartesian');
  const space = getSpace(spaceId) || cartesianSpace;
  
  // Only initialize 3D scene when active
  const { scene, isReady } = useScene3D(
    isActive ? canvasRef : { current: null }, 
    isActive ? {
      backgroundColor: 0x0a0a0a,
      cameraPosition: [8, 8, 8],
      enableGrid: toolConfig?.showGrid !== false,
      enableAxes: toolConfig?.showAxes !== false
    } : {}
  );
  
  // Evaluate all expressions to renderable data (surfaces or curves)
  const renderableData = useMemo(() => {
    if (!isActive || !isReady) return [];
    
    const definitions = [...expressions, ...toolkitDefinitions].filter(e => 
      e.normalized.trim().includes('=')
    );
    const context = buildDefinitionContext(definitions);
    
    return expressions
      .filter(expr => !expr.normalized.includes('='))
      .map(expr => {
        try {
          // Infer expression type
          const typeInfo = inferType(expr.latex, expr.normalized);
          const ast = parseExpression(expr.normalized, context);
          
          // Check if this is a parametric curve
          const isCurve = typeInfo.type === MathType.Function && 
                         (typeInfo.codomain === MathType.Point || 
                          typeInfo.codomain === MathType.Point3D ||
                          expr.normalized.match(/\([^)]+\)\s*=\s*\(/));
          
          if (isCurve) {
            // Evaluate as parametric curve
            const evaluator = new ParametricCurveEvaluator(ast, context);
            const data = evaluator.evaluateCurve({
              parameterName: 't',
              parameterRange: { min: -5, max: 5 },
              resolution: toolConfig?.resolution || 100
            });
            
            return { type: 'curve' as const, data, color: expr.color, id: expr.id };
          } else {
            // Evaluate as surface
            const evaluator = new SurfaceEvaluator(ast, context, space);
            const data = evaluator.evaluateSurface({
              resolution: toolConfig?.resolution || 50,
              bounds: viewport?.bounds || space.defaultBounds,
              colorMode: toolConfig?.colorMode || 'height'
            });
            
            return { type: 'surface' as const, data, color: expr.color, id: expr.id };
          }
        } catch (e) {
          console.error('Failed to evaluate expression:', expr.normalized, e);
          return null;
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [expressions, toolkitDefinitions, space, viewport, toolConfig, isActive, isReady]);
  
  if (!isActive) return null;
  
  return (
    <div className="w-full h-full relative">
      {/* Always render canvas so ref is available */}
      <canvas ref={canvasRef} className="w-full h-full" />
      
      {/* Loading overlay - shown while scene initializes */}
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-background text-muted-foreground">
          <div className="text-center">
            <div className="text-lg mb-2">Initializing 3D view...</div>
            <div className="text-sm">Setting up scene</div>
          </div>
        </div>
      )}
      
      {/* Render surfaces and curves only when ready */}
      {isReady && scene && renderableData.map(({ type, data, color, id }) => {
        if (type === 'surface') {
          return (
            <Surface3D
              key={id}
              scene={scene}
              data={data}
              color={color}
              wireframe={toolConfig?.wireframe}
              opacity={toolConfig?.opacity ?? 0.85}
            />
          );
        } else if (type === 'curve') {
          return (
            <Curve3D
              key={id}
              scene={scene}
              data={data}
              color={color}
              lineWidth={2}
              opacity={1.0}
            />
          );
        }
        return null;
      })}
      
      {/* Controls overlay */}
      {isReady && (
        <div className="absolute top-4 right-4">
          <Graph3DControls
            toolConfig={toolConfig || {}}
            onConfigChange={(config) => {
              if (onViewportChange) {
                // Update viewport bounds when config changes
                onViewportChange({ bounds: space.defaultBounds, ...config });
              }
            }}
            space={space}
            onSpaceChange={setSpaceId}
          />
        </div>
      )}
    </div>
  );
};
