import * as THREE from "three";
import { ShapeMode } from "./types";
import {
  generateAtomicOrbit,
  calculateOrbitPosition,
  AtomicOrbit,
  ATOMIC_CONFIG,
} from "./atomicSystem";

/**
 * 计算单个粒子在特定形态下的目标位置
 * @param mode 形态模式
 * @param index 粒子索引 (全局索引)
 * @param totalCount 粒子总数 (用于归一化计算)
 * @param time 当前时间 (用于动态形态)
 * @param existingOrbit 可选的现有原子轨道数据
 */
export const calculateParticleTargetPosition = (
  mode: ShapeMode,
  index: number,
  totalCount: number,
  time: number,
  existingOrbit?: AtomicOrbit
): { position: THREE.Vector3; orbit?: AtomicOrbit } => {
  const position = new THREE.Vector3();
  let orbit: AtomicOrbit | undefined = existingOrbit;

  switch (mode) {
    case "nebula": {
      // 保持与 generateNebulaShape 一致的随机性逻辑
      // 注意：这里无法完全复现 generateNebulaShape 的随机性，因为它内部使用了 Math.random()
      // 对于新粒子，我们使用基于 index 的伪随机，以保证位置固定
      const seed = index * 123.45;
      const pseudoRandom = (offset: number) => {
        const x = Math.sin(seed + offset) * 10000;
        return x - Math.floor(x);
      };

      const r = pseudoRandom(0) * 35 + pseudoRandom(1) * 15;
      const theta = pseudoRandom(2) * Math.PI * 2 * 3;

      position.x = r * Math.cos(theta);
      position.y = (pseudoRandom(3) - 0.5) * 8;
      position.z = r * Math.sin(theta);
      break;
    }

    case "river": {
      // 沿着曲线分布
      // 扩展 index 以支持无限延伸
      // 使用取模让新粒子循环分布在河流中，或者让它们延伸河流
      // 这里选择延伸河流，但为了避免太远，可以循环
      const effectiveIndex = index % 300; // 假设最大循环周期
      const effectiveTotal = 300;

      const t = (effectiveIndex / effectiveTotal) * Math.PI * 2;

      const mainX = t * 15 - 15 * Math.PI;
      const mainY = Math.sin(t * 2) * 12;
      const mainZ = Math.cos(t * 1.5) * 8;

      // 宽度和随机偏移 (基于 index 的伪随机)
      const width = 3 + Math.sin(t * 3) * 1.5;
      const seed = index * 789.12;
      const pseudoRandom = (offset: number) => {
        const x = Math.sin(seed + offset) * 10000;
        return x - Math.floor(x);
      };

      const offsetX = (pseudoRandom(0) - 0.5) * width;
      const offsetY = (pseudoRandom(1) - 0.5) * width * 0.5;
      const offsetZ = (pseudoRandom(2) - 0.5) * width;

      position.set(mainX + offsetX, mainY + offsetY, mainZ + offsetZ);

      // 加上流动偏移
      // 注意：这里只计算静态基准位置，流动在 animate 中处理
      break;
    }

    case "wave": {
      const rows = 20;
      // 动态计算列数，保持密度一致
      const cols = Math.ceil(totalCount / rows);

      const row = Math.floor(index / cols);
      const col = index % cols;

      // 扩展网格
      // 如果 index 很大，row 会增加，z 轴会向后延伸
      // 为了避免无限延伸，可以循环映射到固定区域
      const mappedIndex = index % (rows * 20); // 假设 400 个网格点
      const mappedCols = 20;
      const mappedRow = Math.floor(mappedIndex / mappedCols);
      const mappedCol = mappedIndex % mappedCols;

      const x = (mappedCol / mappedCols) * 80 - 40;
      const z = (mappedRow / rows) * 30 - 15;

      // 波浪高度计算
      const wave1 = Math.sin((x * 0.15 + time * 0.5) * Math.PI) * 6;
      const wave2 = Math.sin((x * 0.08 + z * 0.1 + time * 0.3) * Math.PI) * 4;
      const wave3 = Math.cos((z * 0.2 + time * 0.7) * Math.PI) * 3;
      const y = wave1 + wave2 + wave3;

      // 随机偏移
      const seed = index * 456.78;
      const pseudoRandom = (offset: number) => {
        const x = Math.sin(seed + offset) * 10000;
        return x - Math.floor(x);
      };

      position.set(
        x + (pseudoRandom(0) - 0.5) * 1,
        y + (pseudoRandom(1) - 0.5) * 0.5,
        z + (pseudoRandom(2) - 0.5) * 1
      );
      break;
    }

    case "atomic": {
      // 如果没有轨道数据，生成一个新的
      if (!orbit) {
        orbit = generateAtomicOrbit(index, totalCount);
      }

      // 计算轨道位置
      // 注意：这里需要传入当前的 delta 时间来更新 angle，或者基于总时间计算 angle
      // 为了简化，我们假设 orbit.angle 已经在外部更新，或者我们基于 time 计算
      // 但 generateAtomicOrbit 返回的 angle 是初始值
      // 我们需要一种方式来保持连续运动。
      // 在这里，我们只计算基于当前 orbit.angle 的位置
      // 外部循环负责更新 orbit.angle

      const pos = calculateOrbitPosition(orbit);
      position.copy(pos);
      break;
    }
  }

  return { position, orbit };
};
