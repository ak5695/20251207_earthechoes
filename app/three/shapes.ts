/**
 * 形态生成器 - 用于生成不同形态的粒子位置
 */

/**
 * 生成星云形态位置（螺旋形）
 */
export const generateNebulaShape = (particleCount: number): Float32Array => {
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const r = Math.random() * 35 + Math.random() * 15;
    const theta = Math.random() * Math.PI * 2 * 3;
    positions[i * 3] = r * Math.cos(theta);
    positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
    positions[i * 3 + 2] = r * Math.sin(theta);
  }
  return positions;
};

/**
 * 生成星河形态位置（弯曲的S形河流）
 */
export const generateRiverShape = (particleCount: number): Float32Array => {
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    // 沿着曲线分布
    const t = (i / particleCount) * Math.PI * 2; // 0 到 2π
    // S形曲线
    const mainX = t * 15 - 15 * Math.PI; // 展开宽度
    const mainY = Math.sin(t * 2) * 12; // S形弯曲
    const mainZ = Math.cos(t * 1.5) * 8; // 前后起伏

    // 添加河流宽度和随机性
    const width = 3 + Math.sin(t * 3) * 1.5; // 河流宽度变化
    const offsetX = (Math.random() - 0.5) * width;
    const offsetY = (Math.random() - 0.5) * width * 0.5;
    const offsetZ = (Math.random() - 0.5) * width;

    positions[i * 3] = mainX + offsetX;
    positions[i * 3 + 1] = mainY + offsetY;
    positions[i * 3 + 2] = mainZ + offsetZ;
  }
  return positions;
};

/**
 * 生成音乐波形态位置
 */
export const generateWaveShape = (
  particleCount: number,
  time: number = 0
): Float32Array => {
  const positions = new Float32Array(particleCount * 3);
  const rows = 20;
  const cols = Math.ceil(particleCount / rows);

  for (let i = 0; i < particleCount; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;

    const x = (col / cols) * 80 - 40; // -40 到 40
    const z = (row / rows) * 30 - 15; // -15 到 15

    // 多层波浪叠加
    const wave1 = Math.sin((x * 0.15 + time * 0.5) * Math.PI) * 6;
    const wave2 = Math.sin((x * 0.08 + z * 0.1 + time * 0.3) * Math.PI) * 4;
    const wave3 = Math.cos((z * 0.2 + time * 0.7) * Math.PI) * 3;
    const y = wave1 + wave2 + wave3;

    // 添加一些随机性
    positions[i * 3] = x + (Math.random() - 0.5) * 1;
    positions[i * 3 + 1] = y + (Math.random() - 0.5) * 0.5;
    positions[i * 3 + 2] = z + (Math.random() - 0.5) * 1;
  }
  return positions;
};

/**
 * 生成漂浮形态位置（随机分布）
 */
export const generateFloatShape = (particleCount: number): Float32Array => {
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    // 随机分布在空间中
    positions[i * 3] = (Math.random() - 0.5) * 100; // X: -50 到 50
    positions[i * 3 + 1] = (Math.random() - 0.5) * 60; // Y: -30 到 30
    positions[i * 3 + 2] = (Math.random() - 0.5) * 100; // Z: -50 到 50
  }
  return positions;
};

// 导出原子模型形态生成器
export { generateAtomicShape } from "./atomicSystem";
