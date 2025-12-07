"use client";

import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useState,
} from "react";
import * as THREE from "three";
import { supabase, Post } from "@/lib/supabase";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// --- Types ---
export interface AnimationParams {
  // 坍缩动画
  collapseDuration: number; // 坍缩持续时间

  // 脉冲/悬停
  pulseDuration: number; // 脉冲持续时间
  pulseScale: number; // 脉冲缩放

  // 随机漂移（使用三次贝塞尔曲线）
  wanderDuration: number; // 总漂移时间
  wanderCurveCount: number; // 曲线段数
  wanderRadius: number; // 漂移半径
  wanderSpeedVariation: number; // 速度变化幅度 (0-1)

  // 飞向星云
  flightDuration: number; // 飞行持续时间
  flightCurve: number; // 曲线弯曲程度

  // 粒子外观
  particleSize: number; // 粒子大小
  particleGlow: number; // 光晕大小
  trailLength: number; // 拖尾长度
  trailOpacity: number; // 拖尾透明度

  // 星云
  nebulaSpeed: number; // 旋转速度
  nebulaParticleCount: number; // 星云粒子数
  nebulaScale: number; // 星云大小缩放
  nebulaBrightness: number; // 星云亮度 (0-3)
  nebulaParticleOpacity: number; // 星云粒子中心不透明度 (0-1)

  // 进入星云后闪烁
  settleBlinkDuration: number; // 闪烁持续时间（秒）
  settleBlinkSpeed: number; // 闪烁速度
  settleBlinkAmplitude: number; // 闪烁幅度 (0-1)

  // 摄像头位置
  cameraX: number;
  cameraY: number;
  cameraZ: number;

  // 摄像头动画目标
  cameraTargetX: number;
  cameraTargetY: number;
  cameraTargetZ: number;
  cameraPanDuration: number;
}

export interface ContributedParticle {
  id: string;
  text: string;
  color: string;
  timestamp: number;
  position: THREE.Vector3;
  mesh?: THREE.Mesh; // 用于点击检测
}

// Methods exposed to React parent
export interface ThreeSceneHandle {
  spawnProjectile: (
    rect: DOMRect,
    color: string,
    text: string,
    onComplete?: () => void
  ) => void;
  updateParams: (params: AnimationParams) => void;
  animateCamera: (onComplete?: () => void) => void;
  resetCamera: (onComplete?: () => void) => void; // 返回初始位置
  highlightParticle: (particleId: string | null) => void; // 高亮粒子
  getRandomNebulaParticle: () => ContributedParticle | null; // 获取随机星云粒子
  getHighlightedParticleScreenPosition: () => { x: number; y: number } | null; // 获取高亮粒子的屏幕坐标
  isShapeTransitioning: () => boolean; // 是否正在形态切换
}

interface ThreeSceneProps {
  params: AnimationParams;
  onParticleClick?: (particle: ContributedParticle) => void;
  selectedParticleId?: string | null; // 当前选中的粒子ID
  language?: string; // 当前语言
  onReady?: () => void;
}

// 动画阶段
type ProjectilePhase = "pulse" | "wander" | "flight" | "settling" | "nebula";

interface Projectile {
  id: string;
  text: string;
  mesh: THREE.Mesh;
  sprite: THREE.Sprite;
  trail: THREE.Mesh;
  trailPositions: THREE.Vector3[];
  phase: ProjectilePhase;
  phaseProgress: number;
  color: THREE.Color;
  lastPosition: THREE.Vector3; // 跟踪上一帧位置计算速度
  currentSpeed: number; // 当前速度

  // 起始位置
  startPos: THREE.Vector3;
  // 漂移曲线（三次贝塞尔）
  wanderCurve: THREE.CubicBezierCurve3;
  wanderCurveIndex: number;
  wanderCurves: THREE.CubicBezierCurve3[];
  wanderSpeedMultipliers: number[]; // 每段曲线的速度倍数
  // 最终目标（星云中的位置）
  targetPos: THREE.Vector3;
  // 飞行曲线
  flightCurve?: THREE.CubicBezierCurve3;
  // 完成回调
  onComplete?: () => void;

  timestamp: number;
}

// LocalStorage 键名
const STORAGE_KEY = "earthechoes_particles";

// 存储的粒子数据格式（不包含 THREE.Vector3）
interface StoredParticle {
  id: string;
  text: string;
  color: string;
  timestamp: number;
  position: { x: number; y: number; z: number };
}

// 保存粒子到 LocalStorage
const saveParticlesToStorage = (particles: StoredParticle[]) => {
  try {
    // 只保留最近100个用户贡献的粒子
    const recentParticles = particles.slice(-100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recentParticles));
  } catch (e) {
    console.warn("无法保存粒子到 LocalStorage:", e);
  }
};

// 从 LocalStorage 加载粒子
const loadParticlesFromStorage = (): StoredParticle[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn("无法从 LocalStorage 加载粒子:", e);
  }
  return [];
};

// 添加单个粒子到存储
const addParticleToStorage = (particle: StoredParticle) => {
  const particles = loadParticlesFromStorage();
  particles.push(particle);
  saveParticlesToStorage(particles);
};

// 创建渐变拖尾几何体（头部粗，尾部尖细）
const createTaperedTrailGeometry = (
  positions: THREE.Vector3[],
  headRadius: number,
  tailRadius: number
): THREE.BufferGeometry => {
  if (positions.length < 2) {
    return new THREE.BufferGeometry();
  }

  const segments = positions.length - 1;
  const radialSegments = 6;
  const vertices: number[] = [];
  const indices: number[] = [];

  // 为每个位置创建圆环顶点
  for (let i = 0; i < positions.length; i++) {
    const t = i / (positions.length - 1); // 0 到 1
    // 使用平滑的渐变曲线（尾部更尖细）
    const radius = headRadius * Math.pow(1 - t, 1.5) + tailRadius * t;

    const pos = positions[i];

    // 计算方向向量
    let direction: THREE.Vector3;
    if (i === 0) {
      direction = new THREE.Vector3()
        .subVectors(positions[1], positions[0])
        .normalize();
    } else if (i === positions.length - 1) {
      direction = new THREE.Vector3()
        .subVectors(positions[i], positions[i - 1])
        .normalize();
    } else {
      direction = new THREE.Vector3()
        .subVectors(positions[i + 1], positions[i - 1])
        .normalize();
    }

    // 创建垂直于方向的平面
    const up = new THREE.Vector3(0, 1, 0);
    if (Math.abs(direction.dot(up)) > 0.99) {
      up.set(1, 0, 0);
    }
    const right = new THREE.Vector3().crossVectors(direction, up).normalize();
    const upVec = new THREE.Vector3()
      .crossVectors(right, direction)
      .normalize();

    // 创建圆环顶点
    for (let j = 0; j <= radialSegments; j++) {
      const angle = (j / radialSegments) * Math.PI * 2;
      const x =
        pos.x +
        Math.cos(angle) * radius * right.x +
        Math.sin(angle) * radius * upVec.x;
      const y =
        pos.y +
        Math.cos(angle) * radius * right.y +
        Math.sin(angle) * radius * upVec.y;
      const z =
        pos.z +
        Math.cos(angle) * radius * right.z +
        Math.sin(angle) * radius * upVec.z;
      vertices.push(x, y, z);
    }
  }

  // 创建三角形索引
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * (radialSegments + 1) + j;
      const b = a + 1;
      const c = a + radialSegments + 1;
      const d = c + 1;

      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
};

