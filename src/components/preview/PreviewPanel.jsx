// src/components/preview/PreviewPanel.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { convert as ConvertSCADToThree, disposeObject } from "../../engine/scadEngine";

const PreviewPanel = ({ scadCode, runTrigger, onError, addLog, onObjectReady }) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const objectsGroupRef = useRef(null);
  const animationRef = useRef(null);
  // Keep latest scadCode in a ref — always readable inside effects without being a dep
  const scadCodeRef = useRef(scadCode);
  scadCodeRef.current = scadCode; // sync every render, no useEffect needed

  // Stable refs for callbacks — prevents effect re-firing when parent re-renders
  const onErrorRef      = useRef(onError);
  const addLogRef       = useRef(addLog);
  const onObjectReadyRef = useRef(onObjectReady);
  onErrorRef.current       = onError;
  addLogRef.current        = addLog;
  onObjectReadyRef.current = onObjectReady;

  const [loading, setLoading] = useState(false);

  // Use engine's disposeObject — handles geometry, materials AND textures
  // Replaces local clearGroup which missed texture disposal (GPU memory leak)
  const clearGroup = useCallback((group) => {
    if (!group) return;
    disposeObject(group);
    group.clear();
  }, []);

  // ------------------------------
  // Fit camera to object safely
  // ------------------------------
  const fitCameraToObject = useCallback((object) => {
    if (!object) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    const distance = Math.min(Math.max(maxDim / 2 / Math.tan(fov / 2) * 1.5, 10), 1000);

    camera.position.set(center.x + distance, center.y + distance * 0.8, center.z + distance);
    controls.target.copy(center);
    controls.update();
  }, []);

  // ------------------------------
  // THREE INIT
  // ------------------------------
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1e1e1e);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.01, 5000);
    camera.position.set(60, 60, 60);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controlsRef.current = controls;

    // Lights
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(50, 80, 50);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    // Helpers
    scene.add(new THREE.GridHelper(200, 40, 0x444444, 0x222222));
    scene.add(new THREE.AxesHelper(50));

    // Object container — all SCAD meshes live here
    const group = new THREE.Group();
    scene.add(group);
    objectsGroupRef.current = group;

    // Render loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize handling
    let resizeTimeout;
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        camera.aspect = mount.clientWidth / mount.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mount.clientWidth, mount.clientHeight);
      }, 50);
    });
    resizeObserver.observe(mount);

    return () => {
      cancelAnimationFrame(animationRef.current);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      clearGroup(group);
    };
  }, [clearGroup]);

  // ------------------------------
  // REAL-TIME CLEAR
  // Watches scadCode — if editor becomes empty, immediately clears
  // preview and resets camera without waiting for Run
  // ------------------------------
  useEffect(() => {
    if (scadCode?.trim()) return; // has code — do nothing, wait for Run

    const group = objectsGroupRef.current;
    if (!group) return;

    clearGroup(group);
    onErrorRef.current?.(null);

    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(60, 60, 60);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [scadCode, clearGroup]);

  // ------------------------------
  // SCAD RENDER — only fires when Run is pressed (runTrigger increments)
  // Reads latest code from scadCodeRef — no stale closure, no keystroke cancellation
  // ------------------------------
  useEffect(() => {
    if (runTrigger === 0) return; // skip initial mount

    const group = objectsGroupRef.current;
    if (!group) return;

    const addLog        = addLogRef.current;
    const onError       = onErrorRef.current;
    const onObjectReady = onObjectReadyRef.current;
    const currentCode   = scadCodeRef.current;

    clearGroup(group);

    if (!currentCode?.trim()) {
      addLog?.("info", "Editor is empty — nothing to render");
      onError?.(null);
      return;
    }

    let cancelled = false;
    const renderAsync = async () => {
      setLoading(true);
      addLog?.("info", "Parsing SCAD code...");
      try {
        const rootObject = await ConvertSCADToThree(currentCode);
        if (cancelled) return;

        if (rootObject instanceof THREE.Object3D) {
          group.add(rootObject);
          fitCameraToObject(rootObject);
          onObjectReady?.(rootObject);
          onError?.(null);
          addLog?.("success", "3D model rendered successfully");
        } else {
          onError?.("Engine returned invalid object");
          addLog?.("error", "Engine returned invalid object — check SCAD syntax");
        }
      } catch (err) {
        if (!cancelled) {
          onError?.(err.message || "Render error");
          addLog?.("error", `Render error: ${err.message}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    renderAsync();
    return () => { cancelled = true; };

  }, [runTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------
  // CAMERA CONTROLS
  // ------------------------------
  const zoomIn = () => { controlsRef.current?.dollyIn(1.2); controlsRef.current?.update(); };
  const zoomOut = () => { controlsRef.current?.dollyOut(1.2); controlsRef.current?.update(); };
  const resetCamera = () => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    camera.position.set(60, 60, 60);
    controls.target.set(0, 0, 0);
    controls.update();
  };

  return (
    <div className="relative w-full h-full bg-[#1e1e1e]">
      {/* Header — matches PreviewPanel style exactly */}
      <div className="flex items-center px-3 py-1 border-b border-[#222] shrink-0">
        <span className="text-gray-400 font-semibold text-sm font-mono">Panel</span>
      </div>
      <div ref={mountRef} className="w-full h-full" />
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button onClick={zoomIn} className="bg-[#333] hover:bg-[#444] px-3 py-1 text-white rounded">+</button>
        <button onClick={zoomOut} className="bg-[#333] hover:bg-[#444] px-3 py-1 text-white rounded">−</button>
        <button onClick={resetCamera} className="bg-[#333] hover:bg-[#444] px-3 py-1 text-white rounded text-xs">Reset</button>
      </div>
      {loading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-lg">
          Rendering...
        </div>
      )}
    </div>
  );
};

export default PreviewPanel;