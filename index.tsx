import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { Send, Globe, Play, Disc, X, Settings } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'lil-gui';

// --- Types ---

interface MoodData {
  sentiment: number;
  energy: number;
  color: string;
  keywords: string[];
}

interface AnimationParams {
  collapseDuration: number;
  pulseDuration: number;
  flightDuration: number;
  nebulaSize: number;
  nebulaSpeed: number;
  particleCount: number;
  trailLength: number;
  bloomStrength: number;
}

// --- Three.js Scene Component ---

// Methods exposed to React parent
interface ThreeSceneHandle {
  spawnProjectile: (rect: DOMRect, color: string) => void;
  updateParams: (params: AnimationParams) => void;
}

const ThreeScene = forwardRef<ThreeSceneHandle, { params: AnimationParams, onReady: (gui: GUI) => void }>(({ params: initialParams, onReady }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const nebulaRef = useRef<THREE.Points | null>(null);
  const projectilesRef = useRef<any[]>([]);
  const paramsRef = useRef(initialParams);

  // Generate Texture for soft glow particles
  const createGlowTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    if (context) {
        const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
        gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 32, 32);
    }
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  useImperativeHandle(ref, () => ({
    updateParams: (newParams) => {
        paramsRef.current = newParams;
        // Update live nebula properties
        if (nebulaRef.current) {
            // Re-generate if particle count changes strictly needed, but for perf we might just scale
            // For now, let's just handle visual props
        }
    },
    spawnProjectile: (rect: DOMRect, colorHex: string) => {
        if (!cameraRef.current || !sceneRef.current) return;

        // 1. Convert DOM Rect center to Normalized Device Coordinates (NDC)
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        
        const ndcX = (x / window.innerWidth) * 2 - 1;
        const ndcY = -(y / window.innerHeight) * 2 + 1;

        // 2. Unproject to find 3D position at a specific Z depth
        // We want the start position to be "on the screen plane" roughly
        // But since we are in 3D, let's pick a Z that is close to the camera but visible
        const vector = new THREE.Vector3(ndcX, ndcY, 0.5); // 0.5 is halfway between near/far
        vector.unproject(cameraRef.current);
        
        const dir = vector.sub(cameraRef.current.position).normalize();
        const distance = -cameraRef.current.position.z / dir.z; // Intersection with Z=0 plane if camera is at +Z
        // Let's just create a vector at a fixed distance from camera for "UI plane" feel
        // Actually, getting the exact world pos for Z=0 is good if nebula is at 0,0,0
        
        // Let's assume nebula is at 0,0,0. Camera is at z=100.
        // We want spawn point to visually match input.
        // We project ray from camera through screen pixel. Intersection with Z=20 (closer to camera)
        const targetZ = 20; 
        const distanceToTargetZ = (targetZ - cameraRef.current.position.z) / dir.z;
        const startPos = cameraRef.current.position.clone().add(dir.multiplyScalar(distanceToTargetZ));

        // Create Projectile
        const geometry = new THREE.SphereGeometry(0.5, 16, 16);
        const material = new THREE.MeshBasicMaterial({ 
            color: new THREE.Color(colorHex),
            transparent: true,
            opacity: 1
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(startPos);
        
        // Glow Sprite
        const spriteMat = new THREE.SpriteMaterial({ 
            map: createGlowTexture(), 
            color: new THREE.Color(colorHex), 
            transparent: true, 
            blending: THREE.AdditiveBlending 
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(4, 4, 1);
        mesh.add(sprite);

        sceneRef.current.add(mesh);

        // Path calculation (Bezier)
        // Start: Calculated UI pos
        // End: 0,0,0 (Nebula center)
        // Control points: Random curves
        const midX = (startPos.x + 0) / 2 + (Math.random() - 0.5) * 30;
        const midY = (startPos.y + 0) / 2 + (Math.random() - 0.5) * 30;
        const midZ = (startPos.z + 0) / 2 + (Math.random() - 0.5) * 20;
        
        const curve = new THREE.QuadraticBezierCurve3(
            startPos,
            new THREE.Vector3(midX, midY, midZ),
            new THREE.Vector3(0, 0, 0)
        );

        projectilesRef.current.push({
            mesh,
            curve,
            progress: 0,
            age: 0,
            speed: 1 / (60 * paramsRef.current.flightDuration), // Approx based on duration
            color: new THREE.Color(colorHex),
            trailPoints: []
        });
    }
  }));

  useEffect(() => {
    // --- Init Three.js ---
    const container = document.getElementById('canvas-container');
    if (!container) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Fog for depth
    scene.fog = new THREE.FogExp2(0x020617, 0.002);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 100;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- Controls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false; // Disable zoom to keep UI alignment
    controls.enablePan = false;  // Disable pan to keep UI alignment
    controls.rotateSpeed = 0.5;

    // --- Create Nebula ---
    const particleCount = initialParams.particleCount;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    const colorPalette = [
        new THREE.Color('#6366f1'), // Indigo
        new THREE.Color('#ec4899'), // Pink
        new THREE.Color('#06b6d4'), // Cyan
        new THREE.Color('#8b5cf6')  // Violet
    ];

    for (let i = 0; i < particleCount; i++) {
        // Spiral distribution
        const r = Math.random() * 50 + Math.random() * 20; // Radius
        const theta = Math.random() * Math.PI * 2 * 3; // Angle
        const phi = (Math.random() - 0.5) * 0.5; // Thickness

        // Galaxy shape math
        const x = r * Math.cos(theta);
        const y = (Math.random() - 0.5) * 10; // Vertical spread
        const z = r * Math.sin(theta);

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        sizes[i] = Math.random() * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
        size: 1.5,
        vertexColors: true,
        map: createGlowTexture(),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.8
    });

    const nebula = new THREE.Points(geometry, material);
    scene.add(nebula);
    nebulaRef.current = nebula;

    // --- Starfield Background ---
    const starsGeo = new THREE.BufferGeometry();
    const starsPos = new Float32Array(1000 * 3);
    for(let i=0; i<1000*3; i++) starsPos[i] = (Math.random() - 0.5) * 400;
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starsPos, 3));
    const starsMat = new THREE.PointsMaterial({color: 0xffffff, size: 0.5, transparent: true, opacity: 0.4});
    const starField = new THREE.Points(starsGeo, starsMat);
    scene.add(starField);

    // --- Animation Loop ---
    let time = 0;
    const animate = () => {
        requestAnimationFrame(animate);
        time += 0.005;

        controls.update(); // Update controls

        // Rotate Nebula (Auto rotate slowly)
        if (nebulaRef.current) {
            nebulaRef.current.rotation.y += paramsRef.current.nebulaSpeed;
        }
        
        // Rotate Starfield slowly
        starField.rotation.y += paramsRef.current.nebulaSpeed * 0.1;

        // Animate Projectiles
        for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
            const p = projectilesRef.current[i];
            p.progress += p.speed;
            p.age += 1/60;

            if (p.progress >= 1) {
                // Reached center
                scene.remove(p.mesh);
                projectilesRef.current.splice(i, 1);
                
                // Flash effect at center (simple)
                // In a real app we'd spawn a flash mesh here
                continue;
            }

            // Move along curve
            const point = p.curve.getPoint(p.progress);
            p.mesh.position.copy(point);
            
            // Shrink
            const scale = Math.max(0.1, 1 - p.progress);
            p.mesh.scale.setScalar(scale);
        }

        renderer.render(scene, camera);
    };
    animate();

    // --- Resize Handler ---
    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
        window.removeEventListener('resize', handleResize);
        container.removeChild(renderer.domElement);
        renderer.dispose();
        controls.dispose();
    };
  }, []); // Run once on mount

  return null; // This component renders to the portal div, no React DOM output
});

