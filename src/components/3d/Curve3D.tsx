import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CurveData } from '@/lib/computation/evaluators/ParametricCurveEvaluator';

interface Curve3DProps {
  scene: THREE.Scene;
  data: CurveData;
  color?: string;
  lineWidth?: number;
  opacity?: number;
}

export function Curve3D({ 
  scene, 
  data, 
  color = '#3b82f6', 
  lineWidth = 2,
  opacity = 1.0
}: Curve3DProps) {
  const lineRef = useRef<THREE.Line>();
  
  useEffect(() => {
    if (!scene || !data.points || data.points.length < 6) return;
    
    // Create geometry from points
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(data.points, 3));
    
    // Create line material
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
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
  }, [scene, data, color, lineWidth, opacity]);
  
  return null;
}
