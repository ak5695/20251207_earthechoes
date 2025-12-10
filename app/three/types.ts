import * as THREE from "three";

// === 动画参数类型 ===
export interface AnimationParams {
  // 坍缩动画
  collapseDuration: number;

  // 脉冲/悬停
  pulseDuration: number;
  pulseScale: number;

  // 随机漂移（使用三次贝塞尔曲线）
  wanderDuration: number;
  wanderCurveCount: number;
  wanderRadius: number;
  wanderSpeedVariation: number;

  // 飞向星云
  flightDuration: number;
  flightCurve: number;

  // 粒子外观
  particleSize: number;
  particleGlow: number;
  trailLength: number;
  trailOpacity: number;

  // 星云
  nebulaSpeed: number;
  nebulaParticleCount: number;
  nebulaScale: number;
  nebulaBrightness: number;
  nebulaParticleOpacity: number;

  // 进入星云后闪烁
  settleBlinkDuration: number;
  settleBlinkSpeed: number;
  settleBlinkAmplitude: number;

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

// === 贡献粒子类型 ===
export interface ContributedParticle {
  id: string;
  text: string;
  color: string;
  timestamp: number;
  position: THREE.Vector3;
  mesh?: THREE.Mesh;
}

// === 暴露给 React 父组件的方法 ===
export interface ThreeSceneHandle {
  spawnProjectile: (
    rect: DOMRect,
    color: string,
    text: string,
    onComplete?: () => void
  ) => void;
  updateParams: (params: AnimationParams) => void;
  animateCamera: (onComplete?: () => void) => void;
  resetCamera: (onComplete?: () => void) => void;
  highlightParticle: (particleId: string | null) => void;
  getRandomNebulaParticle: () => ContributedParticle | null;
  getHighlightedParticleScreenPosition: () => { x: number; y: number } | null;
  isShapeTransitioning: () => boolean;
  pauseNebulaTimer?: () => void;
  resumeNebulaTimer?: () => void;
}

// === 组件 Props ===
export interface ThreeSceneProps {
  params: AnimationParams;
  onParticleClick?: (particle: ContributedParticle) => void;
  selectedParticleId?: string | null;
  language?: string;
  onReady?: () => void;
}

// === 动画阶段 ===
export type ProjectilePhase =
  | "pulse"
  | "wander"
  | "flight"
  | "settling"
  | "nebula";

// === 粒子对象 ===
export interface Projectile {
  id: string;
  text: string;
  mesh: THREE.Mesh;
  sprite: THREE.Sprite;
  trail: THREE.Mesh;
  trailPositions: THREE.Vector3[];
  phase: ProjectilePhase;
  phaseProgress: number;
  color: THREE.Color;
  lastPosition: THREE.Vector3;
  currentSpeed: number;

  // 起始位置
  startPos: THREE.Vector3;
  // 漂移曲线（三次贝塞尔）
  wanderCurve: THREE.CubicBezierCurve3;
  wanderCurveIndex: number;
  wanderCurves: THREE.CubicBezierCurve3[];
  wanderSpeedMultipliers: number[];
  // 最终目标（星云中的位置）
  targetPos: THREE.Vector3;
  // 飞行曲线
  flightCurve?: THREE.CubicBezierCurve3;
  // 完成回调
  onComplete?: () => void;

  timestamp: number;
}

// === 存储的粒子数据格式 ===
export interface StoredParticle {
  id: string;
  text: string;
  color: string;
  timestamp: number;
  position: { x: number; y: number; z: number };
}

// === 形态模式 ===
export type ShapeMode = "nebula" | "river" | "wave" | "atomic";

// === 摄像头动画状态 ===
export interface CameraAnimationState {
  isAnimating: boolean;
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  progress: number;
  duration: number;
  onComplete?: () => void;
}

export interface ShapeTransitionCameraState {
  phase: "idle" | "zooming-out" | "pausing" | "expanding" | "zooming-in";
  originalCameraPos: THREE.Vector3 | null;
}
