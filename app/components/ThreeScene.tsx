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
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

// 从拆分的模块导入
import {
  AnimationParams,
  ContributedParticle,
  ThreeSceneHandle,
  ThreeSceneProps,
  Projectile,
  ShapeMode,
  CameraAnimationState,
  ShapeTransitionCameraState,
} from "../three/types";
import {
  createMeteor,
  updateMeteors,
  METEOR_CONFIG,
} from "../three/meteorSystem";

import {
  loadParticlesFromStorage,
  addParticleToStorage,
} from "../three/storage";

import { createTaperedTrailGeometry } from "../three/geometry";
import {
  generateNebulaShape,
  generateRiverShape,
  generateWaveShape,
  generateFloatShape,
  generateAtomicShape,
} from "../three/shapes";
import {
  generateAtomicOrbits,
  updateAtomicPositions,
  calculateAtomicConnections,
  initFixedAtomicPairs,
  resetFixedAtomicPairs,
  AtomicOrbit,
  calculateOrbitPosition,
} from "../three/atomicSystem";
import {
  createGlowTexture,
  createNebulaTexture,
  createSolidCircleTexture,
} from "../three/textures";
import {
  easeInOutCubic,
  generateNebulaPosition,
  generateWanderCurves,
} from "../three/math";
import { calculateParticleTargetPosition } from "../three/shapeUtils";
import {
  SHAPE_DURATION,
  SHAPE_TRANSITION_DURATION,
  SHAPE_PAUSE_DURATION,
  SHAPE_EXPAND_DURATION,
  CAMERA_ZOOM_DURATION,
  NEBULA_PARTICLE_COUNT,
  NEBULA_COLOR_PALETTE,
  CLICK_RADIUS,
  RAYCASTER_THRESHOLD,
  MAX_LINE_DISTANCE,
  MAX_LINES,
  MAX_CONNECTIONS_PER_PARTICLE,
  FLOAT_MIN_SPEED,
  FLOAT_MAX_SPEED,
} from "../three/constants";

