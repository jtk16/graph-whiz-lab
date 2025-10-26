import { useEffect, useMemo, useRef } from 'react';
import { useTheme } from 'next-themes';
import * as THREE from 'three';
import { CurveData } from '@/lib/computation/evaluators/ParametricCurveEvaluator';

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

interface BatchCurve {
  id: string;
  data: CurveData;
  color?: string;
}

interface Curve3DBatchProps {
  scene: THREE.Scene | null;
  sceneVersion: number;
  curves: BatchCurve[];
  opacity?: number;
  requestRender?: () => void;
}

export function Curve3DBatch({
  scene,
  sceneVersion,
  curves,
  opacity = 1,
  requestRender,
}: Curve3DBatchProps) {
  const lineRef = useRef<THREE.LineSegments | null>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const materialRef = useRef<THREE.LineBasicMaterial | null>(null);
  const positionBufferRef = useRef<Float32Array | null>(null);
  const colorBufferRef = useRef<Float32Array | null>(null);
  const { theme, resolvedTheme } = useTheme();

  const totalSegmentData = useMemo(() => {
    let vertexPairs = 0;
    curves.forEach(curve => {
      const pointCount = (curve.data.points?.length ?? 0) / 3;
      if (pointCount >= 2) {
        vertexPairs += (pointCount - 1);
      }
    });

    if (vertexPairs === 0) {
      return { positions: null, colors: null };
    }

    const positions =
      positionBufferRef.current && positionBufferRef.current.length === vertexPairs * 2 * 3
        ? positionBufferRef.current
        : new Float32Array(vertexPairs * 2 * 3);

    if (positions !== positionBufferRef.current) {
      positionBufferRef.current = positions;
    }

    const colors =
      colorBufferRef.current && colorBufferRef.current.length === vertexPairs * 2 * 3
        ? colorBufferRef.current
        : new Float32Array(vertexPairs * 2 * 3);

    if (colors !== colorBufferRef.current) {
      colorBufferRef.current = colors;
    }

    let writeIndex = 0;
    curves.forEach(curve => {
      const pts = curve.data.points;
      if (!pts || pts.length < 6) return;
      const colorStyle = resolveColor(curve.color ?? '#3b82f6');
      const color = new THREE.Color();
      try {
        color.setStyle(colorStyle);
      } catch {
        color.setStyle('#3b82f6');
      }

      for (let i = 0; i < pts.length - 3; i += 3) {
        const ax = pts[i];
        const ay = pts[i + 1];
        const az = pts[i + 2];
        const bx = pts[i + 3];
        const by = pts[i + 4];
        const bz = pts[i + 5];

        positions[writeIndex] = ax;
        positions[writeIndex + 1] = ay;
        positions[writeIndex + 2] = az;
        positions[writeIndex + 3] = bx;
        positions[writeIndex + 4] = by;
        positions[writeIndex + 5] = bz;

        colors[writeIndex] = color.r;
        colors[writeIndex + 1] = color.g;
        colors[writeIndex + 2] = color.b;
        colors[writeIndex + 3] = color.r;
        colors[writeIndex + 4] = color.g;
        colors[writeIndex + 5] = color.b;

        writeIndex += 6;
      }
    });

    return { positions, colors };
  }, [curves, theme, resolvedTheme]);

  useEffect(() => {
    if (!scene) return;
    let cleanup = false;

    if (!geometryRef.current) {
      geometryRef.current = new THREE.BufferGeometry();
    }

    if (!materialRef.current) {
      materialRef.current = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: opacity < 1,
        opacity,
      });
    } else {
      materialRef.current.opacity = opacity;
      materialRef.current.transparent = opacity < 1;
    }

    if (!lineRef.current) {
      lineRef.current = new THREE.LineSegments(geometryRef.current, materialRef.current);
      scene.add(lineRef.current);
      cleanup = true;
    }

    return () => {
      if (cleanup && lineRef.current && scene) {
        scene.remove(lineRef.current);
      }
    };
  }, [scene, sceneVersion, opacity]);

  useEffect(() => {
    const geometry = geometryRef.current;
    const line = lineRef.current;
    if (!geometry || !line) return;

    const { positions, colors } = totalSegmentData;
    const segmentCount = positions ? positions.length / 6 : 0;

    if (!positions || !colors || segmentCount === 0) {
      line.visible = false;
      geometry.setDrawRange(0, 0);
      requestRender?.();
      return;
    }

    let positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (!positionAttr || positionAttr.array.length !== positions.length) {
      positionAttr = new THREE.BufferAttribute(positions, 3);
      geometry.setAttribute('position', positionAttr);
    } else {
      if (positionAttr.array !== positions) {
        positionAttr.array.set(positions);
      }
      positionAttr.needsUpdate = true;
    }

    let colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute | undefined;
    if (!colorAttr || colorAttr.array.length !== colors.length) {
      colorAttr = new THREE.BufferAttribute(colors, 3);
      geometry.setAttribute('color', colorAttr);
    } else {
      if (colorAttr.array !== colors) {
        colorAttr.array.set(colors);
      }
      colorAttr.needsUpdate = true;
    }

    geometry.computeBoundingSphere();
    geometry.setDrawRange(0, segmentCount * 2);
    line.visible = true;
    requestRender?.();
  }, [totalSegmentData, requestRender]);

  useEffect(() => {
    const sceneInstance = scene;
    return () => {
      if (lineRef.current && sceneInstance) {
        sceneInstance.remove(lineRef.current);
      }
      geometryRef.current?.dispose();
      materialRef.current?.dispose();
      lineRef.current = null;
      geometryRef.current = null;
      materialRef.current = null;
    };
  }, [scene]);

  return null;
}
