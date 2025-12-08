import type { AnimationParams } from "../components/ThreeScene";

// 默认动画参数
export const defaultAnimationParams: AnimationParams = {
  // 坍缩动画
  collapseDuration: 1000,

  // 脉冲
  pulseDuration: 1500,
  pulseScale: 0.3,

  // 随机漂移（三次贝塞尔曲线）
  wanderDuration: 10000,
  wanderCurveCount: 4,
  wanderRadius: 46.8,
  wanderSpeedVariation: 0.3,

  // 飞向星云
  flightDuration: 2.0,
  flightCurve: 80,

  // 粒子外观
  particleSize: 1,
  particleGlow: 6.576,
  trailLength: 30,
  trailOpacity: 0.8011,

  // 星云
  nebulaSpeed: 0.0008,
  nebulaParticleCount: 500,
  nebulaScale: 1.0,
  nebulaBrightness: 2.0,
  nebulaParticleOpacity: 1.0,

  // 进入星云后闪烁
  settleBlinkDuration: 5,
  settleBlinkSpeed: 1.369,
  settleBlinkAmplitude: 1,

  // 摄像头位置（初始）
  cameraX: 0,
  cameraY: 0,
  cameraZ: 30,

  // 摄像头动画目标位置
  cameraTargetX: 0,
  cameraTargetY: 50,
  cameraTargetZ: 80,
  cameraPanDuration: 2.0,
};

// 根据屏幕大小获取摄像机参数
export const getCameraParamsForScreen = () => {
  if (typeof window === "undefined") {
    return { cameraZ: 30, cameraTargetZ: 80, cameraTargetY: 50 };
  }
  const isMobile = window.innerWidth < 768;
  const isSmallMobile = window.innerWidth < 480;

  if (isSmallMobile) {
    return { cameraZ: 50, cameraTargetZ: 130, cameraTargetY: 65 };
  } else if (isMobile) {
    return { cameraZ: 42, cameraTargetZ: 110, cameraTargetY: 58 };
  }
  return { cameraZ: 30, cameraTargetZ: 80, cameraTargetY: 50 };
};

// 心情颜色列表
export const moodColors = [
  "#6366f1",
  "#ec4899",
  "#06b6d4",
  "#f59e0b",
  "#8b5cf6",
  "#10b981",
];

// 获取随机心情颜色
export const getRandomMoodColor = () => {
  return moodColors[Math.floor(Math.random() * moodColors.length)];
};
