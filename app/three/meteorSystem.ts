import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

export const METEOR_CONFIG = {
  INTERVAL: 10,
  TRAIL_LENGTH: 5,
  LINE_WIDTH: 3,
  LIFE: 2.5,
  SPEED: 120,
  START_HEIGHT_MIN: 40,
  START_HEIGHT_MAX: 80,
  START_RADIUS_MIN: 40,
  START_RADIUS_MAX: 60,
};

export interface MeteorUserData {
  velocity: THREE.Vector3;
  life: number;
  startTime: number;
  headPosition: THREE.Vector3;
  trailPoints: THREE.Vector3[];
}

export function createMeteor(currentTime: number): Line2 {
  const {
    TRAIL_LENGTH,
    LINE_WIDTH,
    LIFE,
    SPEED,
    START_HEIGHT_MIN,
    START_HEIGHT_MAX,
    START_RADIUS_MIN,
    START_RADIUS_MAX,
  } = METEOR_CONFIG;

  const trailPoints: THREE.Vector3[] = [];

  // 随机起始位置（在视野边缘的球面上）
  const startAngle = Math.random() * Math.PI * 2;
  const startHeight =
    START_HEIGHT_MIN + Math.random() * (START_HEIGHT_MAX - START_HEIGHT_MIN);
  const startRadius =
    START_RADIUS_MIN + Math.random() * (START_RADIUS_MAX - START_RADIUS_MIN);

  const startPos = new THREE.Vector3(
    Math.cos(startAngle) * startRadius,
    startHeight,
    Math.sin(startAngle) * startRadius
  );

  // 流星方向：计算一个穿过星云中心区域的目标点
  const passThroughPoint = new THREE.Vector3(
    (Math.random() - 0.5) * 40, // x: -20 to 20
    (Math.random() - 0.5) * 10, // y: -5 to 5
    (Math.random() - 0.5) * 40 // z: -20 to 20
  );
  const direction = passThroughPoint.clone().sub(startPos).normalize();

  // 初始化拖尾点（都在起始位置）
  for (let i = 0; i < TRAIL_LENGTH; i++) {
    trailPoints.push(startPos.clone());
  }

  // 使用 Line2 创建流星（支持线宽）
  const positions: number[] = [];
  const colors: number[] = [];

  for (let i = 0; i < TRAIL_LENGTH; i++) {
    positions.push(startPos.x, startPos.y, startPos.z);

    const t = i / TRAIL_LENGTH; // 0 = 头部, 1 = 尾部
    const brightness = Math.pow(1 - t, 2); // 头部最亮
    // 白色到蓝色渐变
    colors.push(
      0.8 + brightness * 0.2, // R
      0.85 + brightness * 0.15, // G
      1.0 // B
    );
  }

  const meteorGeometry = new LineGeometry();
  meteorGeometry.setPositions(positions);
  meteorGeometry.setColors(colors);

  const meteorMaterial = new LineMaterial({
    color: 0xffffff,
    linewidth: LINE_WIDTH,
    vertexColors: true,
    dashed: false,
    alphaToCoverage: false,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    depthTest: true,
    depthWrite: false,
  });

  const meteor = new Line2(meteorGeometry, meteorMaterial);
  meteor.computeLineDistances();

  meteor.userData = {
    velocity: direction.multiplyScalar(SPEED),
    life: LIFE,
    startTime: currentTime,
    headPosition: startPos.clone(),
    trailPoints: trailPoints,
  } as MeteorUserData;

  return meteor;
}

export function updateMeteors(
  meteors: Line2[],
  scene: THREE.Scene,
  currentTime: number,
  delta: number
): void {
  for (let i = meteors.length - 1; i >= 0; i--) {
    const meteor = meteors[i];
    const userData = meteor.userData as MeteorUserData;
    const elapsed = currentTime - userData.startTime;

    if (elapsed > userData.life) {
      scene.remove(meteor);
      meteor.geometry.dispose();
      meteor.material.dispose();
      meteors.splice(i, 1);
      continue;
    }

    // 更新头部位置
    const headPos = userData.headPosition;
    const velocity = userData.velocity;
    headPos.add(velocity.clone().multiplyScalar(delta));

    // 更新拖尾点（每个点跟随前一个点）
    const trailPoints = userData.trailPoints;
    for (let j = trailPoints.length - 1; j > 0; j--) {
      trailPoints[j].lerp(trailPoints[j - 1], 0.3); // 平滑跟随
    }
    trailPoints[0].copy(headPos);

    // 更新 Line2 几何体
    const positions: number[] = [];
    for (let j = 0; j < trailPoints.length; j++) {
      positions.push(trailPoints[j].x, trailPoints[j].y, trailPoints[j].z);
    }
    meteor.geometry.setPositions(positions);
    meteor.computeLineDistances();

    // 确保分辨率正确
    meteor.material.resolution.set(window.innerWidth, window.innerHeight);

    // 淡出效果
    const fadeStart = 0.6; // 60% 时间后开始淡出
    const progress = elapsed / userData.life;
    const opacity =
      progress > fadeStart
        ? 0.9 * (1 - (progress - fadeStart) / (1 - fadeStart))
        : 0.9;
    meteor.material.opacity = opacity;
  }
}
