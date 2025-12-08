"use client";

import { useRef, useCallback, useState, useEffect } from "react";

interface UseCosmicAudioReturn {
  /** 播放宇宙回声音频（带空灵混响效果） */
  playCosmicEcho: (base64Audio: string) => Promise<void>;
  /** 用 Web Speech API 朗读文本 */
  speakText: (text: string) => Promise<void>;
  /** 是否正在播放 */
  isPlaying: boolean;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 初始化音频引擎（需在用户交互后调用） */
  initAudio: () => Promise<void>;
  /** 是否已初始化 */
  isInitialized: boolean;
}

// IR (脉冲响应) 降级方案：合成一个简单的混响脉冲响应
function createSyntheticImpulseResponse(
  audioContext: AudioContext,
  duration: number = 4,
  decay: number = 3
): AudioBuffer {
  const sampleRate = audioContext.sampleRate;
  const length = sampleRate * duration;
  const impulseBuffer = audioContext.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const channelData = impulseBuffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      // 指数衰减的白噪声
      const t = i / sampleRate;
      const envelope = Math.exp(-t * decay);
      // 添加一些随机变化使其更自然
      const noise = (Math.random() * 2 - 1) * envelope;
      // 添加一些早期反射
      const earlyReflection =
        i < sampleRate * 0.1 ? Math.random() * 0.3 * Math.exp(-t * 10) : 0;
      channelData[i] = noise * 0.5 + earlyReflection;
    }
  }

  return impulseBuffer;
}

export function useCosmicAudio(): UseCosmicAudioReturn {
  const audioContextRef = useRef<AudioContext | null>(null);
  const convolverRef = useRef<ConvolverNode | null>(null);
  const irLoadedRef = useRef<boolean>(false); // 标记是否已加载真实 IR
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 清理函数
  useEffect(() => {
    return () => {
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // 后台异步加载真实 IR 文件
  const loadRealImpulseResponse = useCallback(async () => {
    if (
      !audioContextRef.current ||
      !convolverRef.current ||
      irLoadedRef.current
    )
      return;

    try {
      const response = await fetch("/impulse-response.wav");
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const impulseBuffer = await audioContextRef.current.decodeAudioData(
          arrayBuffer
        );
        convolverRef.current.buffer = impulseBuffer;
        irLoadedRef.current = true;
        console.log("✨ Upgraded to real impulse response (1.51MB loaded)");
      }
    } catch (err) {
      console.log("📡 Using synthetic reverb (IR file load failed):", err);
    }
  }, []);

  // 初始化 AudioContext 和混响
  const initAudio = useCallback(async () => {
    if (isInitialized) return;

    try {
      setIsLoading(true);
      setError(null);

      // 创建 AudioContext
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      // 确保 AudioContext 处于运行状态
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      // 创建 ConvolverNode
      const convolver = audioContext.createConvolver();
      convolverRef.current = convolver;

      // 🚀 快速启动：先用合成混响（瞬间完成）
      const syntheticBuffer = createSyntheticImpulseResponse(
        audioContext,
        5,
        2
      );
      convolver.buffer = syntheticBuffer;

      setIsInitialized(true);
      console.log("🎵 Cosmic Audio Engine initialized (synthetic reverb)");

      // 🌐 后台异步加载真实 IR 文件（不阻塞用户）
      loadRealImpulseResponse();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to initialize audio";
      setError(message);
      console.error("Audio initialization error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  // 播放宇宙回声
  const playCosmicEcho = useCallback(
    async (base64Audio: string) => {
      if (!audioContextRef.current || !convolverRef.current) {
        // 尝试自动初始化
        await initAudio();
        if (!audioContextRef.current || !convolverRef.current) {
          setError("Audio engine not initialized");
          return;
        }
      }

      try {
        setIsLoading(true);
        setError(null);

        const audioContext = audioContextRef.current;

        // 确保 AudioContext 处于运行状态
        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }

        // Step 1: 解码 Base64 音频
        const base64Data = base64Audio.replace(/^data:audio\/\w+;base64,/, "");
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const arrayBuffer = bytes.buffer;

        // Step 2: 解码为 AudioBuffer
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Step 3: 创建音频路由
        //
        // 音频路由设计：
        //
        //                    ┌─> dryGain (0.4) ─────────────────┐
        // Source ──> splitter│                                   ├─> Destination
        //                    └─> convolver ─> lowpass ─> wetGain (0.8) ─┘
        //

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;

        // 干音 Gain (保留清晰度)
        const dryGain = audioContext.createGain();
        dryGain.gain.value = 0.4;

        // 湿音 Gain (混响效果要强)
        const wetGain = audioContext.createGain();
        wetGain.gain.value = 0.8;

        // 低通滤波器 (让声音听起来更远、更空灵)
        const lowpassFilter = audioContext.createBiquadFilter();
        lowpassFilter.type = "lowpass";
        lowpassFilter.frequency.value = 3500; // 切掉 3.5kHz 以上的高频
        lowpassFilter.Q.value = 0.7;

        // 可选：添加一点高通滤波去掉低频隆隆声
        const highpassFilter = audioContext.createBiquadFilter();
        highpassFilter.type = "highpass";
        highpassFilter.frequency.value = 80;
        highpassFilter.Q.value = 0.5;

        // 连接干音路径
        source.connect(dryGain);
        dryGain.connect(audioContext.destination);

        // 连接湿音路径 (混响)
        source.connect(convolverRef.current);
        convolverRef.current.connect(lowpassFilter);
        lowpassFilter.connect(highpassFilter);
        highpassFilter.connect(wetGain);
        wetGain.connect(audioContext.destination);

        // 播放
        setIsPlaying(true);
        source.start(0);

        // 监听播放结束
        source.onended = () => {
          setIsPlaying(false);
          // 断开连接以释放资源
          source.disconnect();
          dryGain.disconnect();
          wetGain.disconnect();
          lowpassFilter.disconnect();
          highpassFilter.disconnect();
        };

        setIsLoading(false);
      } catch (err) {
        setIsLoading(false);
        setIsPlaying(false);
        const message =
          err instanceof Error ? err.message : "Failed to play audio";
        setError(message);
        console.error("Audio playback error:", err);
      }
    },
    [initAudio]
  );

  // 使用 Web Speech API 朗读文本
  const speakText = useCallback(async (text: string) => {
    try {
      setError(null);

      if (!("speechSynthesis" in window)) {
        throw new Error("浏览器不支持语音合成");
      }

      // 停止之前的朗读
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // 设置中文语音
      const voices = window.speechSynthesis.getVoices();
      const chineseVoice = voices.find(
        (v) =>
          v.lang.includes("zh") ||
          v.lang.includes("CN") ||
          v.name.includes("Chinese")
      );
      if (chineseVoice) {
        utterance.voice = chineseVoice;
      }

      // 设置参数
      utterance.rate = 0.85; // 稍慢，更有氛围
      utterance.pitch = 0.9; // 稍低沉
      utterance.volume = 0.8;

      setIsPlaying(true);

      utterance.onend = () => {
        setIsPlaying(false);
      };

      utterance.onerror = (event) => {
        setIsPlaying(false);
        setError(`语音合成失败: ${event.error}`);
      };

      window.speechSynthesis.speak(utterance);
      console.log("🎵 Web Speech API playing:", text);
    } catch (err) {
      setIsPlaying(false);
      const message = err instanceof Error ? err.message : "语音播放失败";
      setError(message);
      console.error("Speech API error:", err);
    }
  }, []);

  return {
    playCosmicEcho,
    speakText,
    isPlaying,
    isLoading,
    error,
    initAudio,
    isInitialized,
  };
}
