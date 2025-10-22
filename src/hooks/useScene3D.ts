import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface Scene3DConfig {
  backgroundColor?: number;
  ambientLightIntensity?: number;
  directionalLightIntensity?: number;
  cameraPosition?: [number, number, number];
  enableGrid?: boolean;
  enableAxes?: boolean;
}

export function useScene3D(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  config: Scene3DConfig = {}
) {
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const controlsRef = useRef<OrbitControls>();
  const animationFrameRef = useRef<number>();
  
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    if (!canvasRef.current) {
      console.log('[useScene3D] Canvas ref not available yet');
      return;
    }
    
    console.log('[useScene3D] Initializing scene...');
    
    // Initialize Three.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(config.backgroundColor ?? 0x0a0a0a);
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(
      75,
      canvasRef.current.clientWidth / canvasRef.current.clientHeight,
      0.1,
      1000
    );
    
    const [x, y, z] = config.cameraPosition || [8, 8, 8];
    camera.position.set(x, y, z);
    
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true
    });
    
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // Orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(
      0xffffff,
      config.ambientLightIntensity ?? 0.5
    );
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(
      0xffffff,
      config.directionalLightIntensity ?? 0.8
    );
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);
    
    // Optional grid
    if (config.enableGrid !== false) {
      const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
      scene.add(gridHelper);
    }
    
    // Optional axes
    if (config.enableAxes !== false) {
      const axesHelper = new THREE.AxesHelper(5);
      scene.add(axesHelper);
    }
    
    // Store refs
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;
    
    console.log('[useScene3D] Scene initialized successfully');
    setIsReady(true);
    
    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
    
    // Handle resize
    const handleResize = () => {
      if (!canvasRef.current || !camera || !renderer) return;
      
      const width = canvasRef.current.clientWidth;
      const height = canvasRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      controls.dispose();
      renderer.dispose();
    };
  }, [canvasRef, config.backgroundColor, config.ambientLightIntensity, config.directionalLightIntensity, config.cameraPosition, config.enableGrid, config.enableAxes]);
  
  return {
    scene: sceneRef.current,
    camera: cameraRef.current,
    renderer: rendererRef.current,
    controls: controlsRef.current,
    isReady
  };
}