// 重新导出类型供外部使用
export type { AnimationParams, ContributedParticle, ThreeSceneHandle };

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
    const clockRef = useRef<THREE.Clock | null>(null);
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
    const onParticleClickRef = useRef(onParticleClick);
    const onReadyRef = useRef(onReady);
    const settledMeshesRef = useRef<THREE.Mesh[]>([]);
    const highlightedParticleIdRef = useRef<string | null>(null);
    const lastHighlightedIdRef = useRef<string | null>(null);
    const highlightSpriteRef = useRef<THREE.Sprite | null>(null);
    const nebulaParticleDataRef = useRef<ContributedParticle[]>([]);
    const nebulaPausedUntilRef = useRef<number>(0);
    // 单独控制“形态切换”暂停标志（仅影响 shapeTimer）
    const shapeSwitchPausedRef = useRef<boolean>(false);

    // 暂停 / 恢复 星云动画计时（由外部调用或内部逻辑触发）
    const pauseNebulaTimer = useCallback(() => {
      nebulaPausedUntilRef.current = Infinity;
      shapeSwitchPausedRef.current = true;
      console.log(
        "[ThreeScene] pauseNebulaTimer() called — shape switching paused"
      );
    }, []);
    const resumeNebulaTimer = useCallback(() => {
      nebulaPausedUntilRef.current = Date.now();
      shapeSwitchPausedRef.current = false;
      console.log(
        "[ThreeScene] resumeNebulaTimer() called — shape switching resumed"
      );
    }, []);
    const carouselIndexRef = useRef<number>(0);
    const highlightFadeRef = useRef<number>(0);
    const highlightTargetRef = useRef<number>(0);
    const particleLinesRef = useRef<Line2[]>([]);

    // 数据库心情数据
    const [databasePosts, setDatabasePosts] = useState<Post[]>([]);
    const databasePostsRef = useRef<Post[]>([]);

    // 形态变换系统
    const shapeModeRef = useRef<ShapeMode>("atomic");
    const shapeTransitionRef = useRef<number>(0);
    const shapeTransitionTargetRef = useRef<ShapeMode>("atomic");
    // 存储形态切换的目标位置，避免每帧重新生成导致抖动
    const targetShapePositionsRef = useRef<Float32Array | null>(null);

    // 存储新粒子的过渡状态
    const settledParticlesOriginalPositionsRef = useRef<
      Map<string, THREE.Vector3>
    >(new Map());
    const settledParticlesTargetPositionsRef = useRef<
      Map<string, THREE.Vector3>
    >(new Map());
    const settledParticlesOrbitsRef = useRef<Map<string, AtomicOrbit>>(
      new Map()
    );
    const originalPositionsRef = useRef<Float32Array | null>(null);
    const targetPositionsRef = useRef<Float32Array | null>(null);
    const shapeTimerRef = useRef<number>(0);
    const shapeExpandProgressRef = useRef<number>(0);
    const shapePauseTimerRef = useRef<number>(0);

    // 过渡完成后稳定期，避免立即应用动态效果导致抖动
    const shapeStabilizationTimerRef = useRef<number>(0);

    // 行星系统轨道参数
    const planetaryOrbitsRef = useRef<Array<{
      a: number; // 长轴
      b: number; // 短轴
      speed: number; // 角速度
      angle: number; // 当前角度
      yOffset: number; // Y轴偏移
    }> | null>(null);

    // 漂浮粒子参数
    const floatParticlesRef = useRef<Array<{
      velocity: THREE.Vector3;
      position: THREE.Vector3;
    }> | null>(null);

    // 原子轨道参数
    const atomicOrbitsRef = useRef<AtomicOrbit[] | null>(null);
    const targetAtomicOrbitsRef = useRef<AtomicOrbit[] | null>(null);

    // 流星系统
    const meteorsRef = useRef<THREE.Mesh[]>([]);
    const lastMeteorTimeRef = useRef<number>(0);

    // 拖拽检测，避免点击时暂停
    const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);

    // 形态切换时的摄像头动画状态
    const shapeTransitionCameraStateRef = useRef<ShapeTransitionCameraState>({
      phase: "idle",
      originalCameraPos: null,
    });

    // 摄像头动画状态
    const cameraAnimationRef = useRef<CameraAnimationState | null>(null);

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
            .order("created_at", { ascending: false })
            .limit(NEBULA_PARTICLE_COUNT);

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

    // 缓存纹理获取函数
    const getGlowTexture = useCallback(() => createGlowTexture(), []);
    const getNebulaTexture = useCallback(() => createNebulaTexture(), []);

    // 缓存曲线生成函数
    const createWanderCurves = useCallback(
      (startPos: THREE.Vector3) =>
        generateWanderCurves(startPos, paramsRef.current),
      []
    );

    useImperativeHandle(ref, () => ({
      updateParams: (newParams) => {
        const cameraChanged =
          newParams.cameraX !== lastCameraParamsRef.current.x ||
          newParams.cameraY !== lastCameraParamsRef.current.y ||
          newParams.cameraZ !== lastCameraParamsRef.current.z;

        paramsRef.current = newParams;

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
          duration: params.cameraPanDuration,
          onComplete,
        };
      },

      highlightParticle: (particleId: string | null) => {
        highlightedParticleIdRef.current = particleId;
      },

      getRandomNebulaParticle: () => {
        const data = nebulaParticleDataRef.current;
        const validParticles = data.filter((p) => p.text && p.text.length > 0);
        if (validParticles.length === 0) return null;

        const index = carouselIndexRef.current % validParticles.length;
        carouselIndexRef.current = index + 1;

        const particle = validParticles[index];
        const originalIndex = data.findIndex((p) => p.id === particle.id);

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

      getHighlightedParticleScreenPosition: () => {
        if (!highlightSpriteRef.current || !cameraRef.current) return null;
        if (!highlightedParticleIdRef.current) return null;
        if (highlightFadeRef.current < 0.5) return null;

        // 移除对 cameraPhase 的检查，允许在形态切换和摄像头移动时显示连线
        // const cameraPhase = shapeTransitionCameraStateRef.current.phase;
        // if (cameraPhase !== "idle") return null;

        const sprite = highlightSpriteRef.current;
        if (!sprite.visible) return null;

        const worldPos = sprite.position.clone();
        const screenPos = worldPos.project(cameraRef.current);

        const x = ((screenPos.x + 1) / 2) * window.innerWidth;
        const y = ((-screenPos.y + 1) / 2) * window.innerHeight;

        return { x, y };
      },

      isShapeTransitioning: () => {
        return shapeTransitionTargetRef.current !== shapeModeRef.current;
      },

      spawnProjectile: (
        rect: DOMRect,
        colorHex: string,
        text: string,
        onComplete?: () => void
      ) => {
        if (!cameraRef.current || !sceneRef.current) return;

        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        const ndcX = (x / window.innerWidth) * 2 - 1;
        const ndcY = -(y / window.innerHeight) * 2 + 1;

        const vector = new THREE.Vector3(ndcX, ndcY, 0.5);
        vector.unproject(cameraRef.current);

        const dir = vector.sub(cameraRef.current.position).normalize();
        const distanceFromCamera = 50;
        const startPos = cameraRef.current.position
          .clone()
          .add(dir.multiplyScalar(distanceFromCamera));

        const color = new THREE.Color(colorHex);
        const id = `particle-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;

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
        mesh.position.copy(startPos);
        mesh.userData = { id, text };

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
        const nebulaSize = 2.5;
        const flyingScale = 1.8;
        sprite.scale.set(nebulaSize * flyingScale, nebulaSize * flyingScale, 1);
        mesh.add(sprite);

        // 创建渐变拖尾
        const trailLength = paramsRef.current.trailLength;
        const trailPositions: THREE.Vector3[] = [];
        for (let i = 0; i < trailLength; i++) {
          trailPositions.push(startPos.clone());
        }

        const trailGeometry = createTaperedTrailGeometry(
          trailPositions,
          0.4,
          0.02
        );
        const trailMaterial = new THREE.MeshBasicMaterial({
          color: color.clone().multiplyScalar(0.2),
          transparent: true,
          opacity: paramsRef.current.trailOpacity * 0.6,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        });
        const trail = new THREE.Mesh(trailGeometry, trailMaterial);

        sceneRef.current.add(mesh);
        sceneRef.current.add(trail);

        const {
          curves: wanderCurves,
          speedMultipliers: wanderSpeedMultipliers,
        } = createWanderCurves(startPos);

        // Calculate target position based on current shape mode to avoid jumping
        const virtualIndex =
          NEBULA_PARTICLE_COUNT +
          settledParticlesRef.current.length +
          projectilesRef.current.length;
        const totalCount = virtualIndex + 1;
        const elapsedTime = clockRef.current
          ? clockRef.current.getElapsedTime()
          : 0;

        const { position: localTargetPos, orbit } =
          calculateParticleTargetPosition(
            shapeModeRef.current,
            virtualIndex,
            totalCount,
            elapsedTime
          );

        // 关键修复：将局部坐标转换为世界坐标，考虑星云当前的旋转
        const targetPos = localTargetPos.clone();
        if (nebulaRef.current) {
          nebulaRef.current.updateMatrixWorld();
          targetPos.applyMatrix4(nebulaRef.current.matrixWorld);
        }

        console.log(`[Spawn] Particle ${id} target calculated:`, {
          mode: shapeModeRef.current,
          virtualIndex,
          localPos: localTargetPos.clone(),
          worldPos: targetPos.clone(),
          orbit: orbit ? "Created" : "None",
        });

        // 如果生成了轨道数据（原子模式），立即保存，确保后续动画一致
        if (orbit) {
          settledParticlesOrbitsRef.current.set(id, orbit);
        }

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

      pauseNebulaTimer,
      resumeNebulaTimer,
    }));

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      // 初始化 Three.js
      const scene = new THREE.Scene();
      sceneRef.current = scene;
      scene.fog = new THREE.FogExp2(0x020617, 0.003);

      const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
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

      // 控制器
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.enableZoom = true;
      controls.minDistance = 30;
      controls.maxDistance = 200;
      controls.zoomSpeed = 0.8;
      controls.enablePan = false;
      controls.rotateSpeed = 0.3;
      controls.target.set(0, 0, 0);
      controlsRef.current = controls;

      // 创建星云
      const particleCount = NEBULA_PARTICLE_COUNT;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);

      const colorPalette = NEBULA_COLOR_PALETTE.map((c) => new THREE.Color(c));

      for (let i = 0; i < particleCount; i++) {
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

      originalPositionsRef.current = new Float32Array(positions);

      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const nebulaTexture = getNebulaTexture();
      const nebulaMaterial = new THREE.PointsMaterial({
        size: 2.0,
        vertexColors: true,
        map: nebulaTexture,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: initialParams.nebulaParticleOpacity ?? 0.9,
        alphaTest: 0.01,
        sizeAttenuation: true,
      });

      const nebula = new THREE.Points(geometry, nebulaMaterial);
      nebula.renderOrder = 10; // 确保粒子在连线之上渲染
      scene.add(nebula);
      nebulaRef.current = nebula;

      // 如果初始模式是 atomic，初始化轨道和固定连线对
      if (shapeModeRef.current === "atomic") {
        atomicOrbitsRef.current = generateAtomicOrbits(particleCount);
        initFixedAtomicPairs(particleCount); // 初始化固定的粒子对

        // 使用生成的轨道计算初始位置，确保一致性
        const orbits = atomicOrbitsRef.current;
        for (let i = 0; i < particleCount; i++) {
          const pos = calculateOrbitPosition(orbits[i]);
          positions[i * 3] = pos.x;
          positions[i * 3 + 1] = pos.y;
          positions[i * 3 + 2] = pos.z;
        }
        geometry.attributes.position.needsUpdate = true;
      }

      // 为星云粒子创建心情数据
      const dbPosts = databasePostsRef.current;
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

        if (dbPosts.length > 0) {
          const post = dbPosts[i % dbPosts.length];
          nebulaParticleData.push({
            id: post.id,
            text: post.content,
            color: post.color || `#${color.getHexString()}`,
            timestamp: new Date(post.created_at).getTime(),
            position: pos,
          });
        } else {
          nebulaParticleData.push({
            id: `nebula-${i}`,
            text: "",
            color: `#${color.getHexString()}`,
            timestamp: Date.now() - Math.random() * 86400000 * 30,
            position: pos,
          });
        }
      }
      nebulaParticleDataRef.current = nebulaParticleData;

      // 移除从 LocalStorage 加载本地粒子的逻辑，以确保只显示数据库中的100个粒子
      // 且所有粒子都能参与形态切换动画
      /*
      const savedParticles = loadParticlesFromStorage();
      if (savedParticles.length > 0) {
         ... (removed code)
      }
      */

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

      // 星空背景
      const starsGeo = new THREE.BufferGeometry();
      const starsPos = new Float32Array(800 * 3);
      for (let i = 0; i < 800 * 3; i++)
        starsPos[i] = (Math.random() - 0.5) * 500;
      starsGeo.setAttribute("position", new THREE.BufferAttribute(starsPos, 3));
      const starsMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.5,
        map: getGlowTexture(),
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        alphaTest: 0.01,
        sizeAttenuation: true,
      });
      const starField = new THREE.Points(starsGeo, starsMat);
      scene.add(starField);

      // 粒子连线系统 - 使用Line2数组
      particleLinesRef.current = [];

      // 点击事件处理
      const handleClick = (event: MouseEvent) => {
        if (!cameraRef.current || !nebulaRef.current) return;

        mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
        raycasterRef.current.params.Points.threshold = RAYCASTER_THRESHOLD;

        console.log(
          `[Click] Checking ${settledMeshesRef.current.length} settled meshes`
        );

        // 检测已定居的粒子 mesh
        if (settledMeshesRef.current.length > 0) {
          // 使用 intersectObjects 一次性检测所有 mesh，比手动遍历更准确
          const intersects = raycasterRef.current.intersectObjects(
            settledMeshesRef.current,
            true
          );

          console.log(
            `[Click] Raycaster found ${intersects.length} intersections`
          );

          if (intersects.length > 0) {
            // 找到最近的那个
            const hit = intersects[0];
            console.log(`[Click] Hit object:`, {
              type: hit.object.type,
              userData: hit.object.userData,
              distance: hit.distance,
              point: hit.point,
            });

            // 查找对应的粒子数据
            // 注意：hit.object 可能是 mesh 本身，也可能是它的子对象（如 sprite）
            // 我们需要向上查找直到找到带有 particleId 的对象
            let target: THREE.Object3D | null = hit.object;
            while (target && !target.userData.particleId && target.parent) {
              target = target.parent;
            }

            if (target && target.userData.particleId) {
              const particleId = target.userData.particleId;
              const particle = settledParticlesRef.current.find(
                (p) => p.id === particleId
              );
              if (particle) {
                onParticleClickRef.current?.(particle);
                return;
              }
            }
          }
        }

        // 检测星云原始粒子
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

          const currentParticleData = nebulaParticleDataRef.current;

          if (
            index < currentParticleData.length &&
            intersect.distanceToRay !== undefined
          ) {
            if (intersect.distanceToRay < CLICK_RADIUS) {
              // 获取当前粒子的实时位置（因为形态切换会改变位置）
              const positions = nebulaRef.current.geometry.attributes.position
                .array as Float32Array;
              const localPos = new THREE.Vector3(
                positions[index * 3],
                positions[index * 3 + 1],
                positions[index * 3 + 2]
              );
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
      };

      renderer.domElement.addEventListener("click", handleClick);

      // 拖动星云时暂停旋转
      const handleDragStart = (event: any) => {
        // 记录拖拽开始时的鼠标位置
        dragStartPosRef.current = { x: event.clientX, y: event.clientY };
      };
      const handleDragEnd = (event: any) => {
        // 检查是否实际移动了鼠标（避免点击时暂停）
        if (dragStartPosRef.current) {
          const dx = event.clientX - dragStartPosRef.current.x;
          const dy = event.clientY - dragStartPosRef.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // 如果移动距离大于阈值，则认为是拖拽
          if (distance > 5) {
            // 只有在真正拖拽时才设置短暂暂停
            if (nebulaPausedUntilRef.current !== Infinity) {
              nebulaPausedUntilRef.current = Date.now() + 3000;
            }
          }
        }
        dragStartPosRef.current = null;
      };

      // 鼠标移动时检查是否为拖拽
      const handleMouseMove = (event: MouseEvent) => {
        if (dragStartPosRef.current) {
          const dx = event.clientX - dragStartPosRef.current.x;
          const dy = event.clientY - dragStartPosRef.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // 如果移动距离大于阈值，开始暂停
          if (distance > 5 && nebulaPausedUntilRef.current !== Infinity) {
            nebulaPausedUntilRef.current = Infinity;
          }
        }
      };

      controls.addEventListener("start", handleDragStart);
      controls.addEventListener("end", handleDragEnd);
      window.addEventListener("mousemove", handleMouseMove);

      // 动画循环
      let animationId: number;
      const clock = new THREE.Clock();
      clockRef.current = clock;

      const animate = () => {
        animationId = requestAnimationFrame(animate);
        const delta = clock.getDelta();

        controls.update();

        // 摄像头滑动动画
        if (cameraAnimationRef.current?.isAnimating) {
          const anim = cameraAnimationRef.current;
          anim.progress += delta / anim.duration;

          if (anim.progress >= 1) {
            camera.position.copy(anim.targetPos);
            camera.lookAt(0, 0, 0);
            anim.isAnimating = false;
            anim.onComplete?.();
            cameraAnimationRef.current = null;
          } else {
            const t = easeInOutCubic(anim.progress);
            camera.position.lerpVectors(anim.startPos, anim.targetPos, t);
            camera.lookAt(0, 0, 0);
          }
        }

        // 旋转星云并应用缩放（始终运行，即便形态切换被暂停）
        if (nebulaRef.current) {
          const rotationDelta = paramsRef.current.nebulaSpeed;
          nebulaRef.current.rotation.y += rotationDelta;
          const scale = paramsRef.current.nebulaScale;
          nebulaRef.current.scale.set(scale, scale, scale);

          // 同步旋转新粒子（它们在 scene 中，需要手动同步旋转）
          if (rotationDelta !== 0 && shapeModeRef.current !== "atomic") {
            const rotationAxis = new THREE.Vector3(0, 1, 0);
            // 旋转已定居的粒子
            settledParticlesRef.current.forEach((p) => {
              if (p.mesh && p.mesh.parent === scene) {
                p.mesh.position.applyAxisAngle(rotationAxis, rotationDelta);
              }
            });
            // 旋转正在 settling 的粒子
            projectilesRef.current.forEach((p) => {
              if (p.phase === "settling" && p.mesh && p.mesh.parent === scene) {
                p.mesh.position.applyAxisAngle(rotationAxis, rotationDelta);
                // 同步更新 targetPos 以保持一致性
                if (p.targetPos) {
                  p.targetPos.applyAxisAngle(rotationAxis, rotationDelta);
                }
              }
            });
          }

          // 形态变换系统 - 仅在未暂停形态切换时推进计时
          const isShapePaused =
            shapeSwitchPausedRef.current ||
            nebulaPausedUntilRef.current === Infinity ||
            Date.now() < nebulaPausedUntilRef.current;
          if (!isShapePaused) {
            shapeTimerRef.current += delta;
            // debug
            if (
              Math.floor(shapeTimerRef.current) !==
              Math.floor(shapeTimerRef.current - delta)
            ) {
              console.log(
                `[ThreeScene] shapeTimer: ${shapeTimerRef.current.toFixed(2)}s`
              );
            }
          } else {
            // debug
            console.log(
              `[ThreeScene] shapeTimer paused at ${shapeTimerRef.current.toFixed(
                2
              )}s`
            );
          }
          // 更新稳定期计时器
          if (shapeStabilizationTimerRef.current > 0) {
            shapeStabilizationTimerRef.current -= delta;
          }

          const cameraState = shapeTransitionCameraStateRef.current;

          // 检查是否需要开始形态过渡
          if (
            !shapeSwitchPausedRef.current &&
            shapeTimerRef.current >= SHAPE_DURATION &&
            shapeTransitionTargetRef.current === shapeModeRef.current
          ) {
            console.log("[ThreeScene] Triggering shape transition", {
              shapeTimer: shapeTimerRef.current.toFixed(2),
              threshold: SHAPE_DURATION,
            });

            shapeTimerRef.current = 0;
            const shapes: ShapeMode[] = ["nebula", "river", "wave", "atomic"];
            const currentIndex = shapes.indexOf(shapeModeRef.current);
            const nextIndex = (currentIndex + 1) % shapes.length;
            shapeTransitionTargetRef.current = shapes[nextIndex];
            shapeTransitionRef.current = 0;

            // 关键修复：在过渡开始前，捕获当前粒子的实际位置作为起点
            // 这样可以避免从动态位置（如河流流动中）突然跳变回初始静态位置
            if (nebulaRef.current) {
              const currentPositions = nebulaRef.current.geometry.attributes
                .position.array as Float32Array;
              originalPositionsRef.current = new Float32Array(currentPositions);
            }

            // 捕获新粒子的当前位置作为起点
            settledParticlesOriginalPositionsRef.current.clear();
            settledParticlesTargetPositionsRef.current.clear();
            settledParticlesRef.current.forEach((p, i) => {
              if (p.mesh) {
                settledParticlesOriginalPositionsRef.current.set(
                  p.id,
                  p.mesh.position.clone()
                );

                // 计算新粒子的目标位置
                const virtualIndex = NEBULA_PARTICLE_COUNT + i;
                const { position: targetPos, orbit } =
                  calculateParticleTargetPosition(
                    shapeTransitionTargetRef.current,
                    virtualIndex,
                    NEBULA_PARTICLE_COUNT + settledParticlesRef.current.length,
                    0, // 时间在过渡期间不重要，因为我们只计算一次静态目标
                    settledParticlesOrbitsRef.current.get(p.id)
                  );

                settledParticlesTargetPositionsRef.current.set(p.id, targetPos);
                if (orbit) {
                  settledParticlesOrbitsRef.current.set(p.id, orbit);
                }
              }
            });

            // 预先生成目标形态的位置并缓存，避免在过渡期间每帧重新生成导致抖动
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
                // 对于波浪，我们生成一个静态快照作为目标
                targetPositions = generateWaveShape(
                  particleCount,
                  elapsedTime + SHAPE_TRANSITION_DURATION
                );
                break;
              case "atomic":
                // 生成并缓存轨道，确保过渡后的一致性
                const orbits = generateAtomicOrbits(particleCount);
                targetAtomicOrbitsRef.current = orbits;

                targetPositions = new Float32Array(particleCount * 3);
                for (let i = 0; i < particleCount; i++) {
                  const pos = calculateOrbitPosition(orbits[i]);
                  targetPositions[i * 3] = pos.x;
                  targetPositions[i * 3 + 1] = pos.y;
                  targetPositions[i * 3 + 2] = pos.z;
                }
                break;
              default:
                targetPositions = new Float32Array(particleCount * 3);
            }
            targetShapePositionsRef.current = targetPositions;

            // 触发摄像头动画
            if (cameraRef.current) {
              // 记录原始位置
              shapeTransitionCameraStateRef.current = {
                phase: "zooming-out",
                originalCameraPos: cameraRef.current.position.clone(),
              };

              // 开始移动到目标位置 (0, 50, 80)
              // 使用 cameraAnimationRef 来处理平滑移动
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
                duration: CAMERA_ZOOM_DURATION, // 前3秒移动
                onComplete: () => {
                  // 移动完成后，进入暂停阶段
                  shapeTransitionCameraStateRef.current.phase = "pausing";

                  // 2秒后返回
                  setTimeout(() => {
                    if (!cameraRef.current) return;

                    shapeTransitionCameraStateRef.current.phase = "zooming-in";
                    const originalPos =
                      shapeTransitionCameraStateRef.current.originalCameraPos ||
                      new THREE.Vector3(
                        params.cameraX,
                        params.cameraY,
                        params.cameraZ
                      );

                    cameraAnimationRef.current = {
                      isAnimating: true,
                      startPos: cameraRef.current.position.clone(),
                      targetPos: originalPos,
                      progress: 0,
                      duration: CAMERA_ZOOM_DURATION, // 返回也用3秒，保持平滑
                      onComplete: () => {
                        shapeTransitionCameraStateRef.current.phase = "idle";
                      },
                    };
                  }, SHAPE_PAUSE_DURATION * 1000); // 暂停2秒
                },
              };
            }
          }

          // 形态过渡逻辑 - 直接插值位置，无额外效果
          if (shapeTransitionTargetRef.current !== shapeModeRef.current) {
            shapeTransitionRef.current += delta / SHAPE_TRANSITION_DURATION;

            if (shapeTransitionRef.current >= 1) {
              shapeTransitionRef.current = 0;
              shapeModeRef.current = shapeTransitionTargetRef.current;

              // 过渡完成时，精确设置位置到目标形态，避免抖动
              const elapsedTime = clock.elapsedTime;
              let targetPositions: Float32Array;

              // 如果有缓存的目标位置，直接使用
              if (targetShapePositionsRef.current) {
                targetPositions = targetShapePositionsRef.current;
              } else {
                // 降级处理（不应该发生）
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
                  case "atomic":
                    targetPositions = generateAtomicShape(particleCount);
                    break;
                  default:
                    targetPositions = originalPositionsRef.current!;
                }
              }

              // 如果是 atomic 模式，使用之前生成的轨道
              if (shapeModeRef.current === "atomic") {
                if (targetAtomicOrbitsRef.current) {
                  atomicOrbitsRef.current = targetAtomicOrbitsRef.current;
                  targetAtomicOrbitsRef.current = null;
                } else {
                  atomicOrbitsRef.current = generateAtomicOrbits(particleCount);
                }
                initFixedAtomicPairs(particleCount);
              }

              const nebulaPositions = nebulaRef.current.geometry.attributes
                .position.array as Float32Array;

              // 精确设置位置
              for (let i = 0; i < particleCount * 3; i++) {
                nebulaPositions[i] = targetPositions[i];
              }

              originalPositionsRef.current = new Float32Array(targetPositions);
              nebulaRef.current.geometry.attributes.position.needsUpdate = true;

              // 清理缓存
              targetShapePositionsRef.current = null;
              settledParticlesOriginalPositionsRef.current.clear();
              settledParticlesTargetPositionsRef.current.clear();

              // 开始稳定期，防止立即应用动态效果
              shapeStabilizationTimerRef.current = 0.5; // 0.5秒稳定期
              shapeTransitionRef.current = 0; // 结束过渡状态
            } else {
              // 使用缓存的目标位置进行插值，确保目标是稳定的
              const targetPositions =
                targetShapePositionsRef.current ||
                originalPositionsRef.current!;

              const progress = shapeTransitionRef.current;
              const nebulaPositions = nebulaRef.current.geometry.attributes
                .position.array as Float32Array;
              const original = originalPositionsRef.current!;

              const blendT = easeInOutCubic(progress);

              for (let i = 0; i < particleCount; i++) {
                const idx = i * 3;
                nebulaPositions[idx] =
                  original[idx] * (1 - blendT) + targetPositions[idx] * blendT;
                nebulaPositions[idx + 1] =
                  original[idx + 1] * (1 - blendT) +
                  targetPositions[idx + 1] * blendT;
                nebulaPositions[idx + 2] =
                  original[idx + 2] * (1 - blendT) +
                  targetPositions[idx + 2] * blendT;
              }
              nebulaRef.current.geometry.attributes.position.needsUpdate = true;

              // 更新新粒子的过渡位置
              settledParticlesRef.current.forEach((p) => {
                if (p.mesh) {
                  const originalPos =
                    settledParticlesOriginalPositionsRef.current.get(p.id);
                  const targetPos =
                    settledParticlesTargetPositionsRef.current.get(p.id);

                  if (originalPos && targetPos) {
                    p.mesh.position.lerpVectors(originalPos, targetPos, blendT);
                  }
                }
              });
            }
          } else if (
            shapeModeRef.current === "nebula" &&
            cameraState.phase === "idle" &&
            shapeStabilizationTimerRef.current <= 0
          ) {
            // Nebula 模式：新粒子保持在其位置，只随整体旋转（已在上面处理）
            // 不需要额外更新位置
          } else if (
            shapeModeRef.current === "wave" &&
            cameraState.phase === "idle" &&
            shapeStabilizationTimerRef.current <= 0
          ) {
            const elapsedTime = clock.elapsedTime;
            const nebulaPositions = nebulaRef.current.geometry.attributes
              .position.array as Float32Array;
            const wavePositions = generateWaveShape(particleCount, elapsedTime);

            for (let i = 0; i < particleCount * 3; i++) {
              nebulaPositions[i] +=
                (wavePositions[i] - nebulaPositions[i]) * 0.02;
            }
            nebulaRef.current.geometry.attributes.position.needsUpdate = true;

            // 更新新粒子的波浪运动
            settledParticlesRef.current.forEach((p, i) => {
              if (p.mesh) {
                const virtualIndex = NEBULA_PARTICLE_COUNT + i;
                const { position: targetPos } = calculateParticleTargetPosition(
                  "wave",
                  virtualIndex,
                  NEBULA_PARTICLE_COUNT + settledParticlesRef.current.length,
                  elapsedTime
                );
                p.mesh.position.lerp(targetPos, 0.02);
              }
            });
          } else if (
            shapeModeRef.current === "river" &&
            cameraState.phase === "idle" &&
            shapeStabilizationTimerRef.current <= 0
          ) {
            const nebulaPositions = nebulaRef.current.geometry.attributes
              .position.array as Float32Array;
            const flowSpeed = 0.5;

            for (let i = 0; i < particleCount; i++) {
              nebulaPositions[i * 3] += flowSpeed * delta * 5;
              if (nebulaPositions[i * 3] > 15 * Math.PI) {
                nebulaPositions[i * 3] = -15 * Math.PI;
              }
            }
            nebulaRef.current.geometry.attributes.position.needsUpdate = true;

            // 更新新粒子的河流运动
            settledParticlesRef.current.forEach((p) => {
              if (p.mesh) {
                p.mesh.position.x += flowSpeed * delta * 5;
                if (p.mesh.position.x > 15 * Math.PI) {
                  p.mesh.position.x = -15 * Math.PI;
                }
              }
            });
          } else if (
            shapeModeRef.current === "atomic" &&
            cameraState.phase === "idle" &&
            shapeStabilizationTimerRef.current <= 0 &&
            atomicOrbitsRef.current
          ) {
            // 原子模型动画：粒子围绕中心做3D椭圆轨道运动
            const nebulaPositions = nebulaRef.current.geometry.attributes
              .position.array as Float32Array;
            updateAtomicPositions(
              atomicOrbitsRef.current,
              nebulaPositions,
              delta
            );
            nebulaRef.current.geometry.attributes.position.needsUpdate = true;

            // 更新新粒子的原子运动
            settledParticlesRef.current.forEach((p, i) => {
              if (p.mesh) {
                let orbit = settledParticlesOrbitsRef.current.get(p.id);
                if (!orbit) {
                  // 如果没有轨道，生成一个
                  const virtualIndex = NEBULA_PARTICLE_COUNT + i;
                  const { orbit: newOrbit } = calculateParticleTargetPosition(
                    "atomic",
                    virtualIndex,
                    NEBULA_PARTICLE_COUNT + settledParticlesRef.current.length,
                    0
                  );
                  if (newOrbit) {
                    orbit = newOrbit;
                    settledParticlesOrbitsRef.current.set(p.id, orbit);
                  }
                }

                if (orbit) {
                  orbit.angle += orbit.angularSpeed * delta;
                  const pos = calculateOrbitPosition(orbit);
                  p.mesh.position.copy(pos);
                }
              }
            });
          }

          // 星云粒子效果
          const breathTime = clock.elapsedTime;
          const mainWave = Math.sin(breathTime * 0.5) * 0.5;
          const subWave = Math.sin(breathTime * 1.2) * 0.25;
          const microWave = Math.sin(breathTime * 2.5) * 0.1;
          const breathWave = mainWave + subWave + microWave;

          const brightness = paramsRef.current.nebulaBrightness ?? 1.0;
          const baseSize = 1.0 + brightness * 0.5;
          const breathSize = baseSize * (1 + breathWave * 0.15);

          const baseOpacity = paramsRef.current.nebulaParticleOpacity ?? 1.0;
          const breathOpacity = Math.min(
            1,
            Math.max(0.85, baseOpacity * (0.95 + breathWave * 0.05))
          );

          const nebulaMat = nebulaRef.current.material as THREE.PointsMaterial;
          nebulaMat.opacity = breathOpacity;
          nebulaMat.size = breathSize;
        }
        starField.rotation.y += paramsRef.current.nebulaSpeed * 0.1;

        // 流星效果
        if (
          clock.elapsedTime - lastMeteorTimeRef.current >
          METEOR_CONFIG.INTERVAL
        ) {
          console.log("Meteor appeared!");
          lastMeteorTimeRef.current = clock.elapsedTime;
          const meteor = createMeteor(clock.elapsedTime);
          scene.add(meteor);
          meteorsRef.current.push(meteor as unknown as THREE.Mesh);
        }

        // 更新流星
        updateMeteors(
          meteorsRef.current as unknown as Line2[],
          scene,
          clock.elapsedTime,
          delta
        );

        // 更新高亮粒子效果
        if (highlightSpriteRef.current) {
          const highlightId = highlightedParticleIdRef.current;

          // 如果选中的粒子发生变化，重置淡入效果以触发"先发光后连线"的序列
          if (highlightId !== lastHighlightedIdRef.current) {
            highlightFadeRef.current = 0;
            lastHighlightedIdRef.current = highlightId;
          }

          const shouldShow = !!highlightId;

          highlightTargetRef.current = shouldShow ? 1 : 0;

          const fadeSpeed = 3.0;
          const diff = highlightTargetRef.current - highlightFadeRef.current;
          highlightFadeRef.current += diff * fadeSpeed * delta;
          highlightFadeRef.current = Math.max(
            0,
            Math.min(1, highlightFadeRef.current)
          );

          const fadeValue = highlightFadeRef.current;

          if (fadeValue > 0.01) {
            let targetPos: THREE.Vector3 | null = null;
            let particleColor = "#ffffff";

            if (highlightId) {
              // 先检查是否是新粒子（settled particles）
              const settled = settledParticlesRef.current.find(
                (p) => p.id === highlightId
              );
              if (settled && settled.mesh) {
                targetPos = new THREE.Vector3();
                settled.mesh.getWorldPosition(targetPos);
                particleColor = settled.color;

                // Debug: Check if targetPos is suspiciously close to origin
                if (targetPos.length() < 0.1) {
                  console.warn(
                    `[Highlight] Settled particle ${highlightId} is at origin!`,
                    {
                      localPos: settled.mesh.position.clone(),
                      parent: settled.mesh.parent?.type,
                    }
                  );
                }
              }

              // 如果不是新粒子，检查原始星云粒子
              if (!targetPos) {
                const nebulaParticleIndex =
                  nebulaParticleDataRef.current.findIndex(
                    (p) => p.id === highlightId
                  );

                // 只有当 index 小于实际星云粒子数量时才使用几何体位置
                if (
                  nebulaParticleIndex >= 0 &&
                  nebulaParticleIndex < NEBULA_PARTICLE_COUNT &&
                  nebulaRef.current
                ) {
                  const particle =
                    nebulaParticleDataRef.current[nebulaParticleIndex];

                  const nebulaPositions = nebulaRef.current.geometry.attributes
                    .position.array as Float32Array;
                  const localPos = new THREE.Vector3(
                    nebulaPositions[nebulaParticleIndex * 3],
                    nebulaPositions[nebulaParticleIndex * 3 + 1],
                    nebulaPositions[nebulaParticleIndex * 3 + 2]
                  );
                  targetPos = localPos.applyMatrix4(
                    nebulaRef.current.matrixWorld
                  );
                  particleColor = particle.color;
                }
              }
            }

            if (targetPos) {
              highlightSpriteRef.current.visible = true;
              highlightSpriteRef.current.position.copy(targetPos);
              const pulseTime = clock.elapsedTime * 3;
              const pulse = 0.6 + Math.sin(pulseTime) * 0.4;
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
              const highlightScale = (6 + Math.sin(pulseTime) * 2) * smoothFade;
              highlightSpriteRef.current.scale.set(
                highlightScale,
                highlightScale,
                1
              );
            } else {
              highlightSpriteRef.current.visible = false;
            }
          } else {
            highlightSpriteRef.current.visible = false;
          }
        }

        // 更新粒子连线（每3帧更新一次以优化性能）
        const frameCount = renderer.info.render.frame;
        // 检查是否正在进行形态切换
        const isTransitioning =
          shapeTransitionTargetRef.current !== shapeModeRef.current;

        if (
          particleLinesRef.current &&
          nebulaRef.current &&
          shapeModeRef.current === "atomic" &&
          !isTransitioning && // 过渡期间不显示连线
          frameCount % 4 === 0
        ) {
          const nebulaPositions = nebulaRef.current.geometry.attributes.position
            .array as Float32Array;

          // 使用原子系统计算连接
          if (atomicOrbitsRef.current) {
            // 不传入 maxDistance，使用 ATOMIC_CONFIG 内部的默认值
            const connections = calculateAtomicConnections(
              nebulaPositions,
              atomicOrbitsRef.current
            );

            // 确保连接池足够大
            while (particleLinesRef.current.length < connections.length) {
              const geometry = new LineGeometry();
              const material = new LineMaterial({
                color: 0xffffff,
                linewidth: 1,
                transparent: true,
                opacity: 0.5,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                vertexColors: true, // 启用顶点颜色以支持渐变
              });
              material.resolution.set(window.innerWidth, window.innerHeight);

              const line2 = new Line2(geometry, material);
              line2.renderOrder = 0; // 连线在最底层渲染
              scene.add(line2);
              particleLinesRef.current.push(line2);
            }

            // 预先计算世界坐标矩阵
            nebulaRef.current.updateMatrixWorld();
            const matrixWorld = nebulaRef.current.matrixWorld;
            const vecA = new THREE.Vector3();
            const vecB = new THREE.Vector3();

            // 更新现有线条
            for (let i = 0; i < particleLinesRef.current.length; i++) {
              const line = particleLinesRef.current[i];
              if (i < connections.length) {
                const conn = connections[i];
                line.visible = true;

                // 获取局部坐标并转换为世界坐标
                vecA
                  .set(
                    nebulaPositions[conn.indexA * 3],
                    nebulaPositions[conn.indexA * 3 + 1],
                    nebulaPositions[conn.indexA * 3 + 2]
                  )
                  .applyMatrix4(matrixWorld);

                vecB
                  .set(
                    nebulaPositions[conn.indexB * 3],
                    nebulaPositions[conn.indexB * 3 + 1],
                    nebulaPositions[conn.indexB * 3 + 2]
                  )
                  .applyMatrix4(matrixWorld);

                // 更新位置
                line.geometry.setPositions([
                  vecA.x,
                  vecA.y,
                  vecA.z,
                  vecB.x,
                  vecB.y,
                  vecB.z,
                ]);

                // 更新线条距离计算（Line2 需要这个）
                line.computeLineDistances();

                // 更新颜色（渐变效果）
                // 移除脉冲，使用固定亮度
                const colorA = conn.colorA.clone().multiplyScalar(0.5);
                const colorB = conn.colorB.clone().multiplyScalar(0.2);

                line.geometry.setColors([
                  colorA.r,
                  colorA.g,
                  colorA.b,
                  colorB.r,
                  colorB.g,
                  colorB.b,
                ]);

                // 更新材质 - 动态线宽
                line.material.linewidth = conn.lineWidth;
                line.material.opacity = conn.opacity;
                line.material.resolution.set(
                  window.innerWidth,
                  window.innerHeight
                );
                line.material.needsUpdate = true;
              } else {
                line.visible = false;
              }
            }
          }
        } else if (
          particleLinesRef.current &&
          (shapeModeRef.current !== "atomic" || isTransitioning)
        ) {
          // 非原子模式或过渡期间隐藏所有连线
          particleLinesRef.current.forEach((line) => {
            line.visible = false;
          });
        }

        // 更新粒子动画
        for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
          const p = projectilesRef.current[i];
          const params = paramsRef.current;

          switch (p.phase) {
            case "pulse": {
              p.phaseProgress += delta * 1000;
              const pulseT = p.phaseProgress / params.pulseDuration;

              if (pulseT >= 1) {
                p.phase = "wander";
                p.phaseProgress = 0;
                p.wanderCurveIndex = 0;
              } else {
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
              const curveCount = p.wanderCurves.length;
              const timePerCurve = params.wanderDuration / curveCount / 1000;
              const speedMult =
                p.wanderSpeedMultipliers[p.wanderCurveIndex] || 1;
              p.phaseProgress += (delta / timePerCurve) * speedMult;

              if (p.wanderCurveIndex >= p.wanderCurves.length) {
                p.phase = "flight";
                p.phaseProgress = 0;

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
                const curve = p.wanderCurves[p.wanderCurveIndex];
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
              const flightEaseFunc = (t: number) =>
                t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
              p.phaseProgress += delta / params.flightDuration;

              if (p.phaseProgress >= 1) {
                p.phase = "settling";
                p.phaseProgress = 0;
                scene.remove(p.trail);
                p.onComplete?.();
              } else if (p.flightCurve) {
                const t = flightEaseFunc(p.phaseProgress);
                const point = p.flightCurve.getPoint(t);
                p.mesh.position.copy(point);

                const flightScale = 1 - p.phaseProgress * 0.5;
                p.mesh.scale.setScalar(flightScale);
                p.sprite.scale.set(
                  params.particleGlow * flightScale,
                  params.particleGlow * flightScale,
                  1
                );
              }
              break;
            }

            case "settling": {
              p.phaseProgress += delta;

              // 不再将 mesh 移入 nebula 组，保持在 scene 中以便点击检测
              // mesh 保持在世界坐标系，位置由 shapeUtils 计算并实时更新

              // 关键修复：在 settling 阶段，让粒子保持在目标位置（考虑形态动态）
              if (shapeModeRef.current === "atomic") {
                // 原子模式：让粒子跟随轨道运动
                const orbit = settledParticlesOrbitsRef.current.get(p.id);
                if (orbit) {
                  orbit.angle += orbit.angularSpeed * delta;
                  const pos = calculateOrbitPosition(orbit);
                  p.mesh.position.copy(pos);
                }
              } else {
                // 其他模式：保持在目标位置
                if (p.targetPos) {
                  p.mesh.position.copy(p.targetPos);
                }
              }

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

              // 每0.5秒输出一次闪烁中的位置
              if (
                Math.floor(p.phaseProgress * 2) !==
                Math.floor((p.phaseProgress - delta) * 2)
              ) {
                console.log(`[Settling] Particle ${p.id} blinking at:`, {
                  localPos: p.mesh.position.clone(),
                  worldPos: p.mesh.getWorldPosition(new THREE.Vector3()),
                  targetPos: p.targetPos?.clone(),
                  progress: p.phaseProgress.toFixed(2),
                });
              }

              // 移除 floatY - 不再需要，因为粒子现在跟随轨道/保持在目标位置

              if (p.phaseProgress >= params.settleBlinkDuration) {
                p.phase = "nebula";

                // 粒子汇入星云，恢复星云动画计时
                resumeNebulaTimer();

                p.mesh.userData = {
                  type: "settledParticle",
                  particleId: p.id,
                };
                p.sprite.userData = {
                  type: "settledParticle",
                  particleId: p.id,
                };

                console.log(`[Settle Complete] Particle ${p.id} final state:`, {
                  finalLocalPos: p.mesh.position.clone(),
                  finalWorldPos: p.mesh.getWorldPosition(new THREE.Vector3()),
                  originalTargetPos: p.targetPos?.clone(),
                  parent: p.mesh.parent?.type,
                  meshInSettledMeshes: settledMeshesRef.current.includes(
                    p.mesh
                  ),
                });

                settledParticlesRef.current.push({
                  id: p.id,
                  text: p.text,
                  color: `#${p.color.getHexString()}`,
                  timestamp: p.timestamp,
                  position: p.mesh.position.clone(),
                  mesh: p.mesh,
                });

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

                nebulaParticleDataRef.current.push({
                  id: p.id,
                  text: p.text,
                  color: `#${p.color.getHexString()}`,
                  timestamp: p.timestamp,
                  position: p.mesh.position.clone(),
                });

                settledMeshesRef.current.push(p.mesh);

                const spriteMat = p.sprite.material as THREE.SpriteMaterial;
                spriteMat.map = getNebulaTexture();
                spriteMat.opacity = params.nebulaParticleOpacity;
                spriteMat.blending = THREE.AdditiveBlending;
                spriteMat.depthWrite = false;
                spriteMat.needsUpdate = true;
                const nebulaParticleSize = 2.5;
                p.sprite.scale.set(nebulaParticleSize, nebulaParticleSize, 1);
                p.mesh.scale.setScalar(0.5);
                projectilesRef.current.splice(i, 1);
                continue;
              }
              break;
            }
          }

          // 更新拖尾
          if (p.phase !== "nebula" && p.phase !== "settling") {
            const currentPos = p.mesh.position.clone();
            p.currentSpeed = currentPos.distanceTo(p.lastPosition) / delta;
            p.lastPosition.copy(currentPos);

            const speedFactor = Math.min(p.currentSpeed / 15, 2.5);
            const effectiveTrailLength = Math.floor(
              params.trailLength * (0.4 + speedFactor * 0.6)
            );

            p.trailPositions.unshift(currentPos);
            while (p.trailPositions.length > effectiveTrailLength) {
              p.trailPositions.pop();
            }

            if (p.trailPositions.length >= 2) {
              const headRadius = 0.25 + speedFactor * 0.15;
              const tailRadius = 0.01;

              const newGeometry = createTaperedTrailGeometry(
                p.trailPositions,
                headRadius,
                tailRadius
              );
              p.trail.geometry.dispose();
              p.trail.geometry = newGeometry;

              (p.trail.material as THREE.MeshBasicMaterial).opacity =
                params.trailOpacity * Math.min(1, 0.5 + speedFactor * 0.4);
            }
          }
        }

        renderer.render(scene, camera);
      };
      animate();

      onReadyRef.current?.();

      // 窗口大小调整
      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("mousemove", handleMouseMove);
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
    }, []);

    return <div ref={containerRef} id="canvas-container" />;
  }
);

ThreeScene.displayName = "ThreeScene";

export default ThreeScene;
