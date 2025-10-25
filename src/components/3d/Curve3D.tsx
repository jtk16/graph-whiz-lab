import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import * as THREE from 'three';
import { CurveData } from '@/lib/computation/evaluators/ParametricCurveEvaluator';

// Helper to resolve CSS color variables
function resolveColor(color: string): string {
  if (color.includes('var(--')) {
    const varMatch = color.match(/var\((--[^)]+)\)/);
    if (varMatch) {
      const varName = varMatch[1];
      const varValue = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      if (varValue) {
        return `hsl(${varValue})`;
      }
    }
  }
  return color;
}

interface Curve3DProps {
  scene: THREE.Scene | null;
  sceneVersion: number;
  data: CurveData;
  color?: string;
  lineWidth?: number;
  opacity?: number;
}

export function Curve3D({ 
  scene, 
  sceneVersion,
  data, 
  color = '#3b82f6', 
  lineWidth = 2,
  opacity = 1.0
}: Curve3DProps) {
  const lineRef = useRef<THREE.Line>();
  
  const { theme, resolvedTheme } = useTheme();
  
  useEffect(() => {
    if (!scene || !data.points || data.points.length < 6) return;
    
    // Resolve color from CSS variables
    const resolvedColor = resolveColor(color);
    const lineColor = new THREE.Color();
    try {
      lineColor.setStyle(resolvedColor);
    } catch {
      lineColor.setStyle('#3b82f6');
    }
    
    // Create geometry from points
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(data.points, 3));
    
    // Create line material
    const material = new THREE.LineBasicMaterial({
      color: lineColor,
      linewidth: lineWidth,
      transparent: opacity < 1,
      opacity: opacity
    });
    
    // Create line
    const line = new THREE.Line(geometry, material);
    lineRef.current = line;
    
    scene.add(line);
    
    return () => {
      scene.remove(line);
      geometry.dispose();
      material.dispose();
    };
  }, [scene, sceneVersion, data, color, lineWidth, opacity, theme, resolvedTheme]);
  
  return null;
}
