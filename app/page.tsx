"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Send, Globe, X, ChevronDown } from "lucide-react";
import dynamic from "next/dynamic";

// 多语言翻译
type Language = "zh" | "en" | "ja" | "ko" | "fr" | "es";

const translations: Record<
  Language,
  {
    welcomeTitle: string;
    welcomeText1: string;
    welcomeText2: string;
    startButton: string;
    nextEchoIn: string;
    inputPlaceholder: string;
    clickToClose: string;
    voiceFromNebula: string;
    languageNames: Record<Language, string>;
  }
> = {
  zh: {
    welcomeTitle: "欢迎来到 Earth Echoes",
    welcomeText1: "我们来自星辰，也终归于星辰，做这宇宙旋律的音符。",
    welcomeText2: "你在这留下的情绪表达，将会汇聚成一首音乐，回荡在这空间里。",
    startButton: "开始体验",
    nextEchoIn: "下次回响",
    inputPlaceholder: "在这里留下你的心情...",
    clickToClose: "点击空白处关闭",
    voiceFromNebula: "来自星云的声音",
    languageNames: {
      zh: "中文",
      en: "English",
      ja: "日本語",
      ko: "한국어",
      fr: "Français",
      es: "Español",
    },
  },
  en: {
    welcomeTitle: "Welcome to Earth Echoes",
    welcomeText1:
      "We come from the stars, and to the stars we shall return, as notes in the cosmic melody.",
    welcomeText2:
      "The emotions you leave here will converge into music, echoing through this space.",
    startButton: "Start Experience",
    nextEchoIn: "Next Echo In",
    inputPlaceholder: "Leave your vibe here...",
    clickToClose: "Click outside to close",
    voiceFromNebula: "Voice from the nebula",
    languageNames: {
      zh: "中文",
      en: "English",
      ja: "日本語",
      ko: "한국어",
      fr: "Français",
      es: "Español",
    },
  },
  ja: {
    welcomeTitle: "Earth Echoes へようこそ",
    welcomeText1:
      "私たちは星から来て、星へと帰る。宇宙のメロディーの音符として。",
    welcomeText2:
      "ここに残すあなたの感情は、音楽となってこの空間に響き渡ります。",
    startButton: "体験を始める",
    nextEchoIn: "次のエコーまで",
    inputPlaceholder: "あなたの気持ちを残して...",
    clickToClose: "外側をクリックして閉じる",
    voiceFromNebula: "星雲からの声",
    languageNames: {
      zh: "中文",
      en: "English",
      ja: "日本語",
      ko: "한국어",
      fr: "Français",
      es: "Español",
    },
  },
  ko: {
    welcomeTitle: "Earth Echoes에 오신 것을 환영합니다",
    welcomeText1:
      "우리는 별에서 왔고, 별로 돌아갑니다. 우주 멜로디의 음표로서.",
    welcomeText2:
      "여기에 남기는 당신의 감정은 음악이 되어 이 공간에 울려 퍼집니다.",
    startButton: "시작하기",
    nextEchoIn: "다음 에코까지",
    inputPlaceholder: "당신의 기분을 남겨주세요...",
    clickToClose: "바깥을 클릭하여 닫기",
    voiceFromNebula: "성운에서 온 목소리",
    languageNames: {
      zh: "中文",
      en: "English",
      ja: "日本語",
      ko: "한국어",
      fr: "Français",
      es: "Español",
    },
  },
  fr: {
    welcomeTitle: "Bienvenue sur Earth Echoes",
    welcomeText1:
      "Nous venons des étoiles et retournons aux étoiles, comme des notes dans la mélodie cosmique.",
    welcomeText2:
      "Les émotions que vous laissez ici se transformeront en musique, résonnant dans cet espace.",
    startButton: "Commencer",
    nextEchoIn: "Prochain Écho",
    inputPlaceholder: "Laissez votre humeur ici...",
    clickToClose: "Cliquez à l'extérieur pour fermer",
    voiceFromNebula: "Voix de la nébuleuse",
    languageNames: {
      zh: "中文",
      en: "English",
      ja: "日本語",
      ko: "한국어",
      fr: "Français",
      es: "Español",
    },
  },
  es: {
    welcomeTitle: "Bienvenido a Earth Echoes",
    welcomeText1:
      "Venimos de las estrellas y a las estrellas volveremos, como notas en la melodía cósmica.",
    welcomeText2:
      "Las emociones que dejes aquí se convertirán en música, resonando en este espacio.",
    startButton: "Comenzar",
    nextEchoIn: "Próximo Eco En",
    inputPlaceholder: "Deja tu estado de ánimo aquí...",
    clickToClose: "Haz clic afuera para cerrar",
    voiceFromNebula: "Voz de la nebulosa",
    languageNames: {
      zh: "中文",
      en: "English",
      ja: "日本語",
      ko: "한국어",
      fr: "Français",
      es: "Español",
    },
  },
};
import type {
  ThreeSceneHandle,
  AnimationParams,
  ContributedParticle,
} from "./components/ThreeScene";

