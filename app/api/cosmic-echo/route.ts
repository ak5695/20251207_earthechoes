import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// DeepSeek API (兼容 OpenAI SDK)
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
  timeout: 30000, // 30秒超时
});

// OpenAI API (用于 TTS)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  timeout: 60000, // 60秒超时
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input } = body;

    if (!input || typeof input !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid input" },
        { status: 400 }
      );
    }

    // 检查环境变量
    /*
    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { error: "DEEPSEEK_API_KEY is not configured" },
        { status: 500 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    // Step 1: 调用 DeepSeek API 生成文案
    console.log("🌌 [1/2] Calling DeepSeek API...");
    const systemPrompt = `你是亿万年的星尘化身，用宇宙视角回应人类心情。要求：1)第一人称'我' 2)一句话不超过15字 3)给意象不讲道理 4)温柔慈悲。例："我也曾见过那样的风暴，最终化作了星辰。"`;

    const startTime = Date.now();
    const textCompletion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: input },
      ],
      temperature: 0.9, // 稍微降低以加快速度
      max_tokens: 30, // 减少 token 数加快响应
    });
    const elapsed = Date.now() - startTime;

    const generatedText =
      textCompletion.choices[0]?.message?.content?.trim() || "";

    if (!generatedText) {
      return NextResponse.json(
        { error: "Failed to generate text from DeepSeek" },
        { status: 500 }
      );
    }
    console.log(`✅ [1/2] DeepSeek response (${elapsed}ms):`, generatedText);

    // Step 2: 调用 OpenAI TTS 生成语音
    console.log("🎵 [2/2] Calling OpenAI TTS...");
    const ttsStart = Date.now();

    try {
      const ttsResponse = await openai.audio.speech.create({
        model: "tts-1",
        voice: "shimmer", // 空灵女声
        input: generatedText,
        response_format: "mp3",
        speed: 0.9, // 稍慢，更有氛围感
      });

      const audioBuffer = await ttsResponse.arrayBuffer();
      const audioBase64 = Buffer.from(audioBuffer).toString("base64");
      const ttsElapsed = Date.now() - ttsStart;

      console.log(
        `✅ [2/2] TTS generated (${ttsElapsed}ms, ${Math.round(
          audioBase64.length / 1024
        )}KB)`
      );

      return NextResponse.json({
        text: generatedText,
        audioBase64: `data:audio/mp3;base64,${audioBase64}`,
      });
    } catch (ttsError) {
      console.error("TTS Error:", ttsError);
      // 如果 TTS 失败，至少返回文本
      return NextResponse.json({
        text: generatedText,
        audioBase64: null,
      });
    }
    */

    // AI 功能暂停中
    return NextResponse.json({
      text: "星光暂时沉睡，静待唤醒。",
      audioBase64: null,
    });
  } catch (error) {
    console.error("Cosmic Echo API Error:", error);

    // 详细错误信息
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
