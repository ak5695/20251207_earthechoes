/**
 * Edge TTS - 纯 Node.js 实现
 * 使用 Azure Cognitive Services REST API
 * 免费、无需 API Key、国内可访问
 */

import { randomUUID } from "crypto";

// 可用的中文语音
export const VOICES = {
  // 中文普通话
  "zh-CN-XiaoxiaoNeural": "晓晓 (女声, 温柔)",
  "zh-CN-XiaoyiNeural": "晓伊 (女声, 活泼)",
  "zh-CN-YunjianNeural": "云健 (男声, 磁性)",
  "zh-CN-YunxiNeural": "云希 (男声, 阳光)",
  "zh-CN-YunxiaNeural": "云夏 (男声, 少年)",
  "zh-CN-YunyangNeural": "云扬 (男声, 新闻)",
  // 英文
  "en-US-AriaNeural": "Aria (Female, Expressive)",
  "en-US-JennyNeural": "Jenny (Female, Friendly)",
  "en-US-GuyNeural": "Guy (Male, Casual)",
} as const;

export type VoiceName = keyof typeof VOICES;

interface TTSOptions {
  voice?: VoiceName;
  rate?: string; // e.g., "+0%", "-10%", "+20%"
  pitch?: string; // e.g., "+0Hz", "-10Hz", "+5Hz"
  volume?: string; // e.g., "+0%", "-10%", "+20%"
}

function createSSML(text: string, options: TTSOptions): string {
  const voice = options.voice || "zh-CN-XiaoxiaoNeural";
  const rate = options.rate || "+0%";
  const pitch = options.pitch || "+0Hz";
  const volume = options.volume || "+0%";

  // 转义 XML 特殊字符
  const escapedText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="zh-CN">
    <voice name="${voice}">
      <prosody rate="${rate}" pitch="${pitch}" volume="${volume}">
        ${escapedText}
      </prosody>
    </voice>
  </speak>`;
}

/**
 * 使用 Edge TTS 生成语音（HTTP REST API）
 * @param text 要转换的文本
 * @param options TTS 选项
 * @returns MP3 音频的 Buffer
 */
export async function synthesize(
  text: string,
  options: TTSOptions = {}
): Promise<Buffer> {
  const ssml = createSSML(text, options);

  // Azure 中国区的 TTS 端点
  const url =
    "https://chinaeast2.tts.speech.microsoft.com/cognitiveservices/v1";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: ssml,
      signal: AbortSignal.timeout(30000), // 30秒超时
    });

    if (!response.ok) {
      throw new Error(
        `Edge TTS HTTP error: ${response.status} ${response.statusText}`
      );
    }

    const audioBuffer = await response.arrayBuffer();
    return Buffer.from(audioBuffer);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Edge TTS synthesis failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * 生成语音并返回 Base64 字符串
 */
export async function synthesizeToBase64(
  text: string,
  options: TTSOptions = {}
): Promise<string> {
  const audioBuffer = await synthesize(text, options);
  return `data:audio/mp3;base64,${audioBuffer.toString("base64")}`;
}
