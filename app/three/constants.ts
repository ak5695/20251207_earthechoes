// 形态切换配置常量
export const SHAPE_DURATION = 60; // 每种形态持续60秒
export const SHAPE_TRANSITION_DURATION = 4; // 过渡动画4秒
export const SHAPE_PAUSE_DURATION = 1; // 混合完成后停顿2秒
export const SHAPE_EXPAND_DURATION = 2; // 展开动画2秒
export const CAMERA_ZOOM_DURATION = 3; // 摄像头移动动画3秒

// 星云粒子数量
export const NEBULA_PARTICLE_COUNT = 100;

// 星云颜色调色板
export const NEBULA_COLOR_PALETTE = [
  "#6366f1", // 靛蓝
  "#ec4899", // 粉红
  "#06b6d4", // 青色
  "#8b5cf6", // 紫罗兰
];

// 粒子检测配置
export const CLICK_RADIUS = 2.5; // 粒子光圈有效点击半径
export const RAYCASTER_THRESHOLD = 1.5; // Points 检测阈值

// 连线配置
export const MAX_LINE_DISTANCE = 50; // 最大连线距离
export const MAX_LINES = 100; // 最大连线数
export const MAX_CONNECTIONS_PER_PARTICLE = 2; // 每个粒子最多连接数

// 漂浮粒子配置
export const FLOAT_MIN_SPEED = 0.1; // 最小漂浮速度
export const FLOAT_MAX_SPEED = 0.5; // 最大漂浮速度

// 原子模型配置
export const ATOMIC_MIN_ORBIT_RADIUS = 8; // 最小轨道半径
export const ATOMIC_MAX_ORBIT_RADIUS = 20; // 最大轨道半径
export const ATOMIC_MIN_ANGULAR_SPEED = 0.02; // 最小角速度
export const ATOMIC_MAX_ANGULAR_SPEED = 0.05; // 最大角速度
export const ATOMIC_LINE_MAX_WIDTH = 8; // 连线最大宽度
export const ATOMIC_LINE_MIN_WIDTH = 0.1; // 连线最小宽度
export const ATOMIC_LINE_BASE_OPACITY = 0.8; // 连线基础透明度
export const ATOMIC_HUE_START = 180; // 颜色起始色相

// 摄像头配置 (初始位置)
export const CAMERA_INIT_POS = {
  x: 0,
  y: 0,
  z: 10, // 桌面端默认 Z
};

// 摄像头动画目标位置 (桌面端默认)
export const CAMERA_TARGET_POS = {
  x: 0,
  y: 50,
  z: 80,
};

// 响应式摄像头配置
export const CAMERA_RESPONSIVE = {
  desktop: {
    z: 10,
    targetZ: 80,
    targetY: 50,
  },
  mobile: {
    z: 42,
    targetZ: 110,
    targetY: 58,
  },
  smallMobile: {
    z: 50,
    targetZ: 130,
    targetY: 65,
  },
};