// 动态导入 Three.js 组件，禁用 SSR
import React from "react";
const ThreeScene = dynamic(() => import("./components/ThreeScene"), {
  ssr: false,
});
const ThreeSceneMemo = React.memo(ThreeScene);

// 动态导入 lil-gui
const loadGUI = () => import("lil-gui").then((mod) => mod.default);

type ContributionState = "idle" | "condensing" | "pulsing" | "launched";

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [timeLeft, setTimeLeft] = useState("");
  const [contributionState, setContributionState] =
    useState<ContributionState>("idle");
  const [isClient, setIsClient] = useState(false);
  const [selectedParticle, setSelectedParticle] =
    useState<ContributedParticle | null>(null);
  const [isCardClosing, setIsCardClosing] = useState(false); // 卡片关闭动画状态
  const [carouselParticle, setCarouselParticle] =
    useState<ContributedParticle | null>(null); // 轮播卡片
  const [isCarouselVisible, setIsCarouselVisible] = useState(false); // 轮播卡片可见性
  const [isCarouselFading, setIsCarouselFading] = useState(false); // 轮播卡片淡出动画
  const [carouselDisplayTime, setCarouselDisplayTime] = useState(5); // 轮播显示时间（秒）
  const [carouselPausedUntil, setCarouselPausedUntil] = useState(0); // 轮播暂停直到此时间戳
  const [pendingText, setPendingText] = useState("");
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.3);
  const [isMusicLoading, setIsMusicLoading] = useState(false);
  const [floatAmplitude, setFloatAmplitude] = useState(0.3); // 浮动速度 0.1-2，默认0.3
  const [showWelcome, setShowWelcome] = useState(true); // 欢迎弹窗
  const [language, setLanguage] = useState<Language>("zh"); // 当前语言
  const [showLangMenu, setShowLangMenu] = useState(false); // 语言选择菜单
  const [particleLinePos, setParticleLinePos] = useState<{
    x: number;
    y: number;
  } | null>(null); // 粒子连线位置

  // 获取当前翻译
  const t = translations[language];

  const inputRef = useRef<HTMLInputElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const threeSceneRef = useRef<ThreeSceneHandle>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const guiRef = useRef<InstanceType<
    Awaited<ReturnType<typeof loadGUI>>
  > | null>(null);
  const carouselTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null); // 卡片 ref 用于连线

  // Animation Params - 更新后的参数结构
  const paramsRef = useRef<AnimationParams>({
    // 坍缩动画
    collapseDuration: 1000,

    // 脉冲
    pulseDuration: 1500,
    pulseScale: 0.3,

    // 随机漂移（三次贝塞尔曲线）
    wanderDuration: 10000,
    wanderCurveCount: 4,
    wanderRadius: 46.8,
    wanderSpeedVariation: 0.3,

    // 飞向星云
    flightDuration: 2.0,
    flightCurve: 80,

    // 粒子外观
    particleSize: 1,
    particleGlow: 6.576,
    trailLength: 30,
    trailOpacity: 0.8011, // 截图中的值

    // 星云
    nebulaSpeed: 0.0008,
    nebulaParticleCount: 500,
    nebulaScale: 1.0,
    nebulaBrightness: 2.0,
    nebulaParticleOpacity: 1.0, // 保持最高不透明度

    // 进入星云后闪烁
    settleBlinkDuration: 5,
    settleBlinkSpeed: 1.369, // 截图中的值
    settleBlinkAmplitude: 1, // 截图中的值

    // 摄像头位置（初始）
    cameraX: 0,
    cameraY: 0,
    cameraZ: 30,

    // 摄像头动画目标位置
    cameraTargetX: 0,
    cameraTargetY: 50,
    cameraTargetZ: 80,
    cameraPanDuration: 2.0, // 摄像头滑动时间（秒）
  });

  // Client-side check
  useEffect(() => {
    setIsClient(true);
  }, []);

  // --- 背景音乐初始化 ---
  useEffect(() => {
    if (!isClient) return;

    // 创建音频元素
    const audio = new Audio();
    audio.loop = true;
    audio.volume = 0.3; // 固定初始音量
    audioRef.current = audio;

    // 使用 preload="metadata" 让浏览器获取音频信息
    audio.preload = "metadata";

    const handleError = (e: Event) => {
      console.log("音频错误:", e, audio.error);
      setIsMusicLoading(false);
    };

    const handlePlaying = () => {
      console.log("音频播放中, 音量:", audio.volume);
      // 确保音量设置正确
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

    // 设置音频源
    audio.src = "/relax-meditation-music-424572.mp3";

    return () => {
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("canplaythrough", handleCanPlayThrough);
      audio.pause();
      audio.src = "";
    };
  }, [isClient]);

  // 更新音量
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : musicVolume;
    }
  }, [musicVolume, isMuted]);

  // 音乐控制函数
  const toggleMusic = useCallback(() => {
    if (!audioRef.current) return;

    if (isMusicPlaying) {
      audioRef.current.pause();
      setIsMusicPlaying(false);
    } else {
      // 开始加载并播放
      setIsMusicLoading(true);
      audioRef.current.play().catch((err) => {
        console.error("播放失败:", err);
        setIsMusicLoading(false);
      });
    }
  }, [isMusicPlaying]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  // --- GUI Setup ---
  // 🔧 调试面板开关：设为 true 显示，false 隐藏
  const SHOW_DEBUG_GUI = true;

  useEffect(() => {
    if (!isClient || !SHOW_DEBUG_GUI) return;

    loadGUI().then((GUI) => {
      const gui = new GUI({ title: "✨ 粒子动画控制" });
      guiRef.current = gui;
      const p = paramsRef.current;

      // 坍缩动画文件夹
      const folderCollapse = gui.addFolder("📦 坍缩动画");
      folderCollapse
        .add(p, "collapseDuration", 200, 2000)
        .name("坍缩时间 (ms)");
      folderCollapse.close();

      // 脉冲动画文件夹
      const folderPulse = gui.addFolder("💫 脉冲效果");
      folderPulse.add(p, "pulseDuration", 500, 3000).name("脉冲时间 (ms)");
      folderPulse.add(p, "pulseScale", 0.1, 1).name("脉冲幅度");
      folderPulse.close();

      // 漂移动画文件夹
      const folderWander = gui.addFolder("🌊 随机漂移");
      folderWander
        .add(p, "wanderDuration", 1000, 30000)
        .name("漂移总时间 (ms)");
      folderWander.add(p, "wanderCurveCount", 2, 12, 1).name("曲线段数");
      folderWander.add(p, "wanderRadius", 5, 100).name("漂移半径");
      folderWander.add(p, "wanderSpeedVariation", 0, 1).name("速度变化");
      folderWander.close();

      // 飞行动画文件夹
      const folderFlight = gui.addFolder("🚀 飞向星云");
      folderFlight.add(p, "flightDuration", 0.5, 5).name("飞行时间 (s)");
      folderFlight.add(p, "flightCurve", 10, 80).name("曲线弯曲度");
      folderFlight.close();

      // 粒子外观文件夹
      const folderParticle = gui.addFolder("✨ 粒子外观");
      folderParticle.add(p, "particleSize", 0.2, 2).name("粒子大小");
      folderParticle.add(p, "particleGlow", 2, 15).name("光晕大小");
      folderParticle.add(p, "trailLength", 10, 60).name("拖尾长度");
      folderParticle.add(p, "trailOpacity", 0.1, 1).name("拖尾透明度");
      folderParticle.close();

      // 星云设置
      const folderNebula = gui.addFolder("🌌 星云");
      folderNebula.add(p, "nebulaSpeed", 0, 0.005).name("旋转速度");
      folderNebula.add(p, "nebulaScale", 0.5, 3).name("星云大小");
      folderNebula.add(p, "nebulaBrightness", 0, 5).name("星云亮度");
      folderNebula.add(p, "nebulaParticleOpacity", 0, 1).name("粒子不透明度");
      folderNebula.close();

      // 新粒子进入星云后效果
      const folderSettle = gui.addFolder("✨ 新粒子闪烁");
      folderSettle.add(p, "settleBlinkDuration", 1, 10).name("闪烁时间 (s)");
      folderSettle.add(p, "settleBlinkSpeed", 1, 10).name("闪烁速度");
      folderSettle.add(p, "settleBlinkAmplitude", 0, 10).name("闪烁幅度");
      folderSettle.close();

      // 摄像头位置（初始）
      const folderCamera = gui.addFolder("📷 摄像头初始位置");
      folderCamera.add(p, "cameraX", -100, 100).name("X 位置");
      folderCamera.add(p, "cameraY", -100, 100).name("Y 位置");
      folderCamera.add(p, "cameraZ", 20, 200).name("Z 位置");
      folderCamera.close();

      // 摄像头动画目标
      const folderCameraAnim = gui.addFolder("🎬 摄像头动画");
      folderCameraAnim.add(p, "cameraTargetX", -100, 100).name("目标 X");
      folderCameraAnim.add(p, "cameraTargetY", -100, 100).name("目标 Y");
      folderCameraAnim.add(p, "cameraTargetZ", 20, 200).name("目标 Z");
      folderCameraAnim.add(p, "cameraPanDuration", 0.3, 3).name("滑动时间 (s)");
      folderCameraAnim.close();

      // UI设置
      const folderUI = gui.addFolder("🎨 UI设置");
      const uiParams = { floatSpeed: 0.3, carouselTime: 3 }; // 默认较慢
      folderUI
        .add(uiParams, "floatSpeed", 0.1, 2)
        .name("浮动速度")
        .onChange((v: number) => {
          setFloatAmplitude(v);
          document.documentElement.style.setProperty(
            "--float-amplitude",
            v.toString()
          );
        });
      folderUI
        .add(uiParams, "carouselTime", 1, 10)
        .name("轮播显示时间(s)")
        .onChange((v: number) => {
          setCarouselDisplayTime(v);
        });
      folderUI.open();

      // 监听所有变化
      gui.onChange(() => {
        if (threeSceneRef.current) threeSceneRef.current.updateParams(p);
      });
    });

    return () => {
      guiRef.current?.destroy();
    };
  }, [isClient]);

  // Timer Logic - 使用 useCallback 避免不必要的重渲染
  const updateTimer = useCallback(() => {
    const now = new Date();
    const nextCycleHour = Math.ceil((now.getUTCHours() + 1) / 8) * 8;
    const target = new Date(now);
    target.setUTCHours(nextCycleHour % 24, 0, 0, 0);
    if (nextCycleHour >= 24) target.setDate(target.getDate() + 1);

    const diff = target.getTime() - now.getTime();
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, []);

  useEffect(() => {
    // 初始设置
    setTimeLeft(updateTimer());

    const interval = setInterval(() => {
      setTimeLeft(updateTimer());
    }, 1000);

    return () => clearInterval(interval);
  }, [updateTimer]);

  // 星云心情卡片轮播
  useEffect(() => {
    if (!isClient) return;

    // 开始轮播
    const showNextCard = () => {
      // 如果用户已选中卡片，跳过轮播
      if (selectedParticle) {
        return;
      }

      // 检查是否在暂停期间
      if (Date.now() < carouselPausedUntil) {
        return;
      }

      if (threeSceneRef.current) {
        const particle = threeSceneRef.current.getRandomNebulaParticle();
        if (particle) {
          setCarouselParticle(particle);
          setIsCarouselVisible(true);
          setIsCarouselFading(false);

          // 显示时间后淡出
          setTimeout(() => {
            setIsCarouselFading(true); // 开始淡出动画
            setTimeout(() => {
              setIsCarouselVisible(false);
              setIsCarouselFading(false);
            }, 500); // 淡出动画时长
          }, carouselDisplayTime * 1000);
        }
      }
    };

    // 初始延迟2秒后开始
    const initialDelay = setTimeout(() => {
      showNextCard();
      // 轮播间隔 = 显示时间 + 2秒
      carouselTimerRef.current = setInterval(
        showNextCard,
        (carouselDisplayTime + 2) * 1000
      );
    }, 2000);

    return () => {
      clearTimeout(initialDelay);
      if (carouselTimerRef.current) {
        clearInterval(carouselTimerRef.current);
      }
    };
  }, [isClient, carouselDisplayTime, carouselPausedUntil, selectedParticle]);

  // 处理粒子点击
  const handleParticleClick = useCallback((particle: ContributedParticle) => {
    setIsCardClosing(false);
    setSelectedParticle(particle);
    // 暂停轮播5秒
    setCarouselPausedUntil(Date.now() + 5000);
    setCarouselParticle(null);
    setIsCarouselVisible(false);
  }, []);

  // 关闭卡片（带动画）
  const handleCloseCard = useCallback(() => {
    setIsCardClosing(true);
    // 关闭后再暂停5秒再恢复轮播
    setCarouselPausedUntil(Date.now() + 5000);
    setTimeout(() => {
      setSelectedParticle(null);
      setIsCardClosing(false);
    }, 250); // 与 fade-out 动画时长一致
  }, []);

  const handleContribute = async () => {
    if (!inputText.trim()) return;

    // Capture color before clearing text
    const colors = [
      "#6366f1",
      "#ec4899",
      "#06b6d4",
      "#f59e0b",
      "#8b5cf6",
      "#10b981",
    ];
    const moodColor = colors[Math.floor(Math.random() * colors.length)];

    const textToSave = inputText;
    setPendingText(textToSave);

    // 1. Condense 并触发摄像头动画
    setContributionState("condensing");
    setInputText("");

    // 同时开始摄像头滑动动画
    if (threeSceneRef.current) {
      threeSceneRef.current.animateCamera();
    }

    // Wait for collapse to finish
    setTimeout(() => {
      // 2. Pulse / Hold
      setContributionState("pulsing");

      // 等待摄像头动画完成后再发射粒子
      const cameraDuration = paramsRef.current.cameraPanDuration * 1000;
      const pulseDelay = Math.max(
        300,
        cameraDuration - paramsRef.current.collapseDuration
      );

      setTimeout(() => {
        // 3. Launch - 粒子进入星云后才恢复输入框
        if (inputContainerRef.current && threeSceneRef.current) {
          const rect = inputContainerRef.current.getBoundingClientRect();
          threeSceneRef.current.spawnProjectile(
            rect,
            moodColor,
            textToSave,
            () => {
              // 粒子进入星云的回调 - 同时开始摄像头返回动画
              if (threeSceneRef.current) {
                threeSceneRef.current.resetCamera();
              }
              setContributionState("idle");
              setPendingText("");
            }
          );
        }

        setContributionState("launched");
      }, pulseDelay);
    }, paramsRef.current.collapseDuration);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleContribute();
  };

  const getInputStyles = () => {
    const duration = paramsRef.current.collapseDuration;
    switch (contributionState) {
      case "condensing":
        return {
          className:
            "w-14 md:w-16 h-14 md:h-16 max-w-14 md:max-w-16 bg-white/60 px-0 shadow-[0_0_30px_rgba(255,255,255,0.5),inset_0_0_20px_rgba(255,255,255,0.4)] border-transparent scale-100 rounded-full",
          style: {
            transitionDuration: `${duration}ms`,
            transitionTimingFunction: "cubic-bezier(0.25, 0.1, 0.25, 1)", // 更顺滑的缓动
            transitionProperty: "all",
          },
        };
      case "pulsing":
        return {
          className:
            "w-14 md:w-16 h-14 md:h-16 max-w-14 md:max-w-16 bg-white/70 px-0 shadow-[0_0_50px_rgba(255,255,255,0.6),0_0_80px_rgba(255,255,255,0.3)] border-transparent animate-scale-pulse rounded-full",
          style: {
            transitionDuration: "150ms",
            transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
          },
        };
      case "launched":
        return {
          className:
            "w-10 md:w-12 h-10 md:h-12 max-w-10 md:max-w-12 bg-white/0 border-transparent opacity-0 scale-0 pointer-events-none blur-sm rounded-full",
          style: {
            transitionDuration: "400ms",
            transitionTimingFunction: "cubic-bezier(0.5, 0, 0.75, 0)", // 快速开始，缓慢结束
            transitionProperty: "all",
          },
        };
      case "idle":
      default:
        return {
          className:
            "max-w-xl bg-white/5 px-8 shadow-2xl border-white/10 opacity-100 scale-100 blur-0",
          style: {
            transitionDuration: "600ms",
            transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)", // 弹性缓出
            transitionProperty: "all",
          },
        };
    }
  };

  const inputStyle = getInputStyles();

  // 高亮选中的粒子或轮播粒子
  useEffect(() => {
    if (threeSceneRef.current) {
      // 优先显示手动选中的粒子，否则显示轮播粒子
      const particleToHighlight =
        selectedParticle?.id ??
        (isCarouselVisible ? carouselParticle?.id : null) ??
        null;
      threeSceneRef.current.highlightParticle(particleToHighlight);
    }
  }, [selectedParticle, carouselParticle, isCarouselVisible]);

  // 更新粒子连线位置
  useEffect(() => {
    if (!isClient) return;

    const hasActiveCard =
      selectedParticle || (carouselParticle && isCarouselVisible);
    if (!hasActiveCard) {
      setParticleLinePos(null);
      return;
    }

    // 使用 requestAnimationFrame 持续更新连线位置
    let animationId: number;
    const updateLinePosition = () => {
      if (threeSceneRef.current) {
        const pos = threeSceneRef.current.getHighlightedParticleScreenPosition();
        setParticleLinePos(pos);
      }
      animationId = requestAnimationFrame(updateLinePosition);
    };

    updateLinePosition();

    return () => {
      cancelAnimationFrame(animationId);
      setParticleLinePos(null);
    };
  }, [
    isClient,
    selectedParticle,
    carouselParticle,
    isCarouselVisible,
  ]);

  return (
    <>
      {isClient && (
        <ThreeSceneMemo
          params={paramsRef.current}
          ref={threeSceneRef}
          onParticleClick={handleParticleClick}
          selectedParticleId={selectedParticle?.id ?? null}
        />
      )}

      {/* 粒子连线 SVG */}
      {particleLinePos && cardRef.current && (
        <svg
          className="fixed inset-0 z-20 pointer-events-none"
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            <linearGradient
              id="lineGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop
                offset="0%"
                stopColor={(selectedParticle || carouselParticle)?.color || "#6366f1"}
                stopOpacity="0.8"
              />
              <stop
                offset="100%"
                stopColor={(selectedParticle || carouselParticle)?.color || "#6366f1"}
                stopOpacity="0.2"
              />
            </linearGradient>
          </defs>
          <line
            x1={particleLinePos.x}
            y1={particleLinePos.y}
            x2={cardRef.current.getBoundingClientRect().left + cardRef.current.getBoundingClientRect().width / 2}
            y2={cardRef.current.getBoundingClientRect().top}
            stroke="url(#lineGradient)"
            strokeWidth="1"
            strokeDasharray="4 4"
            className="animate-pulse"
          />
          {/* 粒子端的小圆点 */}
          <circle
            cx={particleLinePos.x}
            cy={particleLinePos.y}
            r="3"
            fill={(selectedParticle || carouselParticle)?.color || "#6366f1"}
            opacity="0.8"
          />
        </svg>
      )}

      {/* Main UI Layer */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between p-8 pointer-events-none">
        {/* Header */}
        <div className="flex justify-between items-start pointer-events-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity cursor-pointer">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 bg-cyan-500 rounded-full blur-md opacity-50 animate-pulse"></div>
                <Globe className="relative w-8 h-8 text-cyan-400" />
              </div>
              <span className="text-lg font-bold tracking-wider text-white/15">
                Earth Echoes
              </span>
            </div>

            {/* 音乐控制按钮 - 在标题旁边 */}
            <button
              onClick={toggleMusic}
              disabled={isMusicLoading}
              className={`w-10 h-10 flex items-center justify-center gap-[2px] text-indigo-300/60 hover:text-indigo-300 transition-colors ${
                !isMusicPlaying ? "wave-paused" : ""
              }`}
            >
              {isMusicLoading ? (
                <div className="w-4 h-4 border-2 border-indigo-300/60 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="wave-line wave-line-1 h-2 bg-current"></span>
                  <span className="wave-line wave-line-2 h-3 bg-current"></span>
                  <span className="wave-line wave-line-3 h-4 bg-current"></span>
                  <span className="wave-line wave-line-4 h-3 bg-current"></span>
                  <span className="wave-line wave-line-5 h-2 bg-current"></span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Center Timer */}
        <div className="absolute top-19 left-1/2 -translate-x-1/2 text-center pointer-events-none">
          <div className="text-[10px] md:text-xs font-mono text-cyan-200/15 tracking-[0.4em] uppercase mb-2">
            {t.nextEchoIn}
          </div>
          <div className="text-3xl md:text-4xl font-base tracking-widest font-mono text-white/15 drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]">
            {timeLeft}
          </div>

          {/* 统一的心情卡片 - 时间下方 */}
          {(selectedParticle || (carouselParticle && isCarouselVisible)) && (
            <div
              ref={cardRef}
              className={`mt-6 w-80 md:w-96 mx-auto pointer-events-auto transition-all duration-1000 animate-space-float-slow ${
                isCardClosing || isCarouselFading
                  ? "opacity-0 scale-95"
                  : "opacity-100 scale-100"
              }`}
              style={{ "--float-duration": "8s" } as React.CSSProperties}
            >
              <div
                className="bg-slate-900/70 border border-white/10 rounded-xl p-4 shadow-xl cursor-pointer hover:bg-slate-900/80 transition-colors animate-fade-in relative"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!selectedParticle && carouselParticle) {
                    // 点击轮播卡片时转为选中状态
                    setSelectedParticle(carouselParticle);
                    setCarouselParticle(null);
                    setIsCarouselVisible(false);
                    setCarouselPausedUntil(Date.now() + 5000);
                  }
                }}
              >
                {/* 关闭按钮 - 仅选中状态显示 */}
                {selectedParticle && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseCard();
                    }}
                    className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                <div className="flex items-center justify-between mb-2 pr-6">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shadow-lg"
                      style={{
                        backgroundColor: (selectedParticle || carouselParticle)
                          ?.color,
                        boxShadow: `0 0 12px ${
                          (selectedParticle || carouselParticle)?.color
                        }`,
                      }}
                    />
                    <span className="text-xs text-slate-400 font-mono">
                      #{(selectedParticle || carouselParticle)?.id.slice(-6)}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(
                      (selectedParticle || carouselParticle)?.timestamp || 0
                    ).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-white text-sm mb-1 text-left">
                  {(selectedParticle || carouselParticle)?.text}
                </p>
                <div className="text-xs text-slate-500 text-left">
                  {t.voiceFromNebula}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Input Area */}
        <div className="w-full flex justify-center items-end pb-24 pointer-events-none">
          <div
            ref={inputContainerRef}
            style={
              {
                ...inputStyle.style,
                "--float-duration": `${6 / Math.max(0.1, floatAmplitude)}s`,
              } as unknown as React.CSSProperties
            }
            className={`pointer-events-auto relative w-full h-14 md:h-16 rounded-full backdrop-blur-xl border transition-all ease-in-out overflow-hidden flex items-center justify-center animate-space-float ${inputStyle.className}`}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={contributionState !== "idle"}
              placeholder={t.inputPlaceholder}
              className={`w-full h-full bg-transparent border-none text-lg md:text-xl text-white placeholder:text-white/30 focus:outline-none text-center md:text-left transition-opacity duration-300 ${
                contributionState !== "idle" ? "opacity-0" : "opacity-100"
              }`}
              style={{
                paddingLeft: contributionState === "idle" ? "2rem" : "0",
                paddingRight: contributionState === "idle" ? "3.5rem" : "0",
              }}
            />

            <div
              className={`absolute right-3 top-1/2 -translate-y-1/2 z-30 transition-opacity duration-300 ${
                contributionState !== "idle" ? "opacity-0" : "opacity-100"
              }`}
            >
              <button
                onClick={handleContribute}
                disabled={!inputText}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 欢迎弹窗 */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-black/70 border border-white/20 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-fade-in">
            {/* 语言选择器 */}
            <div className="absolute top-4 right-4">
              <div className="relative">
                <button
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/60 hover:text-white/80 text-sm transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  <span>{t.languageNames[language]}</span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${
                      showLangMenu ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {showLangMenu && (
                  <div className="absolute top-full right-0 mt-1 bg-slate-800/95 border border-white/10 rounded-lg overflow-hidden shadow-xl z-10">
                    {(Object.keys(translations) as Language[]).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => {
                          setLanguage(lang);
                          setShowLangMenu(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors ${
                          lang === language
                            ? "text-cyan-400 bg-white/5"
                            : "text-white/70"
                        }`}
                      >
                        {translations[lang].languageNames[lang]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="text-center mb-6">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 bg-white rounded-full blur-xl opacity-10"></div>
                <Globe className="relative w-16 h-16 text-white/60" />
              </div>
              <h2 className="text-2xl font-light text-white/90 mb-4">
                {t.welcomeTitle}
              </h2>
              <p className="text-white/50 text-sm leading-relaxed mb-2">
                {t.welcomeText1}
              </p>
              <p className="text-white/50 text-sm leading-relaxed">
                {t.welcomeText2}
              </p>
            </div>
            <button
              onClick={() => {
                setShowWelcome(false);
                // 点击确认后播放音乐
                if (audioRef.current) {
                  setIsMusicLoading(true);
                  audioRef.current.play().catch((err) => {
                    console.log("播放失败:", err);
                    setIsMusicLoading(false);
                  });
                }
              }}
              className="w-full py-3 bg-transparent hover:bg-white/5 border border-white/30 hover:border-white/50 rounded-xl text-white/80 hover:text-white font-medium transition-colors"
            >
              {t.startButton}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
