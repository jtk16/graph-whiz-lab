import { useState, useMemo, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import * as THREE from 'three';
import { ToolProps } from '@/lib/tools/types';
import { useScene3D } from '@/hooks/useScene3D';
import { SurfaceEvaluator } from '@/lib/computation/evaluators/SurfaceEvaluator';
import { ParametricCurveEvaluator } from '@/lib/computation/evaluators/ParametricCurveEvaluator';
import { Surface3D } from '@/components/3d/Surface3D';
import { Curve3DBatch } from '@/components/3d/Curve3D';
import { cartesianSpace, getSpace } from '@/lib/computation/spaces';
import { Graph3DControls } from './Graph3DControls';
import { inferType, MathType } from '@/lib/types';
import { expressionEngine } from '@/lib/expression';

export const Graph3DTool = ({ 
  expressions, 
  toolkitDefinitions,
  viewport,
  onViewportChange,
  toolConfig,
  isActive 
}: ToolProps) => {
  const { theme, resolvedTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { scene, renderer, sceneVersion, isReady, requestRender } = useScene3D(canvasRef, isActive);
  const [spaceId, setSpaceId] = useState<string>(toolConfig?.spaceId || 'cartesian');
  const space = getSpace(spaceId) || cartesianSpace;
  const definitionSources = useMemo(
    () => [...expressions, ...toolkitDefinitions].filter(e => e.normalized.trim().includes('=')),
    [expressions, toolkitDefinitions]
  );
  const context = useMemo(
    () => expressionEngine.buildContext(definitionSources),
    [definitionSources]
  );
  
  // Get background color from theme
  const getBackgroundColor = () => {
    const canvasBg = getComputedStyle(document.documentElement)
      .getPropertyValue('--canvas-bg')
      .trim();
    
    if (canvasBg) {
      // CSS custom properties for colors are often in format "220 13% 10%"
      // THREE.Color needs "hsl(220, 13%, 10%)" format
      if (canvasBg.includes(' ') && !canvasBg.includes('hsl')) {
        const parts = canvasBg.split(/\s+/);
        if (parts.length === 3) {
          return new THREE.Color(`hsl(${parts[0]}, ${parts[1]}, ${parts[2]})`);
        }
      }
      // Try parsing as-is if it's already in a valid format
      return new THREE.Color(canvasBg);
    }
    return new THREE.Color(0x0a0a0a);
  };
  
  // Only initialize 3D scene when active
  useEffect(() => {
    if (!scene) return;
    scene.background = getBackgroundColor();
  }, [scene, theme, resolvedTheme]);

  useEffect(() => {
    if (!renderer) return;
    renderer.setClearColor(getBackgroundColor(), 1);
  }, [renderer, theme, resolvedTheme]);
  
  const tokenizeVariables = (expr: string): string[] => {
    return expr
      .replace(/[^a-z0-9_]/gi, ' ')
      .toLowerCase()
      .split(/\s+/)
      .map(token => token.trim())
      .filter(Boolean);
  };

  const hasVariables = (expr: string, vars: string[]): boolean => {
    const tokens = tokenizeVariables(expr);
    return vars.every(v => tokens.includes(v));
  };

  // Evaluate all expressions to renderable data (surfaces or curves)
  const renderableData = useMemo(() => {
    if (!isActive || !isReady) return { surfaces: [], curves: [] };

    const surfaces: Array<{ data: any; color?: string; id: string }> = [];
    const curves: Array<{ data: any; color?: string; id: string }> = [];

    expressions.forEach(expr => {
        try {
          // Infer expression type
          const typeInfo = inferType(expr.latex, expr.normalized);
          const ast = expressionEngine.parseNormalized(expr.normalized, context);
          
          const normalized = expr.normalized.trim();
          const hasEquals = normalized.includes('=') && !normalized.includes('==');
          const [lhsRaw = '', rhsRaw = ''] = normalized.split('=');
          const lhs = lhsRaw.trim();
          const rhs = rhsRaw.trim();
          
          const lhsIsAxis = lhs === 'z';
          const rhsIsAxis = rhs === 'z';
          const explicitExpression = lhsIsAxis ? rhs : rhsIsAxis ? lhs : null;
          const tokensContainXYZ = hasVariables(normalized, ['x', 'y', 'z']);
          
          const isExplicitSurface = hasEquals && !!explicitExpression;
          const isImplicit3D =
            hasEquals &&
            (typeInfo.type === MathType.Surface3D ||
              (!explicitExpression && tokensContainXYZ));
          
          if (isExplicitSurface) {
            // Parse z = f(x,y) and evaluate as explicit surface
            const rhsAst = expressionEngine.parseNormalized(explicitExpression!, context);
            const evaluator = new SurfaceEvaluator(rhsAst, context, space);
            const bounds = viewport?.bounds || space.defaultBounds;
            const data = evaluator.evaluateSurface({
              bounds: {
                x: bounds.x || { min: -5, max: 5 },
                y: bounds.y || { min: -5, max: 5 },
              },
              resolution: toolConfig?.resolution || 30,
              colorMode: 'none' // Don't use vertex colors for explicit surfaces
            });
            surfaces.push({ data, color: expr.color, id: expr.id });
            return;
          }
          
          if (isImplicit3D) {
            const evaluator = new SurfaceEvaluator(ast, context, space);
            const bounds = viewport?.bounds || space.defaultBounds;
            const implicitOptions = {
              bounds: {
                xMin: bounds.x?.min ?? -5,
                xMax: bounds.x?.max ?? 5,
                yMin: bounds.y?.min ?? -5,
                yMax: bounds.y?.max ?? 5,
                zMin: bounds.z?.min ?? -5,
                zMax: bounds.z?.max ?? 5,
              },
              resolution: toolConfig?.resolution || 30,
              isoValue: 0
            };
            const data = evaluator.evaluateImplicitSurface(implicitOptions);
            surfaces.push({ data, color: expr.color, id: expr.id });
            return;
          }
          
          // Skip other definitions (variable assignments, function definitions)
          if (hasEquals && !isImplicit3D && !isExplicitSurface) {
            return;
          }
          
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
            
            curves.push({ data, color: expr.color, id: expr.id });
            return;
          } else {
            const evaluator = new SurfaceEvaluator(ast, context, space);
            const data = evaluator.evaluateSurface({
              resolution: toolConfig?.resolution || 50,
              bounds: viewport?.bounds || space.defaultBounds,
              colorMode: 'none'
            });
            surfaces.push({ data, color: expr.color, id: expr.id });
            return;
          }
        } catch (e) {
          console.error('Failed to evaluate expression:', expr.normalized, e);
          return;
        }
      });

    return { surfaces, curves };
  }, [expressions, context, space, viewport, toolConfig, isActive, isReady]);
  
  if (!isActive) return null;
  
  return (
    <div className="w-full h-full relative" style={{ minHeight: '400px' }}>
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
      {isReady && scene && (
        <>
          {renderableData.surfaces.map(({ data, color, id }) => (
            <Surface3D
              key={id}
              scene={scene}
              sceneVersion={sceneVersion}
              data={data}
              color={color}
              wireframe={toolConfig?.wireframe}
              opacity={toolConfig?.opacity ?? 0.85}
              requestRender={requestRender}
            />
          ))}
          {renderableData.curves.length > 0 && (
            <Curve3DBatch
              key={renderableData.curves.map(curve => curve.id).join(':')}
              scene={scene}
              sceneVersion={sceneVersion}
              curves={renderableData.curves}
              requestRender={requestRender}
            />
          )}
        </>
      )}
      
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

