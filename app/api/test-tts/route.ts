import { NextRequest, NextResponse } from "next/server";
import { synthesizeToBase64 } from "@/lib/edge-tts";

export async function GET(request: NextRequest) {
  try {
    console.log("🧪 Testing Edge TTS...");

    const audioBase64 = await synthesizeToBase64("测试音频", {
      voice: "zh-CN-XiaoxiaoNeural",
    });

    console.log(
      "✅ Edge TTS test passed! Audio size:",
      Math.round(audioBase64.length / 1024),
      "KB"
    );

    return NextResponse.json({
      success: true,
      message: "Edge TTS works!",
      audioSize: Math.round(audioBase64.length / 1024) + "KB",
    });
  } catch (error) {
    console.error("❌ Edge TTS test failed:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          stack: error.stack,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Unknown error" },
      { status: 500 }
    );
  }
}
