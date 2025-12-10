/**
 * 原子模型系统 - 模拟3D原子轨道效果
 * 高内聚低耦合设计：独立处理原子模型的所有逻辑
 */

import * as THREE from "three";
import {
  ATOMIC_MIN_ORBIT_RADIUS,
  ATOMIC_MAX_ORBIT_RADIUS,
  ATOMIC_MIN_ANGULAR_SPEED,
  ATOMIC_MAX_ANGULAR_SPEED,
} from "./constants";

// === 原子轨道数据结构 ===
export interface AtomicOrbit {
  // 轨道参数
  semiMajorAxis: number; // 半长轴 a
  semiMinorAxis: number; // 半短轴 b
  inclination: number; // 轨道倾角（相对于XZ平面）
  rotation: number; // 轨道旋转角（绕Y轴）

  // 粒子参数
  angle: number; // 当前角度位置
  angularSpeed: number; // 角速度

  // 颜色（用于连线匹配）
  colorHue: number;
}

// === 常量配置 ===
export const ATOMIC_CONFIG = {
  // 轨道范围
  MIN_ORBIT_RADIUS: ATOMIC_MIN_ORBIT_RADIUS,
  MAX_ORBIT_RADIUS: ATOMIC_MAX_ORBIT_RADIUS,

  // 速度范围
  MIN_ANGULAR_SPEED: ATOMIC_MIN_ANGULAR_SPEED,
  MAX_ANGULAR_SPEED: ATOMIC_MAX_ANGULAR_SPEED,

  // 连线配置
  LINE_MAX_DISTANCE: 3, // 超过此距离不显示连线
  LINE_MAX_WIDTH: 4, // 最粗为4
  LINE_MIN_WIDTH: 0.3, // 最细为0.3
  LINE_BASE_OPACITY: 0.9,

  // 颜色配置（HSL色相范围）
  HUE_START: 220, // 蓝紫色起始
  HUE_RANGE: 80, // 色相变化范围
};

/**
 * 生成原子轨道参数
 */
export function generateAtomicOrbit(
  index: number,
  totalCount: number
): AtomicOrbit {
  // 使用黄金角度分布轨道平面，使轨道在3D空间中均匀分布
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  // 轨道平面的倾角（0到π，均匀分布在球面上）
  const inclination = Math.acos(1 - (2 * (index + 0.5)) / totalCount);

  // 轨道平面的旋转角
  const rotation = goldenAngle * index;

  // 轨道大小（随机但有层次感）
  const orbitLayer = Math.floor(index / (totalCount / 5)) + 1;
  const baseRadius =
    ATOMIC_CONFIG.MIN_ORBIT_RADIUS +
    (ATOMIC_CONFIG.MAX_ORBIT_RADIUS - ATOMIC_CONFIG.MIN_ORBIT_RADIUS) *
      (orbitLayer / 5);
  const radiusVariation = (Math.random() - 0.5) * 8;
  const semiMajorAxis = baseRadius + radiusVariation;

  // 椭圆度（0.6-0.95，越外层越接近圆形）
  const eccentricity = 0.6 + Math.random() * 0.35;
  const semiMinorAxis = semiMajorAxis * eccentricity;

  // 角速度（内层快，外层慢，模拟开普勒定律）
  const baseSpeed =
    ATOMIC_CONFIG.MAX_ANGULAR_SPEED -
    (orbitLayer / 5) *
      (ATOMIC_CONFIG.MAX_ANGULAR_SPEED - ATOMIC_CONFIG.MIN_ANGULAR_SPEED);
  // 速度变异：基于基础速度的20%波动，而不是固定值
  const speedVariation = baseSpeed * (Math.random() - 0.5) * 0.4;
  const angularSpeed = baseSpeed + speedVariation;

  // 初始角度随机
  const angle = Math.random() * Math.PI * 2;

  // 颜色色相（基于轨道层）
  const colorHue =
    ATOMIC_CONFIG.HUE_START + (orbitLayer / 5) * ATOMIC_CONFIG.HUE_RANGE;

  return {
    semiMajorAxis,
    semiMinorAxis,
    inclination,
    rotation,
    angle,
    angularSpeed,
    colorHue,
  };
}

/**
 * 生成所有原子轨道
 */
export function generateAtomicOrbits(particleCount: number): AtomicOrbit[] {
  const orbits: AtomicOrbit[] = [];
  for (let i = 0; i < particleCount; i++) {
    orbits.push(generateAtomicOrbit(i, particleCount));
  }
  return orbits;
}

/**
 * 计算粒子在轨道上的3D位置
 */
export function calculateOrbitPosition(orbit: AtomicOrbit): THREE.Vector3 {
  // 椭圆轨道上的位置（在XZ平面上）
  const x = orbit.semiMajorAxis * Math.cos(orbit.angle);
  const z = orbit.semiMinorAxis * Math.sin(orbit.angle);

  // 创建位置向量
  const position = new THREE.Vector3(x, 0, z);

  // 应用轨道倾角（绕X轴旋转）
  position.applyAxisAngle(new THREE.Vector3(1, 0, 0), orbit.inclination);

  // 应用轨道旋转（绕Y轴旋转）
  position.applyAxisAngle(new THREE.Vector3(0, 1, 0), orbit.rotation);

  return position;
}