const ThreeScene = forwardRef<ThreeSceneHandle, ThreeSceneProps>(
  (
    {
      params: initialParams,
      onParticleClick,
      selectedParticleId,
      language = "zh",
      onReady,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const nebulaRef = useRef<THREE.Points | null>(null);
    const projectilesRef = useRef<Projectile[]>([]);
    const settledParticlesRef = useRef<ContributedParticle[]>([]);
    const paramsRef = useRef(initialParams);
    const lastCameraParamsRef = useRef({
      x: initialParams.cameraX,
      y: initialParams.cameraY,
      z: initialParams.cameraZ,
    });
    const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
    const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
    const glowTextureRef = useRef<THREE.CanvasTexture | null>(null);
    const nebulaTextureRef = useRef<THREE.CanvasTexture | null>(null); // 星云专用纹理（中心更实）
    const onParticleClickRef = useRef(onParticleClick);
    const onReadyRef = useRef(onReady);
    const settledMeshesRef = useRef<THREE.Mesh[]>([]); // 保存已定居粒子的 mesh 引用
    const highlightedParticleIdRef = useRef<string | null>(null); // 当前高亮的粒子ID
    const highlightSpriteRef = useRef<THREE.Sprite | null>(null); // 高亮光环精灵
    const nebulaParticleDataRef = useRef<ContributedParticle[]>([]); // 星云粒子数据
    const nebulaPausedUntilRef = useRef<number>(0); // 星云暂停旋转直到此时间戳
    const carouselIndexRef = useRef<number>(0); // 轮播索引
    const highlightFadeRef = useRef<number>(0); // 高亮渐入渐出进度 (0-1)
    const highlightTargetRef = useRef<number>(0); // 高亮目标值 (0 或 1)
    const particleLinesRef = useRef<THREE.LineSegments | null>(null); // 粒子连线

    // 数据库心情数据
    const [databasePosts, setDatabasePosts] = useState<Post[]>([]);
    const databasePostsRef = useRef<Post[]>([]);

    // 形态变换系统
    type ShapeMode = "nebula" | "river" | "wave";
    const shapeModeRef = useRef<ShapeMode>("nebula");
    const shapeTransitionRef = useRef<number>(0); // 0-1 过渡进度
    const shapeTransitionTargetRef = useRef<ShapeMode>("nebula");
    const originalPositionsRef = useRef<Float32Array | null>(null); // 原始星云位置
    const targetPositionsRef = useRef<Float32Array | null>(null); // 目标位置
    const shapeTimerRef = useRef<number>(0); // 形态计时器
    const SHAPE_DURATION = 60; // 每种形态持续60秒
    const SHAPE_TRANSITION_DURATION = 4; // 过渡动画4秒（收缩+混合）
    const SHAPE_PAUSE_DURATION = 2; // 混合完成后停顿2秒
    const SHAPE_EXPAND_DURATION = 2; // 展开动画2秒
    const shapeExpandProgressRef = useRef<number>(0); // 展开进度 0-1
    const shapePauseTimerRef = useRef<number>(0); // 停顿计时器

    // 形态切换时的摄像头动画状态
    const shapeTransitionCameraStateRef = useRef<{
      phase: "idle" | "zooming-out" | "pausing" | "expanding" | "zooming-in";
      originalCameraPos: THREE.Vector3 | null;
    }>({ phase: "idle", originalCameraPos: null });

    // 摄像头动画状态
    const cameraAnimationRef = useRef<{
      isAnimating: boolean;
      startPos: THREE.Vector3;
      targetPos: THREE.Vector3;
      progress: number;
      duration: number;
      onComplete?: () => void;
    } | null>(null);

    // 更新 refs 以获取最新的回调
    useEffect(() => {
      onParticleClickRef.current = onParticleClick;
      onReadyRef.current = onReady;
    }, [onParticleClick, onReady]);

    // 从数据库加载对应语言的心情数据
    useEffect(() => {
      const loadPosts = async () => {
        try {
          const { data, error } = await supabase
            .from("posts")
            .select("*")
            .eq("language", language)
            .order("created_at", { ascending: false });

          if (error) {
            console.error("加载心情数据失败:", error);
            return;
          }

          if (data && data.length > 0) {
            setDatabasePosts(data);
            databasePostsRef.current = data;
            console.log(`加载了 ${data.length} 条 ${language} 心情数据`);

            // 更新星云粒子的心情数据
            if (nebulaParticleDataRef.current.length > 0) {
              const updatedParticles = nebulaParticleDataRef.current.map(
                (particle, i) => {
                  const post = data[i % data.length];
                  return {
                    ...particle,
                    id: post.id,
                    text: post.content,
                    color: post.color || particle.color,
                    timestamp: new Date(post.created_at).getTime(),
                  };
                }
              );
              nebulaParticleDataRef.current = updatedParticles;
            }
          }
        } catch (err) {
          console.error("加载心情数据异常:", err);
        }
      };

      loadPosts();
    }, [language]);

    // 创建发光纹理（只创建一次）- 用于飞行粒子（更亮更实心）
    const getGlowTexture = useCallback(() => {
      if (glowTextureRef.current) return glowTextureRef.current;

      const canvas = document.createElement("canvas");
      canvas.width = 128; // 更高分辨率
      canvas.height = 128;
      const context = canvas.getContext("2d");
      if (context) {
        // 清除画布
        context.clearRect(0, 0, 128, 128);

        // 外层光晕
        const outerGlow = context.createRadialGradient(64, 64, 0, 64, 64, 64);
        outerGlow.addColorStop(0, "rgba(255,255,255,1)");
        outerGlow.addColorStop(0.15, "rgba(255,255,255,1)");
        outerGlow.addColorStop(0.3, "rgba(255,255,255,0.9)");
        outerGlow.addColorStop(0.5, "rgba(255,255,255,0.5)");
        outerGlow.addColorStop(0.7, "rgba(255,255,255,0.2)");
        outerGlow.addColorStop(0.85, "rgba(255,255,255,0.05)");
        outerGlow.addColorStop(1, "rgba(0,0,0,0)");
        context.fillStyle = outerGlow;
        context.fillRect(0, 0, 128, 128);

        // 中心亮点（叠加一层更亮的中心）
        const centerGlow = context.createRadialGradient(64, 64, 0, 64, 64, 20);
        centerGlow.addColorStop(0, "rgba(255,255,255,1)");
        centerGlow.addColorStop(0.5, "rgba(255,255,255,0.8)");
        centerGlow.addColorStop(1, "rgba(255,255,255,0)");
        context.fillStyle = centerGlow;
        context.fillRect(0, 0, 128, 128);
      }
      glowTextureRef.current = new THREE.CanvasTexture(canvas);
      return glowTextureRef.current;
    }, []);

    // 创建星云专用纹理（实心发光，中心实心，边缘柔和发光）
    const getNebulaTexture = useCallback(() => {
      if (nebulaTextureRef.current) return nebulaTextureRef.current;

      const canvas = document.createElement("canvas");
      canvas.width = 128; // 更高分辨率
      canvas.height = 128;
      const context = canvas.getContext("2d");
      if (context) {
        // 清除画布
        context.clearRect(0, 0, 128, 128);

        // 实心圆点 - 更大的实心区域，更清晰的边界
        const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 48);
        gradient.addColorStop(0, "rgba(255,255,255,1)");
        gradient.addColorStop(0.5, "rgba(255,255,255,1)"); // 50%实心区域
        gradient.addColorStop(0.6, "rgba(255,255,255,0.95)");
        gradient.addColorStop(0.7, "rgba(255,255,255,0.7)");
        gradient.addColorStop(0.8, "rgba(255,255,255,0.3)");
        gradient.addColorStop(0.9, "rgba(255,255,255,0.1)");
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        context.fillStyle = gradient;
        context.fillRect(0, 0, 128, 128);
      }
      nebulaTextureRef.current = new THREE.CanvasTexture(canvas);
      return nebulaTextureRef.current;
    }, []);

    // 生成星云形态位置（螺旋形）
    const generateNebulaShape = useCallback(
      (particleCount: number): Float32Array => {
        const positions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
          const r = Math.random() * 35 + Math.random() * 15;
          const theta = Math.random() * Math.PI * 2 * 3;
          positions[i * 3] = r * Math.cos(theta);
          positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
          positions[i * 3 + 2] = r * Math.sin(theta);
        }
        return positions;
      },
      []
    );

    // 生成星河形态位置（弯曲的S形河流）
    const generateRiverShape = useCallback(
      (particleCount: number): Float32Array => {
        const positions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
          // 沿着曲线分布
          const t = (i / particleCount) * Math.PI * 2; // 0 到 2π
          // S形曲线
          const mainX = t * 15 - 15 * Math.PI; // 展开宽度
          const mainY = Math.sin(t * 2) * 12; // S形弯曲
          const mainZ = Math.cos(t * 1.5) * 8; // 前后起伏

          // 添加河流宽度和随机性
          const width = 3 + Math.sin(t * 3) * 1.5; // 河流宽度变化
          const offsetX = (Math.random() - 0.5) * width;
          const offsetY = (Math.random() - 0.5) * width * 0.5;
          const offsetZ = (Math.random() - 0.5) * width;

          positions[i * 3] = mainX + offsetX;
          positions[i * 3 + 1] = mainY + offsetY;
          positions[i * 3 + 2] = mainZ + offsetZ;
        }
        return positions;
      },
      []
    );

    // 生成音乐波形态位置
    const generateWaveShape = useCallback(
      (particleCount: number, time: number = 0): Float32Array => {
        const positions = new Float32Array(particleCount * 3);
        const rows = 20;
        const cols = Math.ceil(particleCount / rows);

        for (let i = 0; i < particleCount; i++) {
          const row = Math.floor(i / cols);
          const col = i % cols;

          const x = (col / cols) * 80 - 40; // -40 到 40
          const z = (row / rows) * 30 - 15; // -15 到 15

          // 多层波浪叠加
          const wave1 = Math.sin((x * 0.15 + time * 0.5) * Math.PI) * 6;
          const wave2 =
            Math.sin((x * 0.08 + z * 0.1 + time * 0.3) * Math.PI) * 4;
          const wave3 = Math.cos((z * 0.2 + time * 0.7) * Math.PI) * 3;
          const y = wave1 + wave2 + wave3;

          // 添加一些随机性
          positions[i * 3] = x + (Math.random() - 0.5) * 1;
          positions[i * 3 + 1] = y + (Math.random() - 0.5) * 0.5;
          positions[i * 3 + 2] = z + (Math.random() - 0.5) * 1;
        }
        return positions;
      },
      []
    );

    // 生成哲学性的漂移曲线（整个屏幕范围内）
    const generateWanderCurves = useCallback(
      (
        startPos: THREE.Vector3
      ): { curves: THREE.CubicBezierCurve3[]; speedMultipliers: number[] } => {
        const curves: THREE.CubicBezierCurve3[] = [];
        const speedMultipliers: number[] = [];
        let currentPos = startPos.clone();
        const count = Math.floor(paramsRef.current.wanderCurveCount);
        const speedVar = paramsRef.current.wanderSpeedVariation;
        const radius = paramsRef.current.wanderRadius;

        // 整个屏幕范围（确保在小屏幕和大屏幕都可见）
        // 摄像头在 Z=30 位置
        const screenBounds = {
          minX: -30,
          maxX: 30,
          minY: -20,
          maxY: 20,
          minZ: 10, // 确保粒子不会飞到摄像头后方
          maxZ: 50,
        };

        for (let i = 0; i < count; i++) {
          // 生成若有所思的轨迹：在整个屏幕中飘荡，最后才逐渐靠近中心
          const progress = i / count;
          // 前期在屏幕各处漂浮，后期才开始向中心靠拢
          const towardCenter = progress > 0.6 ? (progress - 0.6) * 2 : 0;

          // 随机终点 - 在整个屏幕范围内
          let endX = currentPos.x + (Math.random() - 0.5) * radius * 2;
          let endY = currentPos.y + (Math.random() - 0.5) * radius * 1.2;
          let endZ = currentPos.z + (Math.random() - 0.5) * radius * 1.5;

          // 如果是后期，逐渐向中心靠拢
          if (towardCenter > 0) {
            endX = endX * (1 - towardCenter) + 0 * towardCenter;
            endY = endY * (1 - towardCenter) + 0 * towardCenter;
            endZ = endZ * (1 - towardCenter) + 30 * towardCenter;
          }

          // 确保在屏幕范围内
          endX = Math.max(screenBounds.minX, Math.min(screenBounds.maxX, endX));
          endY = Math.max(screenBounds.minY, Math.min(screenBounds.maxY, endY));
          endZ = Math.max(screenBounds.minZ, Math.min(screenBounds.maxZ, endZ));

          const endPos = new THREE.Vector3(endX, endY, endZ);

          // 控制点：创建哲学性的、若有所思的曲线
          // 也需要约束控制点在可见范围内
          const cp1 = new THREE.Vector3(
            Math.max(
              screenBounds.minX,
              Math.min(
                screenBounds.maxX,
                currentPos.x + (Math.random() - 0.5) * radius * 1.8
              )
            ),
            Math.max(
              screenBounds.minY,
              Math.min(
                screenBounds.maxY,
                currentPos.y + (Math.random() - 0.3) * radius * 0.8
              )
            ),
            Math.max(
              screenBounds.minZ,
              Math.min(
                screenBounds.maxZ,
                currentPos.z + (Math.random() - 0.5) * radius * 1.2
              )
            )
          );
          const cp2 = new THREE.Vector3(
            Math.max(
              screenBounds.minX,
              Math.min(
                screenBounds.maxX,
                endPos.x + (Math.random() - 0.5) * radius * 1.5
              )
            ),
            Math.max(
              screenBounds.minY,
              Math.min(
                screenBounds.maxY,
                endPos.y + (Math.random() - 0.5) * radius * 0.6
              )
            ),
            Math.max(
              screenBounds.minZ,
              Math.min(
                screenBounds.maxZ,
                endPos.z + (Math.random() - 0.5) * radius
              )
            )
          );

          curves.push(
            new THREE.CubicBezierCurve3(currentPos.clone(), cp1, cp2, endPos)
          );
          // 哲学性的速度变化：有时沉思（慢），有时灵光乍现（快）
          const isContemplative = Math.random() > 0.5;
          speedMultipliers.push(
            isContemplative
              ? 0.2 + Math.random() * 0.4
              : 0.7 + Math.random() * speedVar
          );
          currentPos = endPos;
        }

        return { curves, speedMultipliers };
      },
      []
    );

    // 生成星云中的随机位置（更靠近中心，可见范围内）
    const generateNebulaPosition = useCallback((): THREE.Vector3 => {
      // 在星云可见范围内的随机位置
      const r = Math.random() * 25 + 5; // 更小的半径，确保在视野内
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 6;

      return new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta));
    }, []);

    // 缓动函数
    const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
    const easeInOutCubic = (t: number): number =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    useImperativeHandle(ref, () => ({
      updateParams: (newParams) => {
        // 检查摄像头参数是否变化
        const cameraChanged =
          newParams.cameraX !== lastCameraParamsRef.current.x ||
          newParams.cameraY !== lastCameraParamsRef.current.y ||
          newParams.cameraZ !== lastCameraParamsRef.current.z;

        paramsRef.current = newParams;

        // 只有当 GUI 中的摄像头参数变化时才更新摄像头位置
        if (cameraChanged && cameraRef.current) {
          cameraRef.current.position.set(
            newParams.cameraX,
            newParams.cameraY,
            newParams.cameraZ
          );
          cameraRef.current.lookAt(0, 0, 0);
          lastCameraParamsRef.current = {
            x: newParams.cameraX,
            y: newParams.cameraY,
            z: newParams.cameraZ,
          };
        }
      },

      // 摄像头滑动动画（到目标位置）
      animateCamera: (onComplete?: () => void) => {
        if (!cameraRef.current) return;

        const params = paramsRef.current;
        cameraAnimationRef.current = {
          isAnimating: true,
          startPos: cameraRef.current.position.clone(),
          targetPos: new THREE.Vector3(
            params.cameraTargetX,
            params.cameraTargetY,
            params.cameraTargetZ
          ),
          progress: 0,
          duration: params.cameraPanDuration,
          onComplete,
        };
      },

      // 摄像头返回初始位置
      resetCamera: (onComplete?: () => void) => {
        if (!cameraRef.current) return;

        const params = paramsRef.current;
        cameraAnimationRef.current = {
          isAnimating: true,
          startPos: cameraRef.current.position.clone(),
          targetPos: new THREE.Vector3(
            params.cameraX,
            params.cameraY,
            params.cameraZ
          ),
          progress: 0,
          duration: params.cameraPanDuration, // 使用相同的滑动时间
          onComplete,
        };
      },

      // 高亮指定粒子
      highlightParticle: (particleId: string | null) => {
        highlightedParticleIdRef.current = particleId;
      },

      // 顺序获取星云粒子（用于轮播）
      getRandomNebulaParticle: () => {
        const data = nebulaParticleDataRef.current;
        // 只选择有内容的粒子
        const validParticles = data.filter((p) => p.text && p.text.length > 0);
        if (validParticles.length === 0) return null;

        // 顺序获取，循环播放
        const index = carouselIndexRef.current % validParticles.length;
        carouselIndexRef.current = index + 1;

        const particle = validParticles[index];

        // 找到这个粒子在原始数据中的索引
        const originalIndex = data.findIndex((p) => p.id === particle.id);

        // 直接从星云几何体中读取当前位置（支持形态变换）
        if (nebulaRef.current && originalIndex >= 0) {
          const positions = nebulaRef.current.geometry.attributes.position
            .array as Float32Array;
          const localPos = new THREE.Vector3(
            positions[originalIndex * 3],
            positions[originalIndex * 3 + 1],
            positions[originalIndex * 3 + 2]
          );
          const worldPos = localPos.applyMatrix4(nebulaRef.current.matrixWorld);
          return { ...particle, position: worldPos };
        }
        return particle;
      },

      // 获取高亮粒子的屏幕坐标
      getHighlightedParticleScreenPosition: () => {
        if (!highlightSpriteRef.current || !cameraRef.current) return null;
        if (!highlightedParticleIdRef.current) return null;
        if (highlightFadeRef.current < 0.5) return null; // 淡入未完成时不显示连线

        // 形态切换期间不显示连线
        const cameraPhase = shapeTransitionCameraStateRef.current.phase;
        if (cameraPhase !== "idle") return null;

        const sprite = highlightSpriteRef.current;
        if (!sprite.visible) return null;

        // 获取世界坐标
        const worldPos = sprite.position.clone();

        // 转换为屏幕坐标
        const screenPos = worldPos.project(cameraRef.current);

        // 转换为像素坐标
        const x = ((screenPos.x + 1) / 2) * window.innerWidth;
        const y = ((-screenPos.y + 1) / 2) * window.innerHeight;

        return { x, y };
      },

      // 检查是否正在形态切换
      isShapeTransitioning: () => {
        return shapeTransitionCameraStateRef.current.phase !== "idle";
      },

      spawnProjectile: (
        rect: DOMRect,
        colorHex: string,
        text: string,
        onComplete?: () => void
      ) => {
        if (!cameraRef.current || !sceneRef.current) return;

        // 转换 DOM 位置到 3D 空间
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        const ndcX = (x / window.innerWidth) * 2 - 1;
        const ndcY = -(y / window.innerHeight) * 2 + 1;

        const vector = new THREE.Vector3(ndcX, ndcY, 0.5);
        vector.unproject(cameraRef.current);

        const dir = vector.sub(cameraRef.current.position).normalize();
        // 粒子在摄像头前方固定距离处生成
        const distanceFromCamera = 50;
        const startPos = cameraRef.current.position
          .clone()
          .add(dir.multiplyScalar(distanceFromCamera));

        const color = new THREE.Color(colorHex);
        const id = `particle-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        // 创建粒子核心（与星云粒子一致的小核心）
        const geometry = new THREE.SphereGeometry(
          paramsRef.current.particleSize * 0.3, // 更小的核心
          16,
          16
        );
        const material = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0, // 隐藏核心，只显示光晕（与星云粒子一致）
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(startPos);
        mesh.userData = { id, text };

        // 创建光晕精灵（使用与星云相同的纹理）
        const spriteMat = new THREE.SpriteMaterial({
          map: getNebulaTexture(), // 使用星云纹理，保持一致
          color: color,
          transparent: true,
          blending: THREE.AdditiveBlending,
          opacity: paramsRef.current.nebulaParticleOpacity, // 使用星云粒子透明度
          depthWrite: false,
          depthTest: false,
        });
        const sprite = new THREE.Sprite(spriteMat);
        // 使用与星云粒子相同的大小基准，但飞行时稍大以便追踪
        const nebulaSize = 2.5; // 与星云粒子大小一致
        const flyingScale = 1.8; // 飞行时稍大
        sprite.scale.set(nebulaSize * flyingScale, nebulaSize * flyingScale, 1);
        mesh.add(sprite);

        // 创建渐变拖尾（由粗到细，尖细尾部）
        const trailLength = paramsRef.current.trailLength;
        const trailPositions: THREE.Vector3[] = [];
        for (let i = 0; i < trailLength; i++) {
          trailPositions.push(startPos.clone());
        }

        // 使用自定义的渐变拖尾几何体
        const trailGeometry = createTaperedTrailGeometry(
          trailPositions,
          0.4,
          0.02
        );
        const trailMaterial = new THREE.MeshBasicMaterial({
          color: color.clone().multiplyScalar(0.2), // 降低拖尾亮度
          transparent: true,
          opacity: paramsRef.current.trailOpacity * 0.6, // 降低透明度
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        });
        const trail = new THREE.Mesh(trailGeometry, trailMaterial);

        sceneRef.current.add(mesh);
        sceneRef.current.add(trail);

        // 生成漂移曲线和最终位置
        const {
          curves: wanderCurves,
          speedMultipliers: wanderSpeedMultipliers,
        } = generateWanderCurves(startPos);
        const targetPos = generateNebulaPosition();

        projectilesRef.current.push({
          id,
          text,
          mesh,
          sprite,
          trail,
          trailPositions,
          phase: "pulse",
          phaseProgress: 0,
          color,
          lastPosition: startPos.clone(),
          currentSpeed: 0,
          startPos: startPos.clone(),
          wanderCurve: wanderCurves[0],
          wanderCurveIndex: 0,
          wanderCurves,
          wanderSpeedMultipliers,
          targetPos,
          onComplete,
          timestamp: Date.now(),
        });
      },
    }));

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      // --- 初始化 Three.js ---
      const scene = new THREE.Scene();
      sceneRef.current = scene;
      scene.fog = new THREE.FogExp2(0x020617, 0.003);

      const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      // 初始位置：正面看星云
      camera.position.set(
        initialParams.cameraX,
        initialParams.cameraY,
        initialParams.cameraZ
      );
      camera.lookAt(0, 0, 0);
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // --- 控制器 ---
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.enableZoom = true; // 启用缩放
      controls.minDistance = 30; // 最小缩放距离
      controls.maxDistance = 200; // 最大缩放距离
      controls.zoomSpeed = 0.8;
      controls.enablePan = false;
      controls.rotateSpeed = 0.3;
      controls.target.set(0, 0, 0); // 聚焦于星云中心
      controlsRef.current = controls;

      // --- 创建星云 ---
      const particleCount = initialParams.nebulaParticleCount;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);

      const colorPalette = [
        new THREE.Color("#6366f1"),
        new THREE.Color("#ec4899"),
        new THREE.Color("#06b6d4"),
        new THREE.Color("#8b5cf6"),
      ];

      for (let i = 0; i < particleCount; i++) {
        // 更紧凑的螺旋分布
        const r = Math.random() * 35 + Math.random() * 15;
        const theta = Math.random() * Math.PI * 2 * 3;

        positions[i * 3] = r * Math.cos(theta);
        positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
        positions[i * 3 + 2] = r * Math.sin(theta);

        const color =
          colorPalette[Math.floor(Math.random() * colorPalette.length)];
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }

      // 保存原始星云位置（用于形态变换）
      originalPositionsRef.current = new Float32Array(positions);

      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const nebulaTexture = getNebulaTexture();
      const material = new THREE.PointsMaterial({
        size: 2.0,
        vertexColors: true,
        map: nebulaTexture,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: initialParams.nebulaParticleOpacity ?? 0.9,
        alphaTest: 0.01, // 过滤透明像素，避免方块
        sizeAttenuation: true, // 确保距离衰减
      });

      const nebula = new THREE.Points(geometry, material);
      scene.add(nebula);
      nebulaRef.current = nebula;

      // 优先使用数据库中的心情
      const dbPosts = databasePostsRef.current;

      // 为每个星云粒子创建心情数据（用于点击检测）
      const nebulaParticleData: ContributedParticle[] = [];
      for (let i = 0; i < particleCount; i++) {
        const pos = new THREE.Vector3(
          positions[i * 3],
          positions[i * 3 + 1],
          positions[i * 3 + 2]
        );
        const color = new THREE.Color(
          colors[i * 3],
          colors[i * 3 + 1],
          colors[i * 3 + 2]
        );

        // 如果有数据库数据，使用真实 post ID 和内容
        if (dbPosts.length > 0) {
          const post = dbPosts[i % dbPosts.length];
          nebulaParticleData.push({
            id: post.id, // 使用真实的数据库 post ID！
            text: post.content,
            color: post.color || `#${color.getHexString()}`,
            timestamp: new Date(post.created_at).getTime(),
            position: pos,
          });
        } else {
          // 先创建占位粒子，等数据库加载后更新
          nebulaParticleData.push({
            id: `nebula-${i}`,
            text: "", // 空文本，等数据库加载
            color: `#${color.getHexString()}`,
            timestamp: Date.now() - Math.random() * 86400000 * 30,
            position: pos,
          });
        }
      }
      nebulaParticleDataRef.current = nebulaParticleData;

      // --- 从 LocalStorage 加载已保存的用户粒子 ---
      const savedParticles = loadParticlesFromStorage();
      if (savedParticles.length > 0) {
        console.log(`加载了 ${savedParticles.length} 个已保存的心情粒子`);

        savedParticles.forEach((stored) => {
          const pos = new THREE.Vector3(
            stored.position.x,
            stored.position.y,
            stored.position.z
          );
          const color = new THREE.Color(stored.color);

          // 创建粒子核心
          const geometry = new THREE.SphereGeometry(
            paramsRef.current.particleSize * 0.3,
            16,
            16
          );
          const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0,
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.copy(pos);
          mesh.scale.setScalar(0.5);
          mesh.userData = {
            type: "settledParticle",
            particleId: stored.id,
          };
          scene.add(mesh);

          // 创建光晕精灵
          const spriteMat = new THREE.SpriteMaterial({
            map: getNebulaTexture(),
            color: color,
            transparent: true,
            blending: THREE.AdditiveBlending,
            opacity: paramsRef.current.nebulaParticleOpacity,
            depthWrite: false,
            depthTest: false,
          });
          const sprite = new THREE.Sprite(spriteMat);
          sprite.scale.set(2.5, 2.5, 1);
          sprite.position.copy(pos);
          sprite.userData = {
            type: "settledParticle",
            particleId: stored.id,
          };
          scene.add(sprite);

          // 添加到已定居粒子列表
          settledParticlesRef.current.push({
            id: stored.id,
            text: stored.text,
            color: stored.color,
            timestamp: stored.timestamp,
            position: pos,
            mesh: mesh,
          });

          // 添加到星云粒子数据（用于轮播）
          nebulaParticleDataRef.current.push({
            id: stored.id,
            text: stored.text,
            color: stored.color,
            timestamp: stored.timestamp,
            position: pos,
          });

          // 添加到 mesh 数组
          settledMeshesRef.current.push(mesh);
        });
      }

      // 创建高亮光环精灵
      const highlightSpriteMat = new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: 0xffffff,
        transparent: true,
        blending: THREE.AdditiveBlending,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
      });
      const highlightSprite = new THREE.Sprite(highlightSpriteMat);
      highlightSprite.scale.set(8, 8, 1);
      highlightSprite.visible = false;
      scene.add(highlightSprite);
      highlightSpriteRef.current = highlightSprite;

      // --- 星空背景 ---
      const starsGeo = new THREE.BufferGeometry();
      const starsPos = new Float32Array(800 * 3);
      for (let i = 0; i < 800 * 3; i++)
        starsPos[i] = (Math.random() - 0.5) * 500;
      starsGeo.setAttribute("position", new THREE.BufferAttribute(starsPos, 3));
      const starsMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.5,
        map: getGlowTexture(), // 使用光晕纹理，避免方块
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        alphaTest: 0.01,
        sizeAttenuation: true,
      });
      const starField = new THREE.Points(starsGeo, starsMat);
      scene.add(starField);

      // --- 粒子连线系统（连接有数据的粒子） ---
      const lineGeometry = new THREE.BufferGeometry();
      // 预分配足够的空间（最大100条线 = 200个顶点）
      const linePositions = new Float32Array(200 * 3);
      lineGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(linePositions, 3)
      );
      lineGeometry.setDrawRange(0, 0); // 初始不绘制

      const lineMaterial = new THREE.LineDashedMaterial({
        color: 0x6366f1,
        linewidth: 2,
        dashSize: 3,
        gapSize: 2,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const particleLines = new THREE.LineSegments(lineGeometry, lineMaterial);
      scene.add(particleLines);
      particleLinesRef.current = particleLines;

      // --- 点击事件处理 ---
      const handleClick = (event: MouseEvent) => {
        if (!cameraRef.current || !nebulaRef.current) return;

        mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
        // 设置 Points 检测阈值 - 减小以提高精确度
        raycasterRef.current.params.Points.threshold = 1.5;

        // 粒子光圈有效点击半径（屏幕空间距离）
        const clickRadius = 2.5;

        // 1. 首先检测已定居的粒子 mesh（用户贡献的粒子）
        if (settledMeshesRef.current.length > 0) {
          let closestParticle: ContributedParticle | null = null;
          let closestDistance = Infinity;

          for (let i = 0; i < settledParticlesRef.current.length; i++) {
            const particle = settledParticlesRef.current[i];
            const mesh = settledMeshesRef.current[i];
            if (mesh) {
              const worldPos = new THREE.Vector3();
              mesh.getWorldPosition(worldPos);
              const distance =
                raycasterRef.current.ray.distanceToPoint(worldPos);
              // 只有在光圈范围内才算点中
              if (distance < clickRadius && distance < closestDistance) {
                closestDistance = distance;
                closestParticle = particle;
              }
            }
          }

          if (closestParticle) {
            onParticleClickRef.current?.(closestParticle);
            return;
          }
        }

        // 2. 检测星云原始粒子（Points 对象）- 使用更精确的检测
        const nebulaIntersects = raycasterRef.current.intersectObject(
          nebulaRef.current,
          false
        );
        if (
          nebulaIntersects.length > 0 &&
          nebulaIntersects[0].index !== undefined
        ) {
          const intersect = nebulaIntersects[0];
          const index = intersect.index as number;

          // 使用 ref 获取最新的粒子数据（支持数据库更新）
          const currentParticleData = nebulaParticleDataRef.current;

          // 计算点击点到粒子的实际距离
          if (
            index < currentParticleData.length &&
            intersect.distanceToRay !== undefined
          ) {
            // 只有当距离在光圈范围内才触发
            if (intersect.distanceToRay < clickRadius) {
              // 获取实际的世界位置（考虑星云旋转和缩放）
              const localPos = currentParticleData[index].position.clone();
              const worldPos = localPos.applyMatrix4(
                nebulaRef.current.matrixWorld
              );
              const clickedParticle = {
                ...currentParticleData[index],
                position: worldPos,
              };
              onParticleClickRef.current?.(clickedParticle);
              return;
            }
          }
        }

        // 点击空白处不触发任何事件
      };

      renderer.domElement.addEventListener("click", handleClick);

      // --- 拖动星云时暂停旋转 ---
      const handleDragStart = () => {
        // 开始拖动时，设置暂停时间戳（会在拖动结束后延长3秒）
        nebulaPausedUntilRef.current = Infinity; // 拖动期间一直暂停
      };
      const handleDragEnd = () => {
        // 拖动结束后，暂停3秒再恢复
        nebulaPausedUntilRef.current = Date.now() + 3000;
      };
      controls.addEventListener("start", handleDragStart);
      controls.addEventListener("end", handleDragEnd);

      // --- 动画循环 ---
      let animationId: number;
      const clock = new THREE.Clock();

      const animate = () => {
        animationId = requestAnimationFrame(animate);
        const delta = clock.getDelta();

        controls.update();

        // 摄像头滑动动画
        if (cameraAnimationRef.current?.isAnimating) {
          const anim = cameraAnimationRef.current;
          anim.progress += delta / anim.duration;

          if (anim.progress >= 1) {
            // 动画完成
            camera.position.copy(anim.targetPos);
            camera.lookAt(0, 0, 0);
            anim.isAnimating = false;
            anim.onComplete?.();
            cameraAnimationRef.current = null;
          } else {
            // 使用平滑缓动
            const t = easeInOutCubic(anim.progress);
            camera.position.lerpVectors(anim.startPos, anim.targetPos, t);
            camera.lookAt(0, 0, 0);
          }
        }

        // 旋转星云并应用缩放
        if (nebulaRef.current) {
          // 检查是否暂停旋转（鼠标移动后3秒内暂停）
          const isNebulaPaused = Date.now() < nebulaPausedUntilRef.current;
          if (!isNebulaPaused) {
            nebulaRef.current.rotation.y += paramsRef.current.nebulaSpeed;
          }
          const scale = paramsRef.current.nebulaScale;
          nebulaRef.current.scale.set(scale, scale, scale);

          // === 形态变换系统 ===
          const particleCount = initialParams.nebulaParticleCount;
          shapeTimerRef.current += delta;

          const cameraState = shapeTransitionCameraStateRef.current;
          const CAMERA_ZOOM_DURATION = 3; // 摄像头移动动画3秒

          // 检查是否需要开始摄像头后退和形态过渡（第57秒开始）
          if (
            shapeTimerRef.current >= SHAPE_DURATION - CAMERA_ZOOM_DURATION &&
            cameraState.phase === "idle"
          ) {
            // 开始摄像头后退动画
            cameraState.phase = "zooming-out";
            cameraState.originalCameraPos = new THREE.Vector3(
              paramsRef.current.cameraX,
              paramsRef.current.cameraY,
              paramsRef.current.cameraZ
            );

            // 摄像头后退到"确认输入"位置
            const targetX = paramsRef.current.cameraTargetX;
            const targetY = paramsRef.current.cameraTargetY;
            const targetZ = paramsRef.current.cameraTargetZ;

            cameraAnimationRef.current = {
              isAnimating: true,
              startPos: camera.position.clone(),
              targetPos: new THREE.Vector3(targetX, targetY, targetZ),
              progress: 0,
              duration: CAMERA_ZOOM_DURATION, // 3秒后退
              onComplete: () => {
                // 摄像机后退完成，但粒子过渡可能还在进行
              },
            };

            // 同时开始形态切换 - 设置目标形态
            shapeTimerRef.current = 0;
            const shapes: ShapeMode[] = ["nebula", "river", "wave"];
            const currentIndex = shapes.indexOf(shapeModeRef.current);
            const nextIndex = (currentIndex + 1) % shapes.length;
            shapeTransitionTargetRef.current = shapes[nextIndex];
          }

          // 如果目标形态不同于当前形态，进行过渡
          if (shapeTransitionTargetRef.current !== shapeModeRef.current) {
            // 摄像机开始后退时就开始粒子过渡
            if (
              cameraState.phase === "zooming-out" ||
              cameraState.phase === "zooming-in"
            ) {
              shapeTransitionRef.current += delta / SHAPE_TRANSITION_DURATION;

              if (shapeTransitionRef.current >= 1) {
                // 收缩+混合完成，进入停顿阶段
                shapeTransitionRef.current = 1; // 保持为1
                shapeModeRef.current = shapeTransitionTargetRef.current;
                cameraState.phase = "pausing";
                shapePauseTimerRef.current = 0;
              } else {
                // 正在过渡中 - 使用"聚合-展开"效果
                const elapsedTime = clock.elapsedTime;
                let targetPositions: Float32Array;

                switch (shapeTransitionTargetRef.current) {
                  case "nebula":
                    targetPositions = generateNebulaShape(particleCount);
                    break;
                  case "river":
                    targetPositions = generateRiverShape(particleCount);
                    break;
                  case "wave":
                    targetPositions = generateWaveShape(
                      particleCount,
                      elapsedTime
                    );
                    break;
                  default:
                    targetPositions = originalPositionsRef.current!;
                }

                // 使用双阶段过渡：先聚合到中心，再展开到目标
                const progress = shapeTransitionRef.current;
                const positions = nebulaRef.current.geometry.attributes.position
                  .array as Float32Array;
                const original = originalPositionsRef.current!;

                // 缩放因子：0->0.5 收缩到最小，0.5->1 展开
                let scaleFactor: number;
                let blendT: number;

                if (progress < 0.4) {
                  // 前40%：从原始位置收缩到最小
                  const shrinkProgress = progress / 0.4;
                  const shrinkEase = easeInOutCubic(shrinkProgress);
                  scaleFactor = 1 - shrinkEase * 0.9; // 缩小到10%
                  blendT = 0;
                } else {
                  // 后60%：在收缩状态下完成位置混合
                  const blendProgress = (progress - 0.4) / 0.6;
                  scaleFactor = 0.1; // 保持最小状态
                  blendT = easeInOutCubic(blendProgress);
                }

                for (let i = 0; i < particleCount; i++) {
                  const idx = i * 3;
                  // 混合原始和目标位置
                  const blendedX =
                    original[idx] * (1 - blendT) +
                    targetPositions[idx] * blendT;
                  const blendedY =
                    original[idx + 1] * (1 - blendT) +
                    targetPositions[idx + 1] * blendT;
                  const blendedZ =
                    original[idx + 2] * (1 - blendT) +
                    targetPositions[idx + 2] * blendT;

                  // 应用缩放（向中心收缩/展开）
                  positions[idx] = blendedX * scaleFactor;
                  positions[idx + 1] = blendedY * scaleFactor;
                  positions[idx + 2] = blendedZ * scaleFactor;
                }
                nebulaRef.current.geometry.attributes.position.needsUpdate =
                  true;
              }
            }
          }

          // 停顿阶段处理（混合完成后，停顿2秒再展开）
          if (cameraState.phase === "pausing") {
            shapePauseTimerRef.current += delta;

            if (shapePauseTimerRef.current >= SHAPE_PAUSE_DURATION) {
              // 停顿完成，进入展开阶段
              cameraState.phase = "expanding";
              shapeExpandProgressRef.current = 0;
            }
            // 停顿期间保持10%缩放状态，不做任何位置更新
          }

          // 展开阶段处理（混合完成后，从10%展开到100%）
          if (cameraState.phase === "expanding") {
            shapeExpandProgressRef.current += delta / SHAPE_EXPAND_DURATION;

            if (shapeExpandProgressRef.current >= 1) {
              // 展开完成
              shapeExpandProgressRef.current = 0;
              shapeTransitionRef.current = 0;
              shapeTransitionTargetRef.current = shapeModeRef.current;

              // 更新原始位置为当前位置
              const positions = nebulaRef.current.geometry.attributes.position
                .array as Float32Array;
              originalPositionsRef.current = new Float32Array(positions);

              // 开始摄像头返回
              if (cameraState.originalCameraPos) {
                cameraState.phase = "zooming-in";
                cameraAnimationRef.current = {
                  isAnimating: true,
                  startPos: camera.position.clone(),
                  targetPos: cameraState.originalCameraPos.clone(),
                  progress: 0,
                  duration: CAMERA_ZOOM_DURATION,
                  onComplete: () => {
                    cameraState.phase = "idle";
                    cameraState.originalCameraPos = null;
                  },
                };
              } else {
                cameraState.phase = "idle";
              }
            } else {
              // 正在展开中
              const expandProgress = shapeExpandProgressRef.current;
              const expandEase = easeInOutCubic(expandProgress);
              const scaleFactor = 0.1 + expandEase * 0.9; // 从10%恢复到100%

              const positions = nebulaRef.current.geometry.attributes.position
                .array as Float32Array;

              // 获取目标形态位置
              let targetPositions: Float32Array;
              const elapsedTime = clock.elapsedTime;
              switch (shapeModeRef.current) {
                case "nebula":
                  targetPositions = generateNebulaShape(particleCount);
                  break;
                case "river":
                  targetPositions = generateRiverShape(particleCount);
                  break;
                case "wave":
                  targetPositions = generateWaveShape(
                    particleCount,
                    elapsedTime
                  );
                  break;
                default:
                  targetPositions = originalPositionsRef.current!;
              }

              for (let i = 0; i < particleCount; i++) {
                const idx = i * 3;
                // 以目标形态位置进行缩放
                positions[idx] = targetPositions[idx] * scaleFactor;
                positions[idx + 1] = targetPositions[idx + 1] * scaleFactor;
                positions[idx + 2] = targetPositions[idx + 2] * scaleFactor;
              }
              nebulaRef.current.geometry.attributes.position.needsUpdate = true;
            }
          } else if (
            shapeModeRef.current === "wave" &&
            cameraState.phase === "idle"
          ) {
            // 波形模式下持续更新位置以产生动画（仅在idle状态）
            const elapsedTime = clock.elapsedTime;
            const positions = nebulaRef.current.geometry.attributes.position
              .array as Float32Array;
            const wavePositions = generateWaveShape(particleCount, elapsedTime);

            // 平滑过渡到新的波浪位置
            for (let i = 0; i < particleCount * 3; i++) {
              positions[i] += (wavePositions[i] - positions[i]) * 0.02;
            }
            nebulaRef.current.geometry.attributes.position.needsUpdate = true;
          } else if (
            shapeModeRef.current === "river" &&
            cameraState.phase === "idle"
          ) {
            // 星河模式下添加流动效果（仅在idle状态）
            const positions = nebulaRef.current.geometry.attributes.position
              .array as Float32Array;
            const flowSpeed = 0.5;

            for (let i = 0; i < particleCount; i++) {
              // 沿着X方向流动
              positions[i * 3] += flowSpeed * delta * 5;
              // 如果超出边界，从另一端重新进入
              if (positions[i * 3] > 15 * Math.PI) {
                positions[i * 3] = -15 * Math.PI;
              }
            }
            nebulaRef.current.geometry.attributes.position.needsUpdate = true;
          }

          // 星云粒子效果 - 实心发光，波动式发光
          const breathTime = clock.elapsedTime;
          // 多层波动：主波 + 次波 + 微波，创造自然的波动感
          const mainWave = Math.sin(breathTime * 0.5) * 0.5;
          const subWave = Math.sin(breathTime * 1.2) * 0.25;
          const microWave = Math.sin(breathTime * 2.5) * 0.1;
          const breathWave = mainWave + subWave + microWave;

          // 粒子大小：brightness控制基础大小，波动控制发光范围
          const brightness = paramsRef.current.nebulaBrightness ?? 1.0;
          // 降低基础大小，让粒子更小更实
          const baseSize = 1.0 + brightness * 0.5;
          // 波动只影响发光范围，不影响核心大小
          const breathSize = baseSize * (1 + breathWave * 0.15);

          // 粒子不透明度：保持高不透明度，让中心更实
          const baseOpacity = paramsRef.current.nebulaParticleOpacity ?? 1.0;
          // 波动式发光：不透明度在高值范围内波动，最低不低于0.85
          const breathOpacity = Math.min(
            1,
            Math.max(0.85, baseOpacity * (0.95 + breathWave * 0.05))
          );

          const nebulaMat = nebulaRef.current.material as THREE.PointsMaterial;
          nebulaMat.opacity = breathOpacity;
          nebulaMat.size = breathSize;
        }
        starField.rotation.y += paramsRef.current.nebulaSpeed * 0.1;

        // 更新高亮粒子效果（带渐入渐出）
        if (highlightSpriteRef.current) {
          const highlightId = highlightedParticleIdRef.current;
          const cameraPhase = shapeTransitionCameraStateRef.current.phase;

          // 形态切换期间隐藏高亮
          const shouldShow = highlightId && cameraPhase === "idle";

          // 更新目标值
          highlightTargetRef.current = shouldShow ? 1 : 0;

          // 平滑过渡到目标值（渐入渐出）
          const fadeSpeed = 3.0; // 渐变速度
          const diff = highlightTargetRef.current - highlightFadeRef.current;
          highlightFadeRef.current += diff * fadeSpeed * delta;
          highlightFadeRef.current = Math.max(
            0,
            Math.min(1, highlightFadeRef.current)
          );

          const fadeValue = highlightFadeRef.current;

          if (fadeValue > 0.01) {
            // 查找对应的粒子位置
            let targetPos: THREE.Vector3 | null = null;
            let particleColor = "#ffffff";

            // 先检查星云粒子数据（包括数据库加载的粒子）
            if (highlightId) {
              // 在星云粒子数据中查找（可能是 nebula-${i} 或数据库UUID）
              const nebulaParticleIndex =
                nebulaParticleDataRef.current.findIndex(
                  (p) => p.id === highlightId
                );

              if (nebulaParticleIndex >= 0 && nebulaRef.current) {
                const particle =
                  nebulaParticleDataRef.current[nebulaParticleIndex];

                // 直接从星云几何体中读取当前位置（支持形态变换）
                const positions = nebulaRef.current.geometry.attributes.position
                  .array as Float32Array;
                const localPos = new THREE.Vector3(
                  positions[nebulaParticleIndex * 3],
                  positions[nebulaParticleIndex * 3 + 1],
                  positions[nebulaParticleIndex * 3 + 2]
                );
                targetPos = localPos.applyMatrix4(
                  nebulaRef.current.matrixWorld
                );
                particleColor = particle.color;
              }
            }

            // 如果星云粒子中没找到，检查已定居的用户粒子
            if (!targetPos && highlightId) {
              const settled = settledParticlesRef.current.find(
                (p) => p.id === highlightId
              );
              if (settled && settled.mesh) {
                targetPos = new THREE.Vector3();
                settled.mesh.getWorldPosition(targetPos);
                particleColor = settled.color;
              }
            }

            if (targetPos) {
              highlightSpriteRef.current.visible = true;
              highlightSpriteRef.current.position.copy(targetPos);
              // 呼吸闪烁效果，叠加渐入渐出
              const pulseTime = clock.elapsedTime * 3;
              const pulse = 0.6 + Math.sin(pulseTime) * 0.4;
              // 使用 easeInOutCubic 让渐变更平滑
              const smoothFade =
                fadeValue < 0.5
                  ? 4 * fadeValue * fadeValue * fadeValue
                  : 1 - Math.pow(-2 * fadeValue + 2, 3) / 2;
              (
                highlightSpriteRef.current.material as THREE.SpriteMaterial
              ).opacity = pulse * smoothFade;
              (
                highlightSpriteRef.current.material as THREE.SpriteMaterial
              ).color.set(particleColor);
              const scale = (6 + Math.sin(pulseTime) * 2) * smoothFade;
              highlightSpriteRef.current.scale.set(scale, scale, 1);
            } else {
              highlightSpriteRef.current.visible = false;
            }
          } else {
            highlightSpriteRef.current.visible = false;
          }
        }

        // === 更新粒子连线（连接有数据的粒子） ===
        // 节流：每10帧更新一次连线，减少计算量
        const frameCount = Math.floor(clock.elapsedTime * 60) % 10;
        if (particleLinesRef.current && nebulaRef.current && frameCount === 0) {
          const lineMaterial = particleLinesRef.current
            .material as THREE.LineDashedMaterial;
          // 始终保持连线可见
          lineMaterial.opacity = 0.3;

          // 找出所有有数据的粒子（ID 不是 nebula-xxx 格式）
          const dataParticles: { index: number; pos: THREE.Vector3 }[] = [];
          const particleData = nebulaParticleDataRef.current;
          const positions = nebulaRef.current.geometry.attributes.position
            .array as Float32Array;

          for (let i = 0; i < particleData.length; i++) {
            const p = particleData[i];
            // 检查是否是有真实数据的粒子（UUID格式或非 nebula- 开头）
            if (p.id && !p.id.startsWith("nebula-") && p.text) {
              const pos = new THREE.Vector3(
                positions[i * 3],
                positions[i * 3 + 1],
                positions[i * 3 + 2]
              );
              // 应用星云的变换矩阵
              pos.applyMatrix4(nebulaRef.current!.matrixWorld);
              dataParticles.push({ index: i, pos });
            }
          }

          // 生成连线（每个粒子只连接最近的几个粒子）
          const linePositions = particleLinesRef.current.geometry.attributes
            .position.array as Float32Array;
          let lineIndex = 0;
          const maxDistance = 35; // 最大连线距离
          const maxLines = 100; // 最大连线数
          const maxConnectionsPerParticle = 2; // 每个粒子最多连接2个
          const connectionCount = new Map<number, number>(); // 记录每个粒子的连接数

          // 构建所有可能的连线并按距离排序
          const possibleLines: { i: number; j: number; dist: number }[] = [];
          for (let i = 0; i < dataParticles.length; i++) {
            for (let j = i + 1; j < dataParticles.length; j++) {
              const dist = dataParticles[i].pos.distanceTo(
                dataParticles[j].pos
              );
              if (dist < maxDistance) {
                possibleLines.push({ i, j, dist });
              }
            }
          }
          // 按距离排序，优先连接近的粒子
          possibleLines.sort((a, b) => a.dist - b.dist);

          for (const line of possibleLines) {
            if (lineIndex >= maxLines) break;
            const countI = connectionCount.get(line.i) || 0;
            const countJ = connectionCount.get(line.j) || 0;
            // 每个粒子最多连接 maxConnectionsPerParticle 个
            if (
              countI < maxConnectionsPerParticle &&
              countJ < maxConnectionsPerParticle
            ) {
              // 起点
              linePositions[lineIndex * 6] = dataParticles[line.i].pos.x;
              linePositions[lineIndex * 6 + 1] = dataParticles[line.i].pos.y;
              linePositions[lineIndex * 6 + 2] = dataParticles[line.i].pos.z;
              // 终点
              linePositions[lineIndex * 6 + 3] = dataParticles[line.j].pos.x;
              linePositions[lineIndex * 6 + 4] = dataParticles[line.j].pos.y;
              linePositions[lineIndex * 6 + 5] = dataParticles[line.j].pos.z;
              lineIndex++;
              connectionCount.set(line.i, countI + 1);
              connectionCount.set(line.j, countJ + 1);
            }
          }

          particleLinesRef.current.geometry.attributes.position.needsUpdate =
            true;
          particleLinesRef.current.geometry.setDrawRange(0, lineIndex * 2);
          particleLinesRef.current.computeLineDistances(); // 虚线需要这个
        }

        // 更新粒子动画
        for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
          const p = projectilesRef.current[i];
          const params = paramsRef.current;

          switch (p.phase) {
            case "pulse": {
              // 脉冲阶段 - 粒子闪烁
              p.phaseProgress += delta * 1000;
              const pulseT = p.phaseProgress / params.pulseDuration;

              if (pulseT >= 1) {
                p.phase = "wander";
                p.phaseProgress = 0;
                p.wanderCurveIndex = 0;
              } else {
                // 脉冲效果
                const pulse =
                  1 + Math.sin(pulseT * Math.PI * 4) * params.pulseScale;
                p.sprite.scale.set(
                  params.particleGlow * pulse,
                  params.particleGlow * pulse,
                  1
                );
                (p.sprite.material as THREE.SpriteMaterial).opacity =
                  0.6 + Math.sin(pulseT * Math.PI * 4) * 0.4;
              }
              break;
            }

            case "wander": {
              // 随机漂移阶段 - 使用三次贝塞尔曲线
              const curveCount = p.wanderCurves.length;
              const timePerCurve = params.wanderDuration / curveCount / 1000;
              const speedMult =
                p.wanderSpeedMultipliers[p.wanderCurveIndex] || 1;
              p.phaseProgress += (delta / timePerCurve) * speedMult;

              if (p.wanderCurveIndex >= p.wanderCurves.length) {
                // 漂移完成，准备飞向星云
                p.phase = "flight";
                p.phaseProgress = 0;

                // 创建三次贝塞尔飞行曲线
                const currentPos = p.mesh.position.clone();
                const cp1 = new THREE.Vector3(
                  currentPos.x + (Math.random() - 0.5) * params.flightCurve,
                  currentPos.y +
                    (Math.random() - 0.5) * params.flightCurve * 0.5,
                  currentPos.z + (Math.random() - 0.5) * params.flightCurve
                );
                const cp2 = new THREE.Vector3(
                  p.targetPos.x +
                    (Math.random() - 0.5) * params.flightCurve * 0.5,
                  p.targetPos.y +
                    (Math.random() - 0.5) * params.flightCurve * 0.3,
                  p.targetPos.z +
                    (Math.random() - 0.5) * params.flightCurve * 0.5
                );
                p.flightCurve = new THREE.CubicBezierCurve3(
                  currentPos,
                  cp1,
                  cp2,
                  p.targetPos
                );
              } else {
                // 沿当前贝塞尔曲线移动
                const curve = p.wanderCurves[p.wanderCurveIndex];
                // 使用缓动函数让运动更自然（先加速后减速）
                const t = easeInOutCubic(Math.min(p.phaseProgress, 1));
                const point = curve.getPoint(t);
                p.mesh.position.copy(point);

                if (p.phaseProgress >= 1) {
                  p.wanderCurveIndex++;
                  p.phaseProgress = 0;
                }
              }
              break;
            }

            case "flight": {
              // 飞向星云 - 使用加速曲线
              const flightEase = (t: number) =>
                t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
              p.phaseProgress += delta / params.flightDuration;

              if (p.phaseProgress >= 1) {
                // 到达星云，进入settling阶段（闪烁）
                p.phase = "settling";
                p.phaseProgress = 0;
                // 移除拖尾
                scene.remove(p.trail);
                // 调用完成回调
                p.onComplete?.();
              } else if (p.flightCurve) {
                const t = flightEase(p.phaseProgress);
                const point = p.flightCurve.getPoint(t);
                p.mesh.position.copy(point);

                // 逐渐缩小
                const scale = 1 - p.phaseProgress * 0.5;
                p.mesh.scale.setScalar(scale);
                p.sprite.scale.set(
                  params.particleGlow * scale,
                  params.particleGlow * scale,
                  1
                );
              }
              break;
            }

            case "settling": {
              // 进入星云后的闪烁阶段 - 粒子跟随星云旋转
              p.phaseProgress += delta;

              // 跟随星云旋转 - 将粒子添加到星云父对象
              if (nebulaRef.current && p.mesh.parent !== nebulaRef.current) {
                // 将粒子位置转换到星云坐标系
                const worldPos = p.mesh.position.clone();
                nebulaRef.current.worldToLocal(worldPos);
                scene.remove(p.mesh);
                nebulaRef.current.add(p.mesh);
                p.mesh.position.copy(worldPos);
              }

              // 闪烁效果 - 使用可调节的幅度
              const blinkT = p.phaseProgress * params.settleBlinkSpeed;
              const blinkWave = Math.sin(blinkT * Math.PI * 2);
              const blink = 0.5 + blinkWave * 0.5 * params.settleBlinkAmplitude;
              (p.sprite.material as THREE.SpriteMaterial).opacity =
                0.3 + blink * 0.7;
              const glowScale =
                params.particleGlow *
                0.5 *
                (0.7 + blink * 0.5 * params.settleBlinkAmplitude);
              p.sprite.scale.set(glowScale, glowScale, 1);

              // 轻微的漂浮感
              const floatY = Math.sin(p.phaseProgress * 2) * 0.3;
              p.mesh.position.y += floatY * delta;

              if (p.phaseProgress >= params.settleBlinkDuration) {
                // 闪烁结束，转为永久粒子，粒子保留在星云中跟随旋转
                p.phase = "nebula";

                // 添加到已定居粒子列表（用于点击检测）
                // 在 mesh 上存储 userData 以便点击时识别
                p.mesh.userData = {
                  type: "settledParticle",
                  particleId: p.id,
                };
                p.sprite.userData = {
                  type: "settledParticle",
                  particleId: p.id,
                };

                settledParticlesRef.current.push({
                  id: p.id,
                  text: p.text,
                  color: `#${p.color.getHexString()}`,
                  timestamp: p.timestamp,
                  position: p.mesh.position.clone(),
                  mesh: p.mesh, // 保存 mesh 引用
                });

                // 保存到 LocalStorage
                addParticleToStorage({
                  id: p.id,
                  text: p.text,
                  color: `#${p.color.getHexString()}`,
                  timestamp: p.timestamp,
                  position: {
                    x: p.mesh.position.x,
                    y: p.mesh.position.y,
                    z: p.mesh.position.z,
                  },
                });

                // 同时添加到星云粒子数据（用于轮播）
                nebulaParticleDataRef.current.push({
                  id: p.id,
                  text: p.text,
                  color: `#${p.color.getHexString()}`,
                  timestamp: p.timestamp,
                  position: p.mesh.position.clone(),
                });

                // 同时添加到 mesh 数组，用于 raycaster 检测
                settledMeshesRef.current.push(p.mesh);

                // 设置最终状态 - 变成和星云其他粒子一样的光晕
                // 更换纹理为星云专用纹理，确保样式一致
                const spriteMat = p.sprite.material as THREE.SpriteMaterial;
                spriteMat.map = getNebulaTexture(); // 使用与星云相同的纹理
                spriteMat.opacity = params.nebulaParticleOpacity;
                spriteMat.blending = THREE.AdditiveBlending;
                spriteMat.depthWrite = false;
                spriteMat.needsUpdate = true;
                // 设置与星云粒子相似的大小
                const nebulaParticleSize = 2.5; // 与星云粒子大小相当
                p.sprite.scale.set(nebulaParticleSize, nebulaParticleSize, 1);
                p.mesh.scale.setScalar(0.5); // 缩小核心，主要显示光晕
                // 从动画列表移除，但粒子仍在星云中
                projectilesRef.current.splice(i, 1);
                continue;
              }
              break;
            }
          }

          // 更新拖尾 - 由粗到细，尖细尾部，根据速度调整
          if (p.phase !== "nebula" && p.phase !== "settling") {
            // 计算当前速度
            const currentPos = p.mesh.position.clone();
            p.currentSpeed = currentPos.distanceTo(p.lastPosition) / delta;
            p.lastPosition.copy(currentPos);

            // 根据速度调整拖尾长度
            const speedFactor = Math.min(p.currentSpeed / 15, 2.5);
            const effectiveTrailLength = Math.floor(
              params.trailLength * (0.4 + speedFactor * 0.6)
            );

            p.trailPositions.unshift(currentPos);
            while (p.trailPositions.length > effectiveTrailLength) {
              p.trailPositions.pop();
            }

            // 重新创建渐变拖尾几何体（尖细尾部）
            if (p.trailPositions.length >= 2) {
              // 头部粗细根据速度变化，尾部始终尖细
              const headRadius = 0.25 + speedFactor * 0.15;
              const tailRadius = 0.01; // 尖细的尾部

              const newGeometry = createTaperedTrailGeometry(
                p.trailPositions,
                headRadius,
                tailRadius
              );
              p.trail.geometry.dispose();
              p.trail.geometry = newGeometry;

              // 调整透明度
              (p.trail.material as THREE.MeshBasicMaterial).opacity =
                params.trailOpacity * Math.min(1, 0.5 + speedFactor * 0.4);
            }
          }
        }

        renderer.render(scene, camera);
      };
      animate();

      onReadyRef.current?.();

      // --- 窗口大小调整 ---
      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        renderer.domElement.removeEventListener("click", handleClick);
        controls.removeEventListener("start", handleDragStart);
        controls.removeEventListener("end", handleDragEnd);
        cancelAnimationFrame(animationId);
        if (container && renderer.domElement) {
          container.removeChild(renderer.domElement);
        }
        renderer.dispose();
        controls.dispose();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // 只在挂载时运行一次

    return <div ref={containerRef} id="canvas-container" />;
  }
);

ThreeScene.displayName = "ThreeScene";

export default ThreeScene;
