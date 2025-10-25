import { MutableRefObject, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface SceneApi {
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
  controls: OrbitControls | null;
  isReady: boolean;
  sceneVersion: number;
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

  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const [sceneVersion, setSceneVersion] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useLayoutEffect(() => {
    const current = canvasRef.current;
    if (current !== canvasEl) {
      setCanvasEl(current);
    }
  });

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

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.set(8, 8, 8);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    const directional = new THREE.DirectionalLight(0xffffff, 1.25);
    directional.position.set(5, 10, 7.5);
    scene.add(ambient, directional, new THREE.GridHelper(10, 10), new THREE.AxesHelper(5));

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
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      rafRef.current = requestAnimationFrame(render);
      controls.update();
      renderer.render(scene, camera);
    };
    rafRef.current = requestAnimationFrame(render);

    setIsReady(true);
    setSceneVersion(prev => prev + 1);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      controls.dispose();
      renderer.dispose();
      scene.clear();
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
      setIsReady(false);
    };
  }, [enabled, canvasEl]);

  return useMemo(
    () => ({
      scene: sceneRef.current,
      camera: cameraRef.current,
      renderer: rendererRef.current,
      controls: controlsRef.current,
      isReady,
      sceneVersion,
    }),
    [isReady, sceneVersion]
  );
}
