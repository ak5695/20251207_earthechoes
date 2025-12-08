"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { X } from "lucide-react";
import type { ContributedParticle } from "./ThreeScene";

interface MoodCardProps {
  particle: ContributedParticle;
  isClosable?: boolean;
  onClose?: () => void;
  onClick?: () => void;
  userName?: string;
  voiceLabel?: string;
}

export default function MoodCard({
  particle,
  isClosable = false,
  onClose,
  onClick,
  userName,
  voiceLabel = "来自星云的声音",
}: MoodCardProps) {
  return (
    <Card
      className="bg-slate-900/85 border-slate-700/50 backdrop-blur-xl shadow-2xl py-0 cursor-pointer hover:bg-slate-900/95 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* 顶部 - 名字、日期和关闭按钮在同一行 */}
        <div className="flex items-center justify-between mb-3">
          {/* 左侧：色点和名字 */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: particle.color,
                boxShadow: `0 0 4px ${particle.color}`,
              }}
            />
            {userName ? (
              <TypingAnimation
                duration={60}
                delay={200}
                showCursor={false}
                className="text-xs  text-slate-500 font-medium"
              >
                {userName}
              </TypingAnimation>
            ) : (
              <TypingAnimation
                duration={60}
                delay={200}
                showCursor={false}
                className="text-xs text-slate-500 italic"
              >
                {voiceLabel}
              </TypingAnimation>
            )}
          </div>
          {/* 右侧：日期和关闭按钮 */}
          <div className="flex items-center gap-2">
            <TypingAnimation
              duration={50}
              delay={400}
              showCursor={false}
              className="text-[10px] text-slate-500"
            >
              {new Date(particle.timestamp).toLocaleDateString()}
            </TypingAnimation>
            {isClosable && onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="h-6 w-6 text-slate-400 hover:text-red-700 hover:bg-red-500/20 btn-close-hint"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* 内容 - 文字在下方，使用打字动画效果 */}
        <div className="text-white text-sm mb-4">
          <TypingAnimation
            duration={80}
            delay={600}
            showCursor={true}
            blinkCursor={true}
            cursorStyle="line"
            className="text-white"
          >
            {particle.text}
          </TypingAnimation>
        </div>
      </CardContent>
    </Card>
  );
}
