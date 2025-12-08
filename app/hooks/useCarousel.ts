"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  ContributedParticle,
  ThreeSceneHandle,
} from "../components/ThreeScene";

interface UseCarouselOptions {
  displayTime?: number; // 显示时间（秒）
  fadeOutDuration?: number; // 淡出时间（秒）
  waitDuration?: number; // 等待时间（秒）
  initialDelay?: number; // 初始延迟（秒）
}

interface UseCarouselReturn {
  carouselParticle: ContributedParticle | null;
  isCarouselVisible: boolean;
  isCarouselFading: boolean;
  isCarouselHovered: boolean;
  carouselPausedUntil: number;
  setCarouselParticle: (particle: ContributedParticle | null) => void;
  setIsCarouselVisible: (visible: boolean) => void;
  setIsCarouselFading: (fading: boolean) => void;
  setIsCarouselHovered: (hovered: boolean) => void;
  setCarouselPausedUntil: (timestamp: number) => void;
  pauseCarousel: (duration?: number) => void;
  resumeCarousel: () => void;
  hideCarouselWithFade: () => void;
}

export function useCarousel(
  threeSceneRef: React.RefObject<ThreeSceneHandle | null>,
  selectedParticle: ContributedParticle | null,
  options: UseCarouselOptions = {}
): UseCarouselReturn {
  const {
    displayTime = 5,
    fadeOutDuration = 2,
    waitDuration = 2,
    initialDelay = 2,
  } = options;

  const [carouselParticle, setCarouselParticle] =
    useState<ContributedParticle | null>(null);
  const [isCarouselVisible, setIsCarouselVisible] = useState(false);
  const [isCarouselFading, setIsCarouselFading] = useState(false);
  const [carouselPausedUntil, setCarouselPausedUntil] = useState(0);
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);

  const carouselTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 轮播逻辑
  useEffect(() => {
    let fadeOutTimer: NodeJS.Timeout | null = null;
    let hideTimer: NodeJS.Timeout | null = null;

    const showNextCard = async () => {
      // 如果用户已选中卡片，跳过轮播
      if (selectedParticle) {
        return;
      }

      // 检查是否在暂停期间
      if (Date.now() < carouselPausedUntil) {
        return;
      }

      // 如果鼠标悬浮在卡片上，跳过本次轮播
      if (isCarouselHovered) {
        return;
      }

      // 如果正在形态切换，跳过本次轮播
      if (threeSceneRef.current?.isShapeTransitioning?.()) {
        return;
      }

      if (threeSceneRef.current) {
        const particle = threeSceneRef.current.getRandomNebulaParticle();
        if (particle) {
          setCarouselParticle(particle);
          setIsCarouselVisible(true);
          setIsCarouselFading(false);

          // 显示时间后开始淡出
          fadeOutTimer = setTimeout(() => {
            if (isCarouselHovered) {
              return;
            }
            setIsCarouselFading(true);
            hideTimer = setTimeout(() => {
              setIsCarouselVisible(false);
              setIsCarouselFading(false);
            }, fadeOutDuration * 1000);
          }, displayTime * 1000);
        }
      }
    };

    // 初始延迟后开始
    const initialDelayTimer = setTimeout(() => {
      showNextCard();
      carouselTimerRef.current = setInterval(
        showNextCard,
        (displayTime + fadeOutDuration + waitDuration) * 1000
      );
    }, initialDelay * 1000);

    return () => {
      clearTimeout(initialDelayTimer);
      if (fadeOutTimer) clearTimeout(fadeOutTimer);
      if (hideTimer) clearTimeout(hideTimer);
      if (carouselTimerRef.current) {
        clearInterval(carouselTimerRef.current);
      }
    };
  }, [
    displayTime,
    fadeOutDuration,
    waitDuration,
    initialDelay,
    carouselPausedUntil,
    selectedParticle,
    isCarouselHovered,
    threeSceneRef,
  ]);

  // 暂停轮播
  const pauseCarousel = useCallback((duration: number = 5000) => {
    setCarouselPausedUntil(Date.now() + duration);
  }, []);

  // 恢复轮播
  const resumeCarousel = useCallback(() => {
    setCarouselPausedUntil(0);
  }, []);

  // 带淡出效果隐藏轮播
  const hideCarouselWithFade = useCallback(() => {
    setIsCarouselFading(true);
    setTimeout(() => {
      setIsCarouselVisible(false);
      setIsCarouselFading(false);
      setCarouselParticle(null);
    }, 500);
  }, []);

  return {
    carouselParticle,
    isCarouselVisible,
    isCarouselFading,
    isCarouselHovered,
    carouselPausedUntil,
    setCarouselParticle,
    setIsCarouselVisible,
    setIsCarouselFading,
    setIsCarouselHovered,
    setCarouselPausedUntil,
    pauseCarousel,
    resumeCarousel,
    hideCarouselWithFade,
  };
}
