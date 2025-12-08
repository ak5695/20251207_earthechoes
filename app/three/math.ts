import * as THREE from "three";
import type { AnimationParams } from "./types";

/**
 * 缓出三次方缓动函数
 */
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

/**
 * 缓入缓出三次方缓动函数
 */
export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * 飞行缓动函数
 */
export const flightEase = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

/**
 * 生成星云中的随机位置（更靠近中心，可见范围内）
 */
export const generateNebulaPosition = (): THREE.Vector3 => {
  const r = Math.random() * 25 + 5; // 更小的半径，确保在视野内
  const theta = Math.random() * Math.PI * 2;
  const y = (Math.random() - 0.5) * 6;
  return new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta));
};

/**
 * 整个屏幕范围边界
 */
export const SCREEN_BOUNDS = {
  minX: -20,
  maxX: 20,
  minY: -30,
  maxY: 30,
  minZ: 10, // 确保粒子不会飞到摄像头后方
  maxZ: 50,
};

/**
 * 生成哲学性的漂移曲线（整个屏幕范围内）
 */
export const generateWanderCurves = (
  startPos: THREE.Vector3,
  params: AnimationParams
): { curves: THREE.CubicBezierCurve3[]; speedMultipliers: number[] } => {
  const curves: THREE.CubicBezierCurve3[] = [];
  const speedMultipliers: number[] = [];
  let currentPos = startPos.clone();
  const count = Math.floor(params.wanderCurveCount);
  const speedVar = params.wanderSpeedVariation;
  const radius = params.wanderRadius;

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
    endX = Math.max(SCREEN_BOUNDS.minX, Math.min(SCREEN_BOUNDS.maxX, endX));
    endY = Math.max(SCREEN_BOUNDS.minY, Math.min(SCREEN_BOUNDS.maxY, endY));
    endZ = Math.max(SCREEN_BOUNDS.minZ, Math.min(SCREEN_BOUNDS.maxZ, endZ));

    const endPos = new THREE.Vector3(endX, endY, endZ);

    // 控制点：创建哲学性的、若有所思的曲线
    const cp1 = new THREE.Vector3(
      Math.max(
        SCREEN_BOUNDS.minX,
        Math.min(
          SCREEN_BOUNDS.maxX,
          currentPos.x + (Math.random() - 0.5) * radius * 1.8
        )
      ),
      Math.max(
        SCREEN_BOUNDS.minY,
        Math.min(
          SCREEN_BOUNDS.maxY,
          currentPos.y + (Math.random() - 0.3) * radius * 0.8
        )
      ),
      Math.max(
        SCREEN_BOUNDS.minZ,
        Math.min(
          SCREEN_BOUNDS.maxZ,
          currentPos.z + (Math.random() - 0.5) * radius * 1.2
        )
      )
    );

    const cp2 = new THREE.Vector3(
      Math.max(
        SCREEN_BOUNDS.minX,
        Math.min(
          SCREEN_BOUNDS.maxX,
          endPos.x + (Math.random() - 0.5) * radius * 1.5
        )
      ),
      Math.max(
        SCREEN_BOUNDS.minY,
        Math.min(
          SCREEN_BOUNDS.maxY,
          endPos.y + (Math.random() - 0.5) * radius * 0.6
        )
      ),
      Math.max(
        SCREEN_BOUNDS.minZ,
        Math.min(SCREEN_BOUNDS.maxZ, endPos.z + (Math.random() - 0.5) * radius)
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
};

/**
 * 约束值在范围内
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

/**
 * 线性插值
 */
export const lerp = (a: number, b: number, t: number): number => {
  return a + (b - a) * t;
};
