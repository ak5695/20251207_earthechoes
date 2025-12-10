import type { AnimationParams } from "../components/ThreeScene";
import {
  NEBULA_PARTICLE_COUNT,
  CAMERA_INIT_POS,
  CAMERA_TARGET_POS,
  CAMERA_RESPONSIVE,
} from "../three/constants";

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
  nebulaParticleCount: NEBULA_PARTICLE_COUNT,
  nebulaScale: 1.0,
  nebulaBrightness: 2.0,
  nebulaParticleOpacity: 1.0,

  // 进入星云后闪烁
  settleBlinkDuration: 5,
  settleBlinkSpeed: 1.369,
  settleBlinkAmplitude: 1,

  // 摄像头位置（初始）
  cameraX: CAMERA_INIT_POS.x,
  cameraY: CAMERA_INIT_POS.y,
  cameraZ: CAMERA_INIT_POS.z,

  // 摄像头动画目标位置
  cameraTargetX: CAMERA_TARGET_POS.x,
  cameraTargetY: CAMERA_TARGET_POS.y,
  cameraTargetZ: CAMERA_TARGET_POS.z,
  cameraPanDuration: 2.0,
};

// 根据屏幕大小获取摄像机参数
export const getCameraParamsForScreen = () => {
  if (typeof window === "undefined") {
    return {
      cameraZ: CAMERA_RESPONSIVE.desktop.z,
      cameraTargetZ: CAMERA_RESPONSIVE.desktop.targetZ,
      cameraTargetY: CAMERA_RESPONSIVE.desktop.targetY,
    };
  }
  const isMobile = window.innerWidth < 768;
  const isSmallMobile = window.innerWidth < 480;

  if (isSmallMobile) {
    return {
      cameraZ: CAMERA_RESPONSIVE.smallMobile.z,
      cameraTargetZ: CAMERA_RESPONSIVE.smallMobile.targetZ,
      cameraTargetY: CAMERA_RESPONSIVE.smallMobile.targetY,
    };
  } else if (isMobile) {
    return {
      cameraZ: CAMERA_RESPONSIVE.mobile.z,
      cameraTargetZ: CAMERA_RESPONSIVE.mobile.targetZ,
      cameraTargetY: CAMERA_RESPONSIVE.mobile.targetY,
    };
  }
  return {
    cameraZ: CAMERA_RESPONSIVE.desktop.z,
    cameraTargetZ: CAMERA_RESPONSIVE.desktop.targetZ,
    cameraTargetY: CAMERA_RESPONSIVE.desktop.targetY,
  };
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
