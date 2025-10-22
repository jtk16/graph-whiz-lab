import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SurfaceData } from '@/lib/computation/evaluators/SurfaceEvaluator';

interface Surface3DProps {
  scene: THREE.Scene;
  data: SurfaceData;
  color?: string;
  wireframe?: boolean;
  opacity?: number;
}

export function Surface3D({ 
  scene, 
  data, 
  color = '#3b82f6', 
  wireframe = false, 
  opacity = 0.85 
}: Surface3DProps) {
  const meshRef = useRef<THREE.Mesh>();
  
  useEffect(() => {
    if (!scene) return;
    
    // Create geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(data.vertices, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
    geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
    
    if (data.colors) {
      geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
    }
    
    // Create material
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color(color),
      wireframe,
      opacity,
      transparent: opacity < 1,
      side: THREE.DoubleSide,
      vertexColors: data.colors ? true : false,
      shininess: 30
    });
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    meshRef.current = mesh;
    
    scene.add(mesh);
    
    return () => {
      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
    };
  }, [scene, data, color, wireframe, opacity]);
  
  return null;
}
