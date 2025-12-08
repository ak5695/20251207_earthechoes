import type { StoredParticle } from "./types";

// LocalStorage 键名
const STORAGE_KEY = "earthechoes_particles";

/**
 * 保存粒子到 LocalStorage
 * 只保留最近100个用户贡献的粒子
 */
export const saveParticlesToStorage = (particles: StoredParticle[]): void => {
  try {
    const recentParticles = particles.slice(-100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recentParticles));
  } catch (e) {
    console.warn("无法保存粒子到 LocalStorage:", e);
  }
};

/**
 * 从 LocalStorage 加载粒子
 */
export const loadParticlesFromStorage = (): StoredParticle[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn("无法从 LocalStorage 加载粒子:", e);
  }
  return [];
};

/**
 * 添加单个粒子到存储
 */
export const addParticleToStorage = (particle: StoredParticle): void => {
  const particles = loadParticlesFromStorage();
  particles.push(particle);
  saveParticlesToStorage(particles);
};

/**
 * 清除所有存储的粒子
 */
export const clearParticlesFromStorage = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn("无法清除 LocalStorage:", e);
  }
};
