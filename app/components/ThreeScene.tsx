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
  loadParticlesFromStorage,
  addParticleToStorage,
} from "../three/storage";

import { createTaperedTrailGeometry } from "../three/geometry";
import { generateNebulaShape, generateRiverShape, generateWaveShape } from "../three/shapes";
import { createGlowTexture, createNebulaTexture } from "../three/textures";
import {
  easeInOutCubic,
  generateNebulaPosition,
  generateWanderCurves,
} from "../three/math";
import {
  SHAPE_DURATION,
  SHAPE_TRANSITION_DURATION,
  SHAPE_PAUSE_DURATION,
  SHAPE_EXPAND_DURATION,
  CAMERA_ZOOM_DURATION,
  NEBULA_COLOR_PALETTE,
  CLICK_RADIUS,
  RAYCASTER_THRESHOLD,
  MAX_LINE_DISTANCE,
  MAX_LINES,
  MAX_CONNECTIONS_PER_PARTICLE,
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
    const highlightSpriteRef = useRef<THREE.Sprite | null>(null);
    const nebulaParticleDataRef = useRef<ContributedParticle[]>([]);
    const nebulaPausedUntilRef = useRef<number>(0);
    const carouselIndexRef = useRef<number>(0);
    const highlightFadeRef = useRef<number>(0);
    const highlightTargetRef = useRef<number>(0);
    const particleLinesRef = useRef<THREE.LineSegments | null>(null);

    // 数据库心情数据
    const [databasePosts, setDatabasePosts] = useState<Post[]>([]);
    const databasePostsRef = useRef<Post[]>([]);

    // 形态变换系统
    const shapeModeRef = useRef<ShapeMode>("nebula");
    const shapeTransitionRef = useRef<number>(0);
    const shapeTransitionTargetRef = useRef<ShapeMode>("nebula");
    const originalPositionsRef = useRef<Float32Array | null>(null);
    const targetPositionsRef = useRef<Float32Array | null>(null);
    const shapeTimerRef = useRef<number>(0);
    const shapeExpandProgressRef = useRef<number>(0);
    const shapePauseTimerRef = useRef<number>(0);

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

    // 缓存纹理获取函数
    const getGlowTexture = useCallback(() => createGlowTexture(), []);
    const getNebulaTexture = useCallback(() => createNebulaTexture(), []);

    // 缓存曲线生成函数
    const createWanderCurves = useCallback(
      (startPos: THREE.Vector3) => generateWanderCurves(startPos, paramsRef.current),
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

        const cameraPhase = shapeTransitionCameraStateRef.current.phase;
        if (cameraPhase !== "idle") return null;

        const sprite = highlightSpriteRef.current;
        if (!sprite.visible) return null;

        const worldPos = sprite.position.clone();
        const screenPos = worldPos.project(cameraRef.current);

        const x = ((screenPos.x + 1) / 2) * window.innerWidth;
        const y = ((-screenPos.y + 1) / 2) * window.innerHeight;

        return { x, y };
      },

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
      const particleCount = initialParams.nebulaParticleCount;
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
      scene.add(nebula);
      nebulaRef.current = nebula;

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

      // 从 LocalStorage 加载已保存的用户粒子
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

          const meshGeometry = new THREE.SphereGeometry(
            paramsRef.current.particleSize * 0.3,
            16,
            16
          );
          const meshMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0,
          });
          const mesh = new THREE.Mesh(meshGeometry, meshMaterial);
          mesh.position.copy(pos);
          mesh.scale.setScalar(0.5);
          mesh.userData = {
            type: "settledParticle",
            particleId: stored.id,
          };
          scene.add(mesh);

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

          settledParticlesRef.current.push({
            id: stored.id,
            text: stored.text,
            color: stored.color,
            timestamp: stored.timestamp,
            position: pos,
            mesh: mesh,
          });

          nebulaParticleDataRef.current.push({
            id: stored.id,
            text: stored.text,
            color: stored.color,
            timestamp: stored.timestamp,
            position: pos,
          });

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

      // 粒子连线系统
      const lineGeometry = new THREE.BufferGeometry();
      const linePositions = new Float32Array(200 * 3);
      lineGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(linePositions, 3)
      );
      lineGeometry.setDrawRange(0, 0);

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

      // 点击事件处理
      const handleClick = (event: MouseEvent) => {
        if (!cameraRef.current || !nebulaRef.current) return;

        mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
        raycasterRef.current.params.Points.threshold = RAYCASTER_THRESHOLD;

        // 检测已定居的粒子 mesh
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
              if (distance < CLICK_RADIUS && distance < closestDistance) {
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
      };

      renderer.domElement.addEventListener("click", handleClick);

      // 拖动星云时暂停旋转
      const handleDragStart = () => {
        nebulaPausedUntilRef.current = Infinity;
      };
      const handleDragEnd = () => {
        nebulaPausedUntilRef.current = Date.now() + 3000;
      };
      controls.addEventListener("start", handleDragStart);
      controls.addEventListener("end", handleDragEnd);

      // 动画循环
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

        // 旋转星云并应用缩放
        if (nebulaRef.current) {
          const isNebulaPaused = Date.now() < nebulaPausedUntilRef.current;
          if (!isNebulaPaused) {
            nebulaRef.current.rotation.y += paramsRef.current.nebulaSpeed;
          }
          const scale = paramsRef.current.nebulaScale;
          nebulaRef.current.scale.set(scale, scale, scale);

          // 形态变换系统
          shapeTimerRef.current += delta;
          const cameraState = shapeTransitionCameraStateRef.current;

          // 检查是否需要开始形态过渡
          if (
            shapeTimerRef.current >= SHAPE_DURATION - CAMERA_ZOOM_DURATION &&
            cameraState.phase === "idle"
          ) {
            cameraState.phase = "zooming-out";
            cameraState.originalCameraPos = new THREE.Vector3(
              paramsRef.current.cameraX,
              paramsRef.current.cameraY,
              paramsRef.current.cameraZ
            );

            const targetX = paramsRef.current.cameraTargetX;
            const targetY = paramsRef.current.cameraTargetY;
            const targetZ = paramsRef.current.cameraTargetZ;

            cameraAnimationRef.current = {
              isAnimating: true,
              startPos: camera.position.clone(),
              targetPos: new THREE.Vector3(targetX, targetY, targetZ),
              progress: 0,
              duration: CAMERA_ZOOM_DURATION,
              onComplete: () => {},
            };

            shapeTimerRef.current = 0;
            const shapes: ShapeMode[] = ["nebula", "river", "wave"];
            const currentIndex = shapes.indexOf(shapeModeRef.current);
            const nextIndex = (currentIndex + 1) % shapes.length;
            shapeTransitionTargetRef.current = shapes[nextIndex];
          }

          // 形态过渡逻辑
          if (shapeTransitionTargetRef.current !== shapeModeRef.current) {
            if (
              cameraState.phase === "zooming-out" ||
              cameraState.phase === "zooming-in"
            ) {
              shapeTransitionRef.current += delta / SHAPE_TRANSITION_DURATION;

              if (shapeTransitionRef.current >= 1) {
                shapeTransitionRef.current = 1;
                shapeModeRef.current = shapeTransitionTargetRef.current;
                cameraState.phase = "pausing";
                shapePauseTimerRef.current = 0;
              } else {
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

                const progress = shapeTransitionRef.current;
                const nebulaPositions = nebulaRef.current.geometry.attributes
                  .position.array as Float32Array;
                const original = originalPositionsRef.current!;

                let scaleFactor: number;
                let blendT: number;

                if (progress < 0.4) {
                  const shrinkProgress = progress / 0.4;
                  const shrinkEase = easeInOutCubic(shrinkProgress);
                  scaleFactor = 1 - shrinkEase * 0.9;
                  blendT = 0;
                } else {
                  const blendProgress = (progress - 0.4) / 0.6;
                  scaleFactor = 0.1;
                  blendT = easeInOutCubic(blendProgress);
                }

                for (let i = 0; i < particleCount; i++) {
                  const idx = i * 3;
                  const blendedX =
                    original[idx] * (1 - blendT) +
                    targetPositions[idx] * blendT;
                  const blendedY =
                    original[idx + 1] * (1 - blendT) +
                    targetPositions[idx + 1] * blendT;
                  const blendedZ =
                    original[idx + 2] * (1 - blendT) +
                    targetPositions[idx + 2] * blendT;

                  nebulaPositions[idx] = blendedX * scaleFactor;
                  nebulaPositions[idx + 1] = blendedY * scaleFactor;
                  nebulaPositions[idx + 2] = blendedZ * scaleFactor;
                }
                nebulaRef.current.geometry.attributes.position.needsUpdate =
                  true;
              }
            }
          }

          // 停顿阶段处理
          if (cameraState.phase === "pausing") {
            shapePauseTimerRef.current += delta;

            if (shapePauseTimerRef.current >= SHAPE_PAUSE_DURATION) {
              cameraState.phase = "expanding";
              shapeExpandProgressRef.current = 0;
            }
          }

          // 展开阶段处理
          if (cameraState.phase === "expanding") {
            shapeExpandProgressRef.current += delta / SHAPE_EXPAND_DURATION;

            if (shapeExpandProgressRef.current >= 1) {
              shapeExpandProgressRef.current = 0;
              shapeTransitionRef.current = 0;
              shapeTransitionTargetRef.current = shapeModeRef.current;

              const nebulaPositions = nebulaRef.current.geometry.attributes
                .position.array as Float32Array;
              originalPositionsRef.current = new Float32Array(nebulaPositions);

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
              const expandProgress = shapeExpandProgressRef.current;
              const expandEase = easeInOutCubic(expandProgress);
              const scaleFactor = 0.1 + expandEase * 0.9;

              const nebulaPositions = nebulaRef.current.geometry.attributes
                .position.array as Float32Array;

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
                nebulaPositions[idx] = targetPositions[idx] * scaleFactor;
                nebulaPositions[idx + 1] =
                  targetPositions[idx + 1] * scaleFactor;
                nebulaPositions[idx + 2] =
                  targetPositions[idx + 2] * scaleFactor;
              }
              nebulaRef.current.geometry.attributes.position.needsUpdate = true;
            }
          } else if (
            shapeModeRef.current === "wave" &&
            cameraState.phase === "idle"
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
          } else if (
            shapeModeRef.current === "river" &&
            cameraState.phase === "idle"
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

          const nebulaMat = nebulaRef.current
            .material as THREE.PointsMaterial;
          nebulaMat.opacity = breathOpacity;
          nebulaMat.size = breathSize;
        }
        starField.rotation.y += paramsRef.current.nebulaSpeed * 0.1;

        // 更新高亮粒子效果
        if (highlightSpriteRef.current) {
          const highlightId = highlightedParticleIdRef.current;
          const cameraPhase = shapeTransitionCameraStateRef.current.phase;

          const shouldShow = highlightId && cameraPhase === "idle";

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
              const nebulaParticleIndex =
                nebulaParticleDataRef.current.findIndex(
                  (p) => p.id === highlightId
                );

              if (nebulaParticleIndex >= 0 && nebulaRef.current) {
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

        // 更新粒子连线
        const frameCount = Math.floor(clock.elapsedTime * 60) % 10;
        if (particleLinesRef.current && nebulaRef.current && frameCount === 0) {
          const lineMatRef = particleLinesRef.current
            .material as THREE.LineDashedMaterial;
          lineMatRef.opacity = 0.3;

          const dataParticles: { index: number; pos: THREE.Vector3 }[] = [];
          const particleData = nebulaParticleDataRef.current;
          const nebulaPositions = nebulaRef.current.geometry.attributes.position
            .array as Float32Array;

          for (let i = 0; i < particleData.length; i++) {
            const p = particleData[i];
            if (p.id && !p.id.startsWith("nebula-") && p.text) {
              const pos = new THREE.Vector3(
                nebulaPositions[i * 3],
                nebulaPositions[i * 3 + 1],
                nebulaPositions[i * 3 + 2]
              );
              pos.applyMatrix4(nebulaRef.current!.matrixWorld);
              dataParticles.push({ index: i, pos });
            }
          }

          const linePosArray = particleLinesRef.current.geometry.attributes
            .position.array as Float32Array;
          let lineIndex = 0;
          const connectionCount = new Map<number, number>();

          const possibleLines: { i: number; j: number; dist: number }[] = [];
          for (let i = 0; i < dataParticles.length; i++) {
            for (let j = i + 1; j < dataParticles.length; j++) {
              const dist = dataParticles[i].pos.distanceTo(
                dataParticles[j].pos
              );
              if (dist < MAX_LINE_DISTANCE) {
                possibleLines.push({ i, j, dist });
              }
            }
          }
          possibleLines.sort((a, b) => a.dist - b.dist);

          for (const line of possibleLines) {
            if (lineIndex >= MAX_LINES) break;
            const countI = connectionCount.get(line.i) || 0;
            const countJ = connectionCount.get(line.j) || 0;
            if (
              countI < MAX_CONNECTIONS_PER_PARTICLE &&
              countJ < MAX_CONNECTIONS_PER_PARTICLE
            ) {
              linePosArray[lineIndex * 6] = dataParticles[line.i].pos.x;
              linePosArray[lineIndex * 6 + 1] = dataParticles[line.i].pos.y;
              linePosArray[lineIndex * 6 + 2] = dataParticles[line.i].pos.z;
              linePosArray[lineIndex * 6 + 3] = dataParticles[line.j].pos.x;
              linePosArray[lineIndex * 6 + 4] = dataParticles[line.j].pos.y;
              linePosArray[lineIndex * 6 + 5] = dataParticles[line.j].pos.z;
              lineIndex++;
              connectionCount.set(line.i, countI + 1);
              connectionCount.set(line.j, countJ + 1);
            }
          }

          particleLinesRef.current.geometry.attributes.position.needsUpdate =
            true;
          particleLinesRef.current.geometry.setDrawRange(0, lineIndex * 2);
          particleLinesRef.current.computeLineDistances();
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

              if (nebulaRef.current && p.mesh.parent !== nebulaRef.current) {
                const worldPos = p.mesh.position.clone();
                nebulaRef.current.worldToLocal(worldPos);
                scene.remove(p.mesh);
                nebulaRef.current.add(p.mesh);
                p.mesh.position.copy(worldPos);
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

              const floatY = Math.sin(p.phaseProgress * 2) * 0.3;
              p.mesh.position.y += floatY * delta;

              if (p.phaseProgress >= params.settleBlinkDuration) {
                p.phase = "nebula";

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
