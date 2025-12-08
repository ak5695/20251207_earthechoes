"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UseMusicReturn {
  isMusicPlaying: boolean;
  isMusicLoading: boolean;
  isMuted: boolean;
  musicVolume: number;
  toggleMusic: () => void;
  toggleMute: () => void;
  setMusicVolume: (volume: number) => void;
  startMusic: () => void;
}

export function useMusic(
  audioSrc: string = "/ambient-music-compressed.mp3"
): UseMusicReturn {
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.3);
  const [isMusicLoading, setIsMusicLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 初始化音频
  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audio.volume = 0.3;
    audioRef.current = audio;
    audio.preload = "auto";

    const handleError = (e: Event) => {
      console.log("音频错误:", e, audio.error);
      setIsMusicLoading(false);
    };

    const handlePlaying = () => {
      console.log("音频播放中, 音量:", audio.volume);
      audio.volume = 0.3;
      setIsMusicLoading(false);
      setIsMusicPlaying(true);
    };

    const handlePause = () => {
      setIsMusicPlaying(false);
    };

    const handleCanPlayThrough = () => {
      console.log("音频可以播放");
      setIsMusicLoading(false);
    };

    audio.addEventListener("error", handleError);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("canplaythrough", handleCanPlayThrough);

    audio.src = audioSrc;

    return () => {
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("canplaythrough", handleCanPlayThrough);
      audio.pause();
      audio.src = "";
    };
  }, [audioSrc]);

  // 更新音量
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : musicVolume;
    }
  }, [musicVolume, isMuted]);

  // 切换音乐播放
  const toggleMusic = useCallback(() => {
    if (!audioRef.current) return;

    if (isMusicPlaying) {
      audioRef.current.pause();
      setIsMusicPlaying(false);
    } else {
      setIsMusicLoading(true);
      audioRef.current.play().catch((err) => {
        console.error("播放失败:", err);
        setIsMusicLoading(false);
      });
    }
  }, [isMusicPlaying]);

  // 切换静音
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  // 开始播放音乐（用于欢迎页面确认后）
  const startMusic = useCallback(() => {
    if (audioRef.current) {
      setIsMusicLoading(true);
      audioRef.current.play().catch((err) => {
        console.log("播放失败:", err);
        setIsMusicLoading(false);
      });
    }
  }, []);

  return {
    isMusicPlaying,
    isMusicLoading,
    isMuted,
    musicVolume,
    toggleMusic,
    toggleMute,
    setMusicVolume,
    startMusic,
  };
}
