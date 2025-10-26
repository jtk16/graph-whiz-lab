import { MutableRefObject, useEffect, useMemo, useRef } from 'react';
import { useTheme } from 'next-themes';
import * as THREE from 'three';
import { SurfaceData } from '@/lib/computation/evaluators/SurfaceEvaluator';

function resolveColor(color: string): string {
  const hslVarMatch = color.match(/hsl\(var\((--[^)]+)\)\)/);
  if (hslVarMatch) {
    const varName = hslVarMatch[1];
    const varValue = getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
    if (varValue) {
      const parts = varValue.split(/\s+/);
      if (parts.length === 3) {
        return `hsl(${parts[0]}, ${parts[1]}, ${parts[2]})`;
      }
    }
  }

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
  useVertexColors?: boolean;
  requestRender?: () => void;
}

export function Surface3D({
  scene,
  sceneVersion,
  data,
  color = '#3b82f6',
  wireframe = false,
  opacity = 0.85,
  useVertexColors = false,
  requestRender,
}: Surface3DProps) {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const vertexBufferRef = useRef<Float32Array | null>(null);
  const normalBufferRef = useRef<Float32Array | null>(null);
  const colorBufferRef = useRef<Float32Array | null>(null);
  const indexBufferRef = useRef<Uint32Array | null>(null);
  const { theme, resolvedTheme } = useTheme();

  const baseColor = useMemo(() => {
    const resolved = resolveColor(color);
    const next = new THREE.Color();
    try {
      next.setStyle(resolved);
    } catch {
      next.setStyle('#3b82f6');
    }
    return next;
  }, [color, theme, resolvedTheme]);

  useEffect(() => {
    if (!scene) return;

    if (!geometryRef.current) {
      geometryRef.current = new THREE.BufferGeometry();
    }

    if (!materialRef.current) {
      materialRef.current = new THREE.MeshStandardMaterial({
        color: baseColor,
        wireframe,
        opacity,
        transparent: opacity < 1,
        vertexColors: useVertexColors && !!data.colors,
        side: THREE.DoubleSide,
        roughness: 0.4,
        metalness: 0.05,
      });
    }

    if (!meshRef.current && geometryRef.current && materialRef.current) {
      meshRef.current = new THREE.Mesh(geometryRef.current, materialRef.current);
      meshRef.current.frustumCulled = false;
      scene.add(meshRef.current);
    }

    return () => {
      if (meshRef.current && scene) {
        scene.remove(meshRef.current);
      }
      geometryRef.current?.dispose();
      materialRef.current?.dispose();
      meshRef.current = null;
      geometryRef.current = null;
      materialRef.current = null;
      vertexBufferRef.current = null;
      normalBufferRef.current = null;
      colorBufferRef.current = null;
      indexBufferRef.current = null;
    };
  }, [scene, sceneVersion]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.color.copy(baseColor);
      materialRef.current.wireframe = wireframe;
      materialRef.current.opacity = opacity;
      materialRef.current.transparent = opacity < 1;
      materialRef.current.vertexColors = useVertexColors && !!data.colors;
    }
  }, [baseColor, wireframe, opacity, useVertexColors, data.colors]);

  useEffect(() => {
    const geometry = geometryRef.current;
    if (!geometry) return;

    const ensureFloat32 = (ref: MutableRefObject<Float32Array | null>, source: Float32Array) => {
      if (!ref.current || ref.current.length !== source.length) {
        ref.current = new Float32Array(source.length);
      }
      ref.current.set(source);
      return ref.current;
    };

    const ensureUint32 = (ref: MutableRefObject<Uint32Array | null>, source: Uint32Array) => {
      if (!ref.current || ref.current.length !== source.length) {
        ref.current = new Uint32Array(source.length);
      }
      ref.current.set(source);
      return ref.current;
    };

    const positions = ensureFloat32(vertexBufferRef, data.vertices);
    const normals = ensureFloat32(normalBufferRef, data.normals);
    const indices = ensureUint32(indexBufferRef, data.indices);
    const colors = data.colors ? ensureFloat32(colorBufferRef, data.colors) : null;

    let positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (!positionAttr || positionAttr.array.length !== positions.length) {
      positionAttr = new THREE.BufferAttribute(positions, 3);
      geometry.setAttribute('position', positionAttr);
    } else {
      positionAttr.array.set(positions);
      positionAttr.needsUpdate = true;
    }

    let normalAttr = geometry.getAttribute('normal') as THREE.BufferAttribute | undefined;
    if (!normalAttr || normalAttr.array.length !== normals.length) {
      normalAttr = new THREE.BufferAttribute(normals, 3);
      geometry.setAttribute('normal', normalAttr);
    } else {
      normalAttr.array.set(normals);
      normalAttr.needsUpdate = true;
    }

    if (colors) {
      let colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute | undefined;
      if (!colorAttr || colorAttr.array.length !== colors.length) {
        colorAttr = new THREE.BufferAttribute(colors, 3);
        geometry.setAttribute('color', colorAttr);
      } else {
        colorAttr.array.set(colors);
        colorAttr.needsUpdate = true;
      }
    } else {
      geometry.deleteAttribute('color');
    }

    if (!geometry.index || geometry.index.count !== indices.length) {
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    } else if (geometry.index) {
      geometry.index.array.set(indices);
      geometry.index.needsUpdate = true;
    }

    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    requestRender?.();
  }, [data, requestRender]);

  return null;
}
