import * as THREE from "three";

// 缓存纹理避免重复创建
let glowTexture: THREE.CanvasTexture | null = null;
let nebulaTexture: THREE.CanvasTexture | null = null;

/**
 * 创建发光纹理（用于飞行粒子 - 更亮更实心）
 */
export const createGlowTexture = (): THREE.CanvasTexture => {
  if (glowTexture) return glowTexture;

  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");

  if (context) {
    // 清除画布
    context.clearRect(0, 0, 128, 128);

    // 外层光晕
    const outerGlow = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    outerGlow.addColorStop(0, "rgba(255,255,255,1)");
    outerGlow.addColorStop(0.15, "rgba(255,255,255,1)");
    outerGlow.addColorStop(0.3, "rgba(255,255,255,0.9)");
    outerGlow.addColorStop(0.5, "rgba(255,255,255,0.5)");
    outerGlow.addColorStop(0.7, "rgba(255,255,255,0.2)");
    outerGlow.addColorStop(0.85, "rgba(255,255,255,0.05)");
    outerGlow.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = outerGlow;
    context.fillRect(0, 0, 128, 128);

    // 中心亮点（叠加一层更亮的中心）
    const centerGlow = context.createRadialGradient(64, 64, 0, 64, 64, 20);
    centerGlow.addColorStop(0, "rgba(255,255,255,1)");
    centerGlow.addColorStop(0.5, "rgba(255,255,255,0.8)");
    centerGlow.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = centerGlow;
    context.fillRect(0, 0, 128, 128);
  }

  glowTexture = new THREE.CanvasTexture(canvas);
  return glowTexture;
};

/**
 * 创建星云专用纹理（实心发光，中心实心，边缘柔和发光）
 */
export const createNebulaTexture = (): THREE.CanvasTexture => {
  if (nebulaTexture) return nebulaTexture;

  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");

  if (context) {
    // 清除画布
    context.clearRect(0, 0, 128, 128);

    // 实心圆点 - 更大的实心区域，更清晰的边界
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 48);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.5, "rgba(255,255,255,1)"); // 50%实心区域
    gradient.addColorStop(0.6, "rgba(255,255,255,0.95)");
    gradient.addColorStop(0.7, "rgba(255,255,255,0.7)");
    gradient.addColorStop(0.8, "rgba(255,255,255,0.3)");
    gradient.addColorStop(0.9, "rgba(255,255,255,0.1)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  }

  nebulaTexture = new THREE.CanvasTexture(canvas);
  return nebulaTexture;
};

/**
 * 清除纹理缓存（用于组件卸载时）
 */
export const clearTextureCache = (): void => {
  if (glowTexture) {
    glowTexture.dispose();
    glowTexture = null;
  }
  if (nebulaTexture) {
    nebulaTexture.dispose();
    nebulaTexture = null;
  }
};
