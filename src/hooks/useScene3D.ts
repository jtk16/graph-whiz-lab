import { MutableRefObject, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface SceneApi {
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
  controls: OrbitControls | null;
  isReady: boolean;
  sceneVersion: number;
  requestRender: () => void;
}

export function useScene3D(
  targetRef?: MutableRefObject<HTMLCanvasElement | null>,
  enabled = true
): SceneApi {
  const internalRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = targetRef ?? internalRef;

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingFrameRef = useRef(false);

  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const [sceneVersion, setSceneVersion] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useLayoutEffect(() => {
    const current = canvasRef.current;
    if (current !== canvasEl) {
      setCanvasEl(current);
    }
  });

  const renderFrame = useCallback(() => {
    rafRef.current = null;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    if (!scene || !camera || !renderer) {
      pendingFrameRef.current = false;
      return;
    }

    const shouldContinue = controlsRef.current?.update() ?? false;
    renderer.render(scene, camera);

    if (shouldContinue || pendingFrameRef.current) {
      pendingFrameRef.current = false;
      rafRef.current = requestAnimationFrame(renderFrame);
    }
  }, []);

  const requestRender = useCallback(() => {
    if (!rendererRef.current) return;
    pendingFrameRef.current = true;
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(renderFrame);
    }
  }, [renderFrame]);

  useLayoutEffect(() => {
    if (!enabled || !canvasEl || sceneRef.current) {
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
      antialias: true,
      alpha: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = false;
    renderer.setPixelRatio(window.devicePixelRatio || 1);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.set(8, 8, 8);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    const directional = new THREE.DirectionalLight(0xffffff, 1.25);
    directional.position.set(5, 10, 7.5);
    scene.add(ambient, directional);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;

    const handleResize = () => {
      if (!canvasEl || !rendererRef.current || !cameraRef.current) return;
      const { clientWidth, clientHeight } = canvasEl;
      rendererRef.current.setSize(clientWidth, clientHeight, false);
      cameraRef.current.aspect = clientWidth / Math.max(1, clientHeight);
      cameraRef.current.updateProjectionMatrix();
      requestRender();
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const handleControlChange = () => requestRender();
    controls.addEventListener('change', handleControlChange);
    controls.addEventListener('start', handleControlChange);
    controls.addEventListener('end', handleControlChange);

    setIsReady(true);
    setSceneVersion(prev => prev + 1);
    requestRender();

    return () => {
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('change', handleControlChange);
      controls.removeEventListener('start', handleControlChange);
      controls.removeEventListener('end', handleControlChange);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pendingFrameRef.current = false;
      controls.dispose();
      renderer.dispose();
      scene.clear();
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
      setIsReady(false);
    };
  }, [enabled, canvasEl, requestRender]);

  return useMemo(
    () => ({
      scene: sceneRef.current,
      camera: cameraRef.current,
      renderer: rendererRef.current,
      controls: controlsRef.current,
      isReady,
      sceneVersion,
      requestRender,
    }),
    [isReady, sceneVersion, requestRender]
  );
}
