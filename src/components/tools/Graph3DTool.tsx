import { useRef, useState, useMemo } from 'react';
import { ToolProps } from '@/lib/tools/types';
import { parseExpression } from '@/lib/parser';
import { buildDefinitionContext } from '@/lib/definitionContext';
import { useScene3D } from '@/hooks/useScene3D';
import { SurfaceEvaluator } from '@/lib/computation/evaluators/SurfaceEvaluator';
import { Surface3D } from '@/components/3d/Surface3D';
import { cartesianSpace, getSpace } from '@/lib/computation/spaces';
import { Graph3DControls } from './Graph3DControls';

export const Graph3DTool = ({ 
  expressions, 
  toolkitDefinitions,
  viewport,
  toolConfig,
  isActive 
}: ToolProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spaceId, setSpaceId] = useState<string>(toolConfig?.spaceId || 'cartesian');
  const space = getSpace(spaceId) || cartesianSpace;
  
  const { scene, isReady } = useScene3D(canvasRef, {
    backgroundColor: 0x0a0a0a,
    cameraPosition: [8, 8, 8],
    enableGrid: toolConfig?.showGrid !== false,
    enableAxes: toolConfig?.showAxes !== false
  });
  
  // Evaluate all expressions to surface data
  const surfaceData = useMemo(() => {
    if (!isActive || !isReady) return [];
    
    const definitions = [...expressions, ...toolkitDefinitions].filter(e => 
      e.normalized.trim().includes('=')
    );
    const context = buildDefinitionContext(definitions);
    
    return expressions
      .filter(expr => !expr.normalized.includes('='))
      .map(expr => {
        try {
          const ast = parseExpression(expr.normalized, context);
          const evaluator = new SurfaceEvaluator(ast, context, space);
          
          const data = evaluator.evaluateSurface({
            resolution: toolConfig?.resolution || 50,
            bounds: viewport?.bounds || space.defaultBounds,
            colorMode: toolConfig?.colorMode || 'height'
          });
          
          return { data, color: expr.color, id: expr.id };
        } catch (e) {
          console.error('Failed to evaluate surface:', expr.normalized, e);
          return null;
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [expressions, toolkitDefinitions, space, viewport, toolConfig, isActive, isReady]);
  
  if (!isActive) return null;
  
  return (
    <div className="w-full h-full relative">
      <canvas ref={canvasRef} className="w-full h-full" />
      
      {/* Render surfaces */}
      {scene && surfaceData.map(({ data, color, id }) => (
        <Surface3D
          key={id}
          scene={scene}
          data={data}
          color={color}
          wireframe={toolConfig?.wireframe}
          opacity={toolConfig?.opacity ?? 0.85}
        />
      ))}
      
      {/* Controls overlay */}
      <div className="absolute top-4 right-4">
        <Graph3DControls
          toolConfig={toolConfig || {}}
          onConfigChange={(config) => {
            // Tool config changes handled by parent
          }}
          space={space}
          onSpaceChange={setSpaceId}
        />
      </div>
    </div>
  );
};
