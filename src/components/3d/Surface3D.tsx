import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import * as THREE from 'three';
import { SurfaceData } from '@/lib/computation/evaluators/SurfaceEvaluator';

// Helper to resolve CSS color variables
function resolveColor(color: string): string {
  // Handle hsl(var(--variable)) pattern
  const hslVarMatch = color.match(/hsl\(var\((--[^)]+)\)\)/);
  if (hslVarMatch) {
    const varName = hslVarMatch[1];
    const varValue = getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
    if (varValue) {
      // CSS custom properties for colors are in format "220 13% 10%"
      // Convert to proper HSL format for THREE.Color
      const parts = varValue.split(/\s+/);
      if (parts.length === 3) {
        return `hsl(${parts[0]}, ${parts[1]}, ${parts[2]})`;
      }
    }
  }
  
  // Handle direct var(--variable) pattern
  const varMatch = color.match(/var\((--[^)]+)\)/);
  if (varMatch) {
    const varName = varMatch[1];
    const varValue = getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
    if (varValue) {
      return `hsl(${varValue})`;
    }
  }
  
  return color;
}

interface Surface3DProps {
  scene: THREE.Scene | null;
  sceneVersion: number;
  data: SurfaceData;
  color?: string;
  wireframe?: boolean;
  opacity?: number;
  useVertexColors?: boolean; // Whether to use vertex colors instead of expression color
}

export function Surface3D({ 
  scene, 
  sceneVersion,
  data, 
  color = '#3b82f6', 
  wireframe = false, 
  opacity = 0.85,
  useVertexColors = false
}: Surface3DProps) {
  const meshRef = useRef<THREE.Mesh>();
  
  const { theme, resolvedTheme } = useTheme();
  
  useEffect(() => {
    if (!scene) return;
    
    console.log('Surface3D: Creating mesh', {
      vertexCount: data.vertices.length / 3,
      indexCount: data.indices.length,
      color,
      wireframe,
      hasVertexColors: useVertexColors && !!data.colors
    });
    
    // Resolve color from CSS variables
    const resolvedColor = resolveColor(color);
    const baseColor = new THREE.Color();
    try {
      baseColor.setStyle(resolvedColor);
    } catch {
      baseColor.setStyle('#3b82f6');
    }
    
    // Create geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(data.vertices, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
    geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
    geometry.computeBoundingBox();
    
    if (data.colors) {
      geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
    }
    
    // Create material - Using MeshPhongMaterial for proper lighting
    const material = new THREE.MeshPhongMaterial({
      color: baseColor,
      wireframe,
      opacity,
      transparent: opacity < 1,
      side: THREE.DoubleSide,
      vertexColors: useVertexColors && data.colors ? true : false,
      shininess: 30,
      flatShading: false
    });
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    meshRef.current = mesh;
    
    // Compute bounding box for debugging
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;
    
    console.log('Surface3D: Mesh created and added to scene');
    console.log('Surface3D: Mesh details', {
      vertexCount: data.vertices.length / 3,
      position: mesh.position,
      scale: mesh.scale,
      visible: mesh.visible,
      material: {
        color: material.color.getHexString(),
        opacity: material.opacity,
        transparent: material.transparent,
        wireframe: material.wireframe
      },
      boundingBox: bbox ? {
        min: { x: bbox.min.x, y: bbox.min.y, z: bbox.min.z },
        max: { x: bbox.max.x, y: bbox.max.y, z: bbox.max.z }
      } : null
    });
    
    // Log first few vertices to verify data
    console.log('Surface3D: First 3 vertices:', [
      [data.vertices[0], data.vertices[1], data.vertices[2]],
      [data.vertices[3], data.vertices[4], data.vertices[5]],
      [data.vertices[6], data.vertices[7], data.vertices[8]]
    ]);
    
    scene.add(mesh);
    
    // Force scene update and disable frustum culling for debugging
    mesh.frustumCulled = false;
    mesh.matrixWorldNeedsUpdate = true;
    
    console.log('Surface3D: Mesh render state', {
      inScene: mesh.parent === scene,
      matrixWorldNeedsUpdate: mesh.matrixWorldNeedsUpdate,
      frustumCulled: mesh.frustumCulled,
      renderOrder: mesh.renderOrder
    });
    
    return () => {
      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
    };
  }, [scene, sceneVersion, data, color, wireframe, opacity, useVertexColors, theme, resolvedTheme]);
  
  return null;
}