// --- Main App Component ---

const App = () => {
  const [inputText, setInputText] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  
  // State Machine: 'idle' -> 'condensing' -> 'pulsing' -> 'launched'
  const [contributionState, setContributionState] = useState<'idle' | 'condensing' | 'pulsing' | 'launched'>('idle');

  const inputRef = useRef<HTMLInputElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const threeSceneRef = useRef<ThreeSceneHandle>(null);
  
  // Animation Params (synced with GUI)
  const paramsRef = useRef<AnimationParams>({
      collapseDuration: 1000,
      pulseDuration: 1500, // This is the "pause" you asked about
      flightDuration: 4.0,
      nebulaSize: 50,
      nebulaSpeed: 0.001,
      particleCount: 2000,
      trailLength: 50,
      bloomStrength: 0.5
  });

  // --- GUI Setup ---
  useEffect(() => {
    const gui = new GUI({ title: 'Cosmic Controls' });
    const p = paramsRef.current;
    
    const folderAnim = gui.addFolder('Interaction');
    folderAnim.add(p, 'collapseDuration', 200, 3000).name('Collapse (ms)');
    folderAnim.add(p, 'pulseDuration', 0, 5000).name('Pulse/Hold (ms)');
    folderAnim.add(p, 'flightDuration', 1, 10).name('Flight Time (s)');
    
    const folderVisual = gui.addFolder('Universe');
    folderVisual.add(p, 'nebulaSpeed', 0, 0.01).name('Rotation Speed');
    
    folderAnim.onChange(() => {
        if(threeSceneRef.current) threeSceneRef.current.updateParams(p);
    });
    folderVisual.onChange(() => {
        if(threeSceneRef.current) threeSceneRef.current.updateParams(p);
    });

    return () => { gui.destroy(); }
  }, []);

  // Timer Logic
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const nextCycleHour = Math.ceil((now.getUTCHours() + 1) / 8) * 8;
      const target = new Date(now);
      target.setUTCHours(nextCycleHour % 24, 0, 0, 0);
      if (nextCycleHour >= 24) target.setDate(target.getDate() + 1);

      const diff = target.getTime() - now.getTime();
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    const interval = setInterval(updateTimer, 1000);
    updateTimer();
    return () => clearInterval(interval);
  }, []);

  const handleContribute = async () => {
    if (!inputText.trim()) return;
    if (!process.env.API_KEY) { alert("API Key Required"); return; }
    
    // Capture color before clearing text
    const colors = ['#6366f1', '#ec4899', '#06b6d4', '#f59e0b'];
    const moodColor = colors[Math.floor(Math.random() * colors.length)];

    const textToAnalyze = inputText;
    
    // 1. Condense
    setContributionState('condensing'); 
    setInputText(''); // Clear text immediately for visual cleanup

    // Wait for collapse to finish
    setTimeout(() => {
        // 2. Pulse / Hold
        setContributionState('pulsing');
        
        // Wait for pulse duration
        setTimeout(() => {
            // 3. Launch
            if (inputContainerRef.current && threeSceneRef.current) {
                const rect = inputContainerRef.current.getBoundingClientRect();
                threeSceneRef.current.spawnProjectile(rect, moodColor);
            }
            
            setContributionState('launched');

            // Reset UI
            setTimeout(() => {
                setContributionState('idle');
            }, (paramsRef.current.flightDuration * 1000));

        }, paramsRef.current.pulseDuration);

    }, paramsRef.current.collapseDuration);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleContribute();
  };

  // Updated strategy: Use max-width for smooth interpolation
  // Base state is w-full, we clamp it with max-w
  const getInputStyles = () => {
    const duration = paramsRef.current.collapseDuration;
    switch (contributionState) {
        case 'condensing':
            return {
                className: "max-w-[3.5rem] md:max-w-[4rem] bg-white px-0 shadow-[inset_0_0_20px_rgba(255,255,255,0.8)] border-white",
                style: { transitionDuration: `${duration}ms` }
            };
        case 'pulsing':
            return {
                className: "max-w-[3.5rem] md:max-w-[4rem] bg-white px-0 shadow-[0_0_30px_rgba(255,255,255,0.8)] border-white animate-scale-pulse",
                style: { transitionDuration: '300ms' }
            };
        case 'launched':
            return {
                className: "max-w-[3.5rem] md:max-w-[4rem] bg-white/0 border-transparent opacity-0 pointer-events-none",
                style: { transitionDuration: '0ms' } // Instant hide for handoff
            };
        case 'idle':
        default:
            return {
                className: "max-w-xl bg-white/5 px-8 shadow-2xl border-white/10 opacity-100",
                style: { transitionDuration: '300ms' }
            };
    }
  };

  const inputStyle = getInputStyles();

  return (
    <>
      <ThreeScene params={paramsRef.current} ref={threeSceneRef} onReady={() => {}} />

      {/* Main UI Layer (Pointer events auto) */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between p-8 pointer-events-none">
        
        {/* Header */}
        <div className="flex justify-between items-start pointer-events-auto">
             <div className="flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity cursor-pointer">
                <div className="relative w-8 h-8">
                    <div className="absolute inset-0 bg-cyan-500 rounded-full blur-md opacity-50 animate-pulse"></div>
                    <Globe className="relative w-8 h-8 text-cyan-400" />
                </div>
                <span className="text-lg font-bold tracking-wider text-white">Earth Echoes</span>
            </div>
        </div>

        {/* Center Timer */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 text-center pointer-events-none">
            <div className="text-[10px] md:text-xs font-mono text-cyan-200/60 tracking-[0.4em] uppercase mb-2">Next Echo In</div>
            <div className="text-4xl md:text-6xl font-light tracking-widest font-mono text-white drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                {timeLeft}
            </div>
        </div>

        {/* Bottom Input Area */}
        <div className="w-full flex justify-center items-end pb-24 pointer-events-none">
             {/* Note: Changed static className to use w-full instead of max-w-xl, allowing max-width to be controlled dynamically */}
             <div 
               ref={inputContainerRef}
               style={inputStyle.style}
               className={`pointer-events-auto relative w-full h-14 md:h-16 rounded-full backdrop-blur-xl border transition-all ease-in-out overflow-hidden flex items-center justify-center ${inputStyle.className}`}
             >
                <input 
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={contributionState !== 'idle'}
                  placeholder="Add your vibe to the world..."
                  className={`w-full h-full bg-transparent border-none text-lg md:text-xl text-white placeholder:text-white/30 focus:outline-none text-center md:text-left transition-opacity duration-300 ${contributionState !== 'idle' ? 'opacity-0' : 'opacity-100'}`}
                  style={{ paddingLeft: contributionState === 'idle' ? '2rem' : '0', paddingRight: contributionState === 'idle' ? '3.5rem' : '0' }}
                />
                
                <div className={`absolute right-3 top-1/2 -translate-y-1/2 z-30 transition-opacity duration-300 ${contributionState !== 'idle' ? 'opacity-0' : 'opacity-100'}`}>
                   <button 
                     onClick={handleContribute}
                     disabled={!inputText}
                     className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                   >
                     <Send className="w-4 h-4 ml-0.5" />
                   </button>
                </div>
             </div>
        </div>

        {/* Floating Player (Bottom Right) */}
        <div className="absolute bottom-8 right-8 pointer-events-auto hidden md:block">
             <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-4 w-80 hover:bg-slate-900/80 transition-colors cursor-pointer group shadow-2xl">
                 <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-indigo-500 opacity-20 group-hover:opacity-40 transition-opacity"></div>
                    <Disc className="w-6 h-6 text-indigo-300 animate-spin-slow" />
                 </div>
                 <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-slate-400 font-mono mb-0.5 uppercase tracking-wider">Last Echo #1024</div>
                    <div className="text-sm font-medium text-white truncate">Monday Morning Haze</div>
                 </div>
                 <button className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform">
                    <Play className="w-3 h-3 ml-0.5" />
                 </button>
             </div>
        </div>

      </div>
    </>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);