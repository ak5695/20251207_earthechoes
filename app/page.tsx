"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { startProgress, stopProgress } from "next-nprogress-bar";
import React from "react";

// 配置
import { translations, Language } from "./config/translations";
import {
  defaultAnimationParams,
  getCameraParamsForScreen,
  getRandomMoodColor,
} from "./config/animation";

// Hooks
import { useUser, toggleLike } from "./hooks/useUser";
import { useMusic } from "./hooks/useMusic";
import { useCosmicAudio } from "./hooks/useCosmicAudio";

// 组件
import { supabase, User, Post } from "@/lib/supabase";
import CommentPanel from "./components/CommentPanel";
import NotificationPanel from "./components/NotificationPanel";
import UserSetupModal from "./components/UserSetupModal";
import ProfilePanel from "./components/ProfilePanel";
import UserProfilePanel from "./components/UserProfilePanel";
import MoodCard from "./components/MoodCard";
import Header from "./components/Header";
import WelcomeModal from "./components/WelcomeModal";
import InputArea from "./components/InputArea";
import LoadingScreen from "./components/LoadingScreen";
import InfoPanel, { View } from "./components/InfoPanel";

import type {
  ThreeSceneHandle,
  AnimationParams,
  ContributedParticle,
} from "./components/ThreeScene";

// 动态导入 Three.js 组件，禁用 SSR，使用懒加载
const ThreeScene = dynamic(() => import("./components/ThreeScene"), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-slate-950" />,
});
const ThreeSceneMemo = React.memo(ThreeScene);

// 动态导入 lil-gui
const loadGUI = () => import("lil-gui").then((mod) => mod.default);

type ContributionState = "idle" | "condensing" | "pulsing" | "launched";

export default function Home() {
  // === 基础状态 ===
  const [inputText, setInputText] = useState("");
  const [timeLeft, setTimeLeft] = useState("");
  const [contributionState, setContributionState] =
    useState<ContributionState>("idle");
  const [isClient, setIsClient] = useState(false);
  const [pendingText, setPendingText] = useState("");
  const [floatAmplitude, setFloatAmplitude] = useState(0.3);
  const [language, setLanguage] = useState<Language>("zh");
  const [isLoading, setIsLoading] = useState(true);
  const [isSceneReady, setIsSceneReady] = useState(false);

  // === 发射消息状态 ===
  const [showLaunchMessage, setShowLaunchMessage] = useState(false);
  const [isLaunchMessageClosing, setIsLaunchMessageClosing] = useState(false);

  // === 欢迎弹窗状态 ===
  const [showWelcome, setShowWelcome] = useState(true);
  const [isWelcomeClosing, setIsWelcomeClosing] = useState(false);

  // === 粒子卡片状态 ===
  const [selectedParticle, setSelectedParticle] =
    useState<ContributedParticle | null>(null);
  const [isCardClosing, setIsCardClosing] = useState(false);
  const [particleLinePos, setParticleLinePos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // === 轮播状态 ===
  const [carouselParticle, setCarouselParticle] =
    useState<ContributedParticle | null>(null);
  const [isCarouselVisible, setIsCarouselVisible] = useState(false);
  const [isCarouselFading, setIsCarouselFading] = useState(false);
  const [carouselDisplayTime, setCarouselDisplayTime] = useState(5);
  const [carouselPausedUntil, setCarouselPausedUntil] = useState(0);
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);

  // === 面板状态 ===
  const [showUserSetup, setShowUserSetup] = useState(false);
  const [showCommentPanel, setShowCommentPanel] = useState(false);
  const [commentPanelPost, setCommentPanelPost] = useState<
    (Post & { user: User | null }) | null
  >(null);
  const [highlightCommentId, setHighlightCommentId] = useState<string | null>(
    null
  );
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [isProfileClosing, setIsProfileClosing] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [infoPanelInitialView, setInfoPanelInitialView] =
    useState<View>("main");
  const [isInfoClosing, setIsInfoClosing] = useState(false);

  // === 导航状态 ===
  const [previousPanel, setPreviousPanel] = useState<
    "profile" | "user-profile" | null
  >(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [showUserProfilePanel, setShowUserProfilePanel] = useState(false);
  const [isUserProfileClosing, setIsUserProfileClosing] = useState(false);

  // === 自定义 Hooks ===
  const {
    currentUser,
    setCurrentUser,
    unreadNotifications,
    setUnreadNotifications,
    likedPosts,
    setLikedPosts,
  } = useUser();

  const { isMusicPlaying, isMusicLoading, toggleMusic, startMusic } =
    useMusic();

  // 宇宙回声音频
  const {
    playCosmicEcho,
    speakText,
    isPlaying: isCosmicEchoPlaying,
    initAudio: initCosmicAudio,
  } = useCosmicAudio();

  // === Refs ===
  const inputRef = useRef<HTMLInputElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const threeSceneRef = useRef<ThreeSceneHandle>(null);
  const guiRef = useRef<InstanceType<
    Awaited<ReturnType<typeof loadGUI>>
  > | null>(null);
  const carouselTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // === 动画参数 ===
  const paramsRef = useRef<AnimationParams>({ ...defaultAnimationParams });

  // TanStack Query client
  const queryClient = useQueryClient();

  // 获取当前翻译
  const t = translations[language];

  // === Effects ===

  // Client-side check
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 根据屏幕大小调整摄像机参数
  useEffect(() => {
    if (!isClient) return;

    const updateCameraForScreenSize = () => {
      const camParams = getCameraParamsForScreen();
      paramsRef.current.cameraZ = camParams.cameraZ;
      paramsRef.current.cameraTargetZ = camParams.cameraTargetZ;
      paramsRef.current.cameraTargetY = camParams.cameraTargetY;

      if (threeSceneRef.current) {
        threeSceneRef.current.updateParams(paramsRef.current);
      }
    };

    updateCameraForScreenSize();
    window.addEventListener("resize", updateCameraForScreenSize);

    return () => {
      window.removeEventListener("resize", updateCameraForScreenSize);
    };
  }, [isClient]);

  // GUI Setup (调试面板)
  const SHOW_DEBUG_GUI = false;

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
      const uiParams = { floatSpeed: 0.3, carouselTime: 5 };
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

      gui.onChange(() => {
        if (threeSceneRef.current) threeSceneRef.current.updateParams(p);
      });
    });

    return () => {
      guiRef.current?.destroy();
    };
  }, [isClient]);

  // Timer Logic
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
    setTimeLeft(updateTimer());
    const interval = setInterval(() => {
      setTimeLeft(updateTimer());
    }, 1000);
    return () => clearInterval(interval);
  }, [updateTimer]);

  // 轮播逻辑
  useEffect(() => {
    if (!isClient) return;

    const fadeOutDuration = 2;
    const waitDuration = 2;
    let activeTimeout: NodeJS.Timeout | null = null;

    const scheduleNext = (delay: number) => {
      activeTimeout = setTimeout(runLoop, delay);
    };

    const runLoop = () => {
      if (
        selectedParticle ||
        Date.now() < carouselPausedUntil ||
        isCarouselHovered ||
        threeSceneRef.current?.isShapeTransitioning?.()
      ) {
        scheduleNext(1000);
        return;
      }

      if (threeSceneRef.current) {
        const particle = threeSceneRef.current.getRandomNebulaParticle();
        if (particle) {
          setCarouselParticle(particle);
          setIsCarouselVisible(true);
          setIsCarouselFading(false);

          // 动态计算显示时间：基础2秒 + 每字0.2秒，上限12秒
          // 这样既能保证短文本有足够阅读时间，长文本也不会显示太久
          const textLen = particle.text ? particle.text.length : 0;
          const displayDuration = Math.max(3, Math.min(12, 2 + textLen * 0.2));

          activeTimeout = setTimeout(() => {
            if (isCarouselHovered) {
              scheduleNext(1000);
              return;
            }
            setIsCarouselFading(true);
            activeTimeout = setTimeout(() => {
              setIsCarouselVisible(false);
              setIsCarouselFading(false);
              scheduleNext(waitDuration * 1000);
            }, fadeOutDuration * 1000);
          }, displayDuration * 1000);
        } else {
          scheduleNext(1000);
        }
      } else {
        scheduleNext(1000);
      }
    };

    scheduleNext(waitDuration * 1000);

    return () => {
      if (activeTimeout) clearTimeout(activeTimeout);
    };
  }, [isClient, carouselPausedUntil, selectedParticle, isCarouselHovered]);

  // 当前显示的粒子信息
  const currentParticleText = useMemo(() => {
    const particle = selectedParticle || carouselParticle;
    return particle?.text || null;
  }, [selectedParticle, carouselParticle]);

  // 使用 TanStack Query 获取帖子数据
  const {
    data: currentPost,
    refetch: refetchPost,
    isPending: isPostLoading,
  } = useQuery({
    queryKey: ["post", currentParticleText],
    queryFn: async () => {
      if (!currentParticleText) return null;

      const { data, error } = await supabase
        .from("posts")
        .select("*, bookmarks(count)")
        .eq("content", currentParticleText)
        .maybeSingle();

      if (error || !data) return null;

      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", data.user_id)
        .single();

      return { ...data, user: userData } as Post & { user: User };
    },
    enabled: !!currentParticleText,
    staleTime: 10000,
    refetchInterval: 30000,
  });

  // 监听加载状态，显示顶部进度条
  useEffect(() => {
    if (isPostLoading) {
      startProgress();
    } else {
      stopProgress();
    }
  }, [isPostLoading]);

  // === Handlers ===

  // 处理粒子点击
  const handleParticleClick = useCallback((particle: ContributedParticle) => {
    setIsCardClosing(false);
    setIsCarouselFading(false); // 确保重置轮播淡出状态
    setSelectedParticle(particle);
    setCarouselPausedUntil(Date.now() + 5000);
    setCarouselParticle(null);
    setIsCarouselVisible(false);
  }, []);

  // 关闭卡片
  const handleCloseCard = useCallback(() => {
    setIsCardClosing(true);
    setCarouselPausedUntil(Date.now() + 5000);
    setTimeout(() => {
      setSelectedParticle(null);
      setIsCardClosing(false);
    }, 250);
  }, []);

  // 打开评论面板
  const handleOpenComments = useCallback(
    async (particle: ContributedParticle) => {
      if (currentPost) {
        setCommentPanelPost(currentPost);
        setShowCommentPanel(true);
        // 保持选中状态，以便关闭评论后能返回
        setSelectedParticle(particle);
        setIsCardClosing(false); // 确保卡片状态重置
        setIsCarouselFading(false); // 确保重置轮播淡出状态
        setCarouselParticle(null);
        setIsCarouselVisible(false);
        setCarouselPausedUntil(Infinity);
      }
    },
    [currentPost]
  );

  // 点赞帖子
  const handleLikePost = useCallback(
    async (postId: string) => {
      if (!currentUser) {
        setShowUserSetup(true);
        return;
      }

      const isLiked = likedPosts.has(postId);

      try {
        await toggleLike(postId, currentUser.id, isLiked);

        if (isLiked) {
          setLikedPosts((prev) => {
            const next = new Set(prev);
            next.delete(postId);
            return next;
          });
        } else {
          setLikedPosts((prev) => new Set([...prev, postId]));
        }

        queryClient.invalidateQueries({
          queryKey: ["post", currentParticleText],
        });
      } catch (err) {
        console.error("Error toggling like:", err);
      }
    },
    [currentUser, likedPosts, queryClient, currentParticleText, setLikedPosts]
  );

  // 发送心情
  const handleContribute = async () => {
    if (!inputText.trim()) return;

    setCarouselPausedUntil(Infinity);
    setCarouselParticle(null);
    setIsCarouselVisible(false);

    const moodColor = getRandomMoodColor();
    const textToSave = inputText;
    setPendingText(textToSave);

    // 🌌 立即调用宇宙回声 API（后台异步，不阻塞动画）
    let cosmicEchoText: string | null = null;
    let cosmicEchoAudio: string | null = null;
    const cosmicEchoPromise = fetch("/api/cosmic-echo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: textToSave }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.text) {
          cosmicEchoText = data.text;
          cosmicEchoAudio = data.audioBase64 || null;
          console.log("🌌 宇宙回声:", cosmicEchoText);
          if (cosmicEchoAudio) {
            console.log("🎵 收到 OpenAI TTS 音频");
          }
        }
      })
      .catch((err) => console.error("Cosmic echo error:", err));

    // 保存到数据库或本地
    if (currentUser) {
      try {
        await supabase.from("posts").insert({
          user_id: currentUser.id,
          content: textToSave,
          mood: "思绪",
          color: moodColor,
          language: language,
        });
      } catch (err) {
        console.error("Error saving post:", err);
      }
    } else {
      try {
        const localPosts = JSON.parse(
          localStorage.getItem("earthechoes_local_posts") || "[]"
        );
        localPosts.push({
          id: `local_${Date.now()}`,
          content: textToSave,
          mood: "思绪",
          color: moodColor,
          language: language,
          created_at: new Date().toISOString(),
          is_local: true,
        });
        localStorage.setItem(
          "earthechoes_local_posts",
          JSON.stringify(localPosts)
        );
      } catch (err) {
        console.error("Error saving to local storage:", err);
      }
    }

    // 动画流程
    // 暂停星云形态切换（仅暂停形态切换，保留旋转/呼吸等视觉效果）
    const tryPauseNebula = async () => {
      const start = Date.now();
      while (Date.now() - start < 2000) {
        if (threeSceneRef.current?.pauseNebulaTimer) {
          console.log("[page] calling pauseNebulaTimer() before condensing");
          threeSceneRef.current.pauseNebulaTimer();
          return true;
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      console.warn("[page] pauseNebulaTimer() not available after 2s");
      return false;
    };
    void tryPauseNebula();

    setContributionState("condensing");
    setInputText("");

    if (threeSceneRef.current) {
      threeSceneRef.current.animateCamera();
    }

    setTimeout(() => {
      setContributionState("pulsing");

      const cameraDuration = paramsRef.current.cameraPanDuration * 1000;
      const pulseDelay = Math.max(
        300,
        cameraDuration - paramsRef.current.collapseDuration
      );

      setTimeout(() => {
        if (inputContainerRef.current && threeSceneRef.current) {
          const rect = inputContainerRef.current.getBoundingClientRect();
          // Defensive: ensure nebula shape switching is paused immediately before spawning projectile
          if (threeSceneRef.current.pauseNebulaTimer) {
            console.log(
              "[page] defensive call to pauseNebulaTimer() immediately before spawnProjectile"
            );
            threeSceneRef.current.pauseNebulaTimer();
          }
          // 显示发射消息
          setShowLaunchMessage(true);
          setIsLaunchMessageClosing(false);
          setTimeout(() => {
            setIsLaunchMessageClosing(true);
            setTimeout(() => {
              setShowLaunchMessage(false);
              setIsLaunchMessageClosing(false);
            }, 2000);
          }, 17500); // 17秒 - 2秒 = 15秒后开始退出动画

          threeSceneRef.current.spawnProjectile(
            rect,
            moodColor,
            textToSave,
            async () => {
              if (threeSceneRef.current) {
                threeSceneRef.current.resetCamera();
              }
              setContributionState("idle");
              setPendingText("");
              setCarouselPausedUntil(Date.now() + 2000);

              // 等待宇宙回声 API 完成（如果还没完成的话）
              await cosmicEchoPromise;

              // 播放语音：优先 OpenAI TTS，降级到 Web Speech API
              /*
              if (cosmicEchoText) {
                if (cosmicEchoAudio) {
                  // 使用 OpenAI TTS 音频（带混响效果）
                  await playCosmicEcho(cosmicEchoAudio);
                } else {
                  // 降级：使用浏览器 TTS
                  await speakText(cosmicEchoText);
                }
              }
              */

              // 明确恢复星云形态计时（防止某些路径未触发 resume）
              if (threeSceneRef.current?.resumeNebulaTimer) {
                console.log(
                  "[page] calling resumeNebulaTimer() after spawn complete/audio done"
                );
                threeSceneRef.current.resumeNebulaTimer();
              }
            }
          );
        }
        setContributionState("launched");
      }, pulseDelay);
    }, paramsRef.current.collapseDuration);
  };

  // 欢迎弹窗关闭
  const handleWelcomeClose = useCallback(() => {
    setIsWelcomeClosing(true);
    // 初始化宇宙回声音频引擎（需要用户交互后才能初始化）
    initCosmicAudio();
    setTimeout(() => {
      setShowWelcome(false);
      setIsWelcomeClosing(false);
      startMusic();
    }, 2000);
  }, [startMusic, initCosmicAudio]);

  // 监测形态切换
  useEffect(() => {
    if (!isClient || !threeSceneRef.current) return;

    let checkInterval: NodeJS.Timeout | null = null;

    const checkShapeTransition = () => {
      if (threeSceneRef.current?.isShapeTransitioning?.()) {
        if (isCarouselVisible && !selectedParticle) {
          setIsCarouselFading(true);
          setTimeout(() => {
            setIsCarouselVisible(false);
            setIsCarouselFading(false);
            setCarouselParticle(null);
          }, 500);
        }
      }
    };

    checkInterval = setInterval(checkShapeTransition, 1000);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [isClient, isCarouselVisible, selectedParticle]);

  // 高亮选中的粒子
  useEffect(() => {
    if (threeSceneRef.current) {
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

    let animationId: number;
    const updateLinePosition = () => {
      if (threeSceneRef.current) {
        const pos =
          threeSceneRef.current.getHighlightedParticleScreenPosition();
        setParticleLinePos(pos);
      }
      animationId = requestAnimationFrame(updateLinePosition);
    };

    updateLinePosition();

    return () => {
      cancelAnimationFrame(animationId);
      setParticleLinePos(null);
    };
  }, [isClient, selectedParticle, carouselParticle, isCarouselVisible]);

  // === Render ===
  return (
    <>
      {isLoading && (
        <LoadingScreen
          isReady={isSceneReady}
          onFinished={() => setIsLoading(false)}
        />
      )}

      {isClient && (
        <ThreeSceneMemo
          params={paramsRef.current}
          ref={threeSceneRef}
          onParticleClick={handleParticleClick}
          selectedParticleId={selectedParticle?.id ?? null}
          language={language}
          onReady={() => {
            setIsSceneReady(true);
          }}
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
                stopColor={
                  (selectedParticle || carouselParticle)?.color || "#6366f1"
                }
                stopOpacity="0.8"
              />
              <stop
                offset="100%"
                stopColor={
                  (selectedParticle || carouselParticle)?.color || "#6366f1"
                }
                stopOpacity="0.2"
              />
            </linearGradient>
          </defs>
          <line
            key={(selectedParticle || carouselParticle)?.id}
            x1={particleLinePos.x}
            y1={particleLinePos.y}
            x2={
              cardRef.current.getBoundingClientRect().left +
              cardRef.current.getBoundingClientRect().width / 2
            }
            y2={
              cardRef.current.getBoundingClientRect().top +
              cardRef.current.getBoundingClientRect().height
            }
            stroke="url(#lineGradient)"
            strokeWidth="2"
            className="animate-draw-line"
          />
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
      <div className="absolute inset-0 z-10 flex flex-col justify-between p-2 md:p-8 pointer-events-none">
        {/* Header */}
        <Header
          currentUser={currentUser}
          unreadNotifications={unreadNotifications}
          isMusicPlaying={isMusicPlaying}
          isMusicLoading={isMusicLoading}
          onToggleMusic={toggleMusic}
          onOpenNotifications={() => setShowNotificationPanel(true)}
          onOpenProfile={() => setShowProfilePanel(true)}
          onOpenUserSetup={() => setShowUserSetup(true)}
          onOpenInfo={() => setShowInfoPanel(true)}
        />

        {/* Center Timer */}
        <div className="absolute top-19 left-1/2 -translate-x-1/2 text-center pointer-events-none">
          <div className="text-[10px] md:text-xs font-mono text-cyan-200/40 tracking-[0.4em] uppercase mb-2">
            {t.nextEchoIn}
          </div>
          <div className="text-3xl md:text-4xl font-base tracking-widest font-mono text-white/40 drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]">
            {timeLeft}
          </div>

          {/* 统一的心情卡片 */}
          {(selectedParticle || (carouselParticle && isCarouselVisible)) &&
            !showCommentPanel && (
              <div className="mt-6 w-80 md:w-96 mx-auto">
                <div
                  ref={cardRef}
                  className={`pointer-events-auto ${
                    isCardClosing || isCarouselFading
                      ? "animate-card-exit"
                      : "animate-card-enter-float"
                  }`}
                  onMouseEnter={() => {
                    if (!selectedParticle && carouselParticle) {
                      setIsCarouselHovered(true);
                    }
                  }}
                  onMouseLeave={() => {
                    setIsCarouselHovered(false);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!selectedParticle && carouselParticle) {
                      setSelectedParticle(carouselParticle);
                      setCarouselParticle(null);
                      setIsCarouselVisible(false);
                      setIsCarouselFading(false); // 确保重置轮播淡出状态
                      setCarouselPausedUntil(Date.now() + 5000);
                    }
                  }}
                >
                  <MoodCard
                    key={(selectedParticle || carouselParticle)?.id}
                    particle={(selectedParticle || carouselParticle)!}
                    isClosable={!!selectedParticle}
                    onClose={handleCloseCard}
                    onClick={() => {
                      const particle = selectedParticle || carouselParticle;
                      if (particle) handleOpenComments(particle);
                    }}
                    onUserClick={() => {
                      if (currentPost?.user) {
                        setViewingUser(currentPost.user);
                        setShowUserProfilePanel(true);
                      }
                    }}
                    userName={currentPost?.user?.nickname}
                    voiceLabel={t.voiceFromNebula}
                    isLoading={isPostLoading}
                  />
                </div>
              </div>
            )}
        </div>

        {/* Bottom Input Area */}
        <div className="flex flex-col items-center">
          {/* 发射消息 */}
          {showLaunchMessage && (
            <div className="absolute bottom-[5rem] left-1/2 -translate-x-1/2 w-80 md:w-96 mx-auto animate-space-float-slow">
              <div
                className={`pointer-events-auto ${
                  isLaunchMessageClosing
                    ? "animate-card-exit"
                    : "animate-card-enter"
                }`}
              >
                <div className="text-center">
                  <span className="text-base md:text-lg font-bold tracking-wider text-white/60">
                    去吧,去寻找属于你的位置.
                  </span>
                </div>
              </div>
            </div>
          )}

          <InputArea
            ref={inputContainerRef}
            inputText={inputText}
            contributionState={contributionState}
            placeholder={t.inputPlaceholder}
            floatAmplitude={floatAmplitude}
            collapseDuration={paramsRef.current.collapseDuration}
            onInputChange={setInputText}
            onSubmit={handleContribute}
            inputRef={inputRef}
          />
        </div>
      </div>

      {/* 欢迎弹窗 */}
      {showWelcome && (
        <WelcomeModal
          language={language}
          isClosing={isWelcomeClosing}
          onClose={handleWelcomeClose}
          onLanguageChange={setLanguage}
        />
      )}

      {/* 用户设置弹窗 */}
      {showUserSetup && (
        <UserSetupModal
          onComplete={(user) => {
            setCurrentUser(user);
            setShowUserSetup(false);
          }}
          onClose={() => setShowUserSetup(false)}
          onOpenPolicy={(view) => {
            setInfoPanelInitialView(view);
            setShowInfoPanel(true);
          }}
          language={language}
        />
      )}

      {/* 评论面板 */}
      {showCommentPanel && commentPanelPost && (
        <CommentPanel
          post={commentPanelPost}
          currentUser={currentUser}
          highlightCommentId={highlightCommentId}
          onClose={() => {
            setShowCommentPanel(false);
            setCommentPanelPost(null);
            setHighlightCommentId(null);
            setIsCardClosing(false); // 确保卡片重新显示时不是关闭状态
            setIsCarouselFading(false); // 确保卡片重新显示时不是淡出状态
            setCarouselPausedUntil(Date.now() + 2000); // 给一点缓冲时间

            // 导航回退逻辑
            if (previousPanel === "profile") {
              setShowProfilePanel(true);
              setPreviousPanel(null);
            } else if (previousPanel === "user-profile" && viewingUser) {
              setShowUserProfilePanel(true);
              setPreviousPanel(null);
            }
          }}
          onUserRequired={() => setShowUserSetup(true)}
          onPostClick={(post) => {
            setCommentPanelPost(post);
          }}
          onUserClick={(user) => {
            setViewingUser(user);
            setShowUserProfilePanel(true);
            // 如果是从评论面板打开用户主页，不需要关闭评论面板，而是叠加？
            // 或者关闭评论面板，记录状态？
            // 这里选择：关闭评论面板，记录 previousPanel 为 null (因为是从评论面板进入的，回退应该回到评论面板？)
            // 不，通常逻辑是：评论 -> 用户主页 -> 评论(新) -> 关闭 -> 用户主页 -> 关闭 -> 评论(旧)
            // 这需要栈。为了简化，我们假设：
            // 评论 -> 用户主页：关闭评论面板，打开用户主页。
            // 用户主页 -> 评论(新)：关闭用户主页，打开评论面板(新)，记录 previousPanel='user-profile'
            // 评论(新) -> 关闭：打开用户主页。
            // 用户主页 -> 关闭：回到哪里？
            // 如果是从评论面板来的，应该回到评论面板(旧)。
            // 这太复杂了。
            // 简化逻辑：
            // 评论 -> 用户主页：直接覆盖。
            // 用户主页 -> 关闭：回到场景。
            // 除非我们记录了来源。

            // 当前实现：
            // 评论 -> 用户主页
            setShowCommentPanel(false);
            // 我们不记录 previousPanel，因为用户主页关闭后通常回到场景
          }}
          language={language}
        />
      )}

      {/* 通知面板 */}
      {showNotificationPanel && (
        <NotificationPanel
          currentUser={currentUser}
          onClose={() => {
            setShowNotificationPanel(false);
            setUnreadNotifications(0);
          }}
          language={language}
        />
      )}

      {/* Profile 面板 */}
      {showProfilePanel && currentUser && (
        <ProfilePanel
          currentUser={currentUser}
          onClose={() => {
            setIsProfileClosing(true);
            setTimeout(() => {
              setShowProfilePanel(false);
              setIsProfileClosing(false);
            }, 300);
          }}
          onPostClick={(post) => {
            console.log("Page: onPostClick received", post.id);
            // 记录来源
            setPreviousPanel("profile");
            // 打开评论面板
            setCommentPanelPost(post);
            // @ts-ignore
            if (post.highlightCommentId) {
              // @ts-ignore
              setHighlightCommentId(post.highlightCommentId);
            } else {
              setHighlightCommentId(null);
            }
            setShowCommentPanel(true);
          }}
          onLogout={() => {
            setIsProfileClosing(true);
            setTimeout(() => {
              setCurrentUser(null);
              setShowProfilePanel(false);
              setIsProfileClosing(false);
            }, 300);
          }}
          onUpdateUser={(updatedUser) => {
            setCurrentUser(updatedUser);
          }}
          onUserClick={(user) => {
            setViewingUser(user);
            setShowUserProfilePanel(true);
          }}
          language={language}
          isClosing={isProfileClosing}
        />
      )}

      {/* Info Panel */}
      {showInfoPanel && (
        <InfoPanel
          isClosing={isInfoClosing}
          initialView={infoPanelInitialView}
          onClose={() => {
            setIsInfoClosing(true);
            setTimeout(() => {
              setShowInfoPanel(false);
              setIsInfoClosing(false);
              setInfoPanelInitialView("main"); // Reset to main on close
            }, 300);
          }}
        />
      )}

      {/* User Profile 面板 (查看他人) */}
      {showUserProfilePanel && viewingUser && (
        <UserProfilePanel
          user={viewingUser}
          currentUser={currentUser}
          onClose={() => {
            setIsUserProfileClosing(true);
            setTimeout(() => {
              setShowUserProfilePanel(false);
              setIsUserProfileClosing(false);
              // 如果是从评论区进来的，这里关闭后就回到场景了
              // 如果需要回到评论区，需要更复杂的栈管理
            }, 300);
          }}
          onPostClick={(post) => {
            // 记录来源
            setPreviousPanel("user-profile");
            // 打开评论面板
            setCommentPanelPost({ ...post, user: viewingUser });
            setShowCommentPanel(true);
          }}
          language={language}
          isClosing={isUserProfileClosing}
        />
      )}
    </>
  );
}
