"use client";

import React, { useEffect, useState } from "react";

interface LoadingScreenProps {
  onFinished?: () => void;
  isReady?: boolean;
}

export default function LoadingScreen({
  onFinished,
  isReady = false,
}: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [text, setText] = useState("INITIALIZING SYSTEM");

  useEffect(() => {
    // 模拟加载进度
    const interval = setInterval(() => {
      setProgress((prev) => {
        // 如果外部未准备好，进度条卡在 90%
        if (!isReady && prev >= 90) {
          return 90;
        }
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        // 随机增加进度，模拟真实加载
        const increment = Math.random() * 15;
        return Math.min(prev + increment, 100);
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isReady]);

  // 当 isReady 变为 true 时，快速完成进度
  useEffect(() => {
    if (isReady) {
      setProgress(100);
    }
  }, [isReady]);

  useEffect(() => {
    if (progress < 30) setText("CONNECTING TO COSMOS...");
    else if (progress < 60) setText("GATHERING STARLIGHT...");
    else if (progress < 90) setText("SYNCHRONIZING ECHOES...");
    else setText("SYSTEM READY");

    if (progress === 100) {
      setTimeout(() => {
        setOpacity(0);
        setTimeout(() => {
          onFinished?.();
        }, 1000); // 等待淡出动画完成
      }, 500);
    }
  }, [progress, onFinished]);

  if (opacity === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950 text-white transition-opacity duration-1000"
      style={{ opacity }}
    >
      {/* 核心动画：脉冲星球 */}
      <div className="relative mb-12">
        <div className="absolute inset-0 animate-ping rounded-full bg-indigo-500 opacity-20 blur-xl"></div>
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-slate-900 shadow-[0_0_50px_rgba(99,102,241,0.3)]">
          <div className="h-20 w-20 animate-pulse rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 opacity-80 blur-sm"></div>
          <div className="absolute h-16 w-16 rounded-full bg-slate-950"></div>
          <div className="absolute h-1 w-1 rounded-full bg-white shadow-[0_0_10px_white]"></div>
        </div>

        {/* 轨道环 */}
        <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 animate-[spin_3s_linear_infinite] rounded-full border border-indigo-500/30 border-t-transparent"></div>
        <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 animate-[spin_5s_linear_infinite_reverse] rounded-full border border-purple-500/20 border-b-transparent"></div>
      </div>

      {/* 进度条 */}
      <div className="relative h-1 w-64 overflow-hidden rounded-full bg-slate-800">
        <div
          className="absolute h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* 状态文本 */}
      <div className="mt-4 font-mono text-xs tracking-[0.2em] text-indigo-300/80">
        {text} <span className="animate-pulse">_</span>
      </div>

      {/* 进度百分比 */}
      <div className="absolute bottom-12 font-mono text-4xl font-bold text-slate-800">
        {Math.floor(progress).toString().padStart(2, "0")}
      </div>
    </div>
  );
}