/**
 * 更新所有粒子位置
 */
export function updateAtomicPositions(
  orbits: AtomicOrbit[],
  positions: Float32Array,
  delta: number
): void {
  for (let i = 0; i < orbits.length; i++) {
    const orbit = orbits[i];

    // 更新角度
    orbit.angle += orbit.angularSpeed * delta;

    // 计算新位置
    const pos = calculateOrbitPosition(orbit);

    // 写入位置数组
    positions[i * 3] = pos.x;
    positions[i * 3 + 1] = pos.y;
    positions[i * 3 + 2] = pos.z;
  }
}

/**
 * 生成原子形态的初始位置
 */
export function generateAtomicShape(particleCount: number): Float32Array {
  const positions = new Float32Array(particleCount * 3);
  const orbits = generateAtomicOrbits(particleCount);

  for (let i = 0; i < particleCount; i++) {
    const pos = calculateOrbitPosition(orbits[i]);
    positions[i * 3] = pos.x;
    positions[i * 3 + 1] = pos.y;
    positions[i * 3 + 2] = pos.z;
  }

  return positions;
}

// === 连线系统 ===

export interface AtomicConnection {
  indexA: number;
  indexB: number;
  distance: number;
  lineWidth: number;
  opacity: number;
  colorA: THREE.Color;
  colorB: THREE.Color;
}

/**
 * 初始化固定的粒子对连接（保留接口兼容性，但不再使用）
 */
export function initFixedAtomicPairs(
  _particleCount: number,
  _maxPairs: number = 80
): void {
  // 不再使用固定对，改为动态检测
}

/**
 * 重置固定粒子对（保留接口兼容性）
 */
export function resetFixedAtomicPairs(): void {
  // 不再使用固定对
}

/**
 * 动态计算所有粒子与周围邻居的连线
 * 每帧调用，检测每个粒子周围 maxDistance 范围内的所有粒子
 */
export function calculateAtomicConnections(
  positions: Float32Array,
  orbits: AtomicOrbit[],
  maxDistance: number = ATOMIC_CONFIG.LINE_MAX_DISTANCE,
  _maxConnections: number = 200
): AtomicConnection[] {
  const connections: AtomicConnection[] = [];
  const particleCount = positions.length / 3;
  const maxDistanceSq = maxDistance * maxDistance; // 使用距离平方

  // 遍历所有粒子对，检测距离在 maxDistance 范围内的
  for (let i = 0; i < particleCount; i++) {
    for (let j = i + 1; j < particleCount; j++) {
      const dx = positions[i * 3] - positions[j * 3];
      const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
      const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
      const distSq = dx * dx + dy * dy + dz * dz;

      // 只有在 maxDistance 范围内才显示连线（使用平方比较避免开方）
      if (distSq < maxDistanceSq) {
        const dist = Math.sqrt(distSq); // 仅在需要时开方

        // 归一化距离：0 = 最近（最粗），1 = 最远（最细）
        const normalizedDist = dist / maxDistance;

        // 距离越近，线条越粗（线性变化）
        const lineWidth =
          ATOMIC_CONFIG.LINE_MIN_WIDTH +
          (ATOMIC_CONFIG.LINE_MAX_WIDTH - ATOMIC_CONFIG.LINE_MIN_WIDTH) *
            (1 - normalizedDist);

        // 距离越近，透明度越高（线性变化）
        const opacity =
          ATOMIC_CONFIG.LINE_BASE_OPACITY * (1 - normalizedDist * 0.8);

        // 获取两个粒子的颜色
        const hueA = orbits[i]?.colorHue ?? ATOMIC_CONFIG.HUE_START;
        const hueB = orbits[j]?.colorHue ?? ATOMIC_CONFIG.HUE_START;

        const colorA = new THREE.Color().setHSL(hueA / 360, 0.7, 0.6);
        const colorB = new THREE.Color().setHSL(hueB / 360, 0.7, 0.6);

        connections.push({
          indexA: i,
          indexB: j,
          distance: dist,
          lineWidth,
          opacity,
          colorA,
          colorB,
        });
      }
    }
  }

  return connections;
}

/**
 * 获取粒子颜色（用于视觉一致性）
 */
export function getAtomicParticleColor(orbit: AtomicOrbit): THREE.Color {
  return new THREE.Color().setHSL(orbit.colorHue / 360, 0.75, 0.65);
}

/**
 * 获取所有粒子的颜色数组
 */
export function generateAtomicColors(orbits: AtomicOrbit[]): Float32Array {
  const colors = new Float32Array(orbits.length * 3);

  for (let i = 0; i < orbits.length; i++) {
    const color = getAtomicParticleColor(orbits[i]);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  return colors;
}
