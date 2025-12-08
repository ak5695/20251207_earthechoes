// 类型定义
export type {
  AnimationParams,
  ContributedParticle,
  ThreeSceneHandle,
  ThreeSceneProps,
  ProjectilePhase,
  Projectile,
  StoredParticle,
  ShapeMode,
  CameraAnimationState,
  ShapeTransitionCameraState,
} from "./types";

// 存储工具
export {
  saveParticlesToStorage,
  loadParticlesFromStorage,
  addParticleToStorage,
  clearParticlesFromStorage,
} from "./storage";

// 几何体工具
export { createTaperedTrailGeometry } from "./geometry";

// 形态生成器
export {
  generateNebulaShape,
  generateRiverShape,
  generateWaveShape,
} from "./shapes";

// 纹理工具
export {
  createGlowTexture,
  createNebulaTexture,
  clearTextureCache,
} from "./textures";

// 数学工具
export {
  easeOutCubic,
  easeInOutCubic,
  flightEase,
  generateNebulaPosition,
  generateWanderCurves,
  SCREEN_BOUNDS,
  clamp,
  lerp,
} from "./math";

// 常量
export {
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
} from "./constants";
