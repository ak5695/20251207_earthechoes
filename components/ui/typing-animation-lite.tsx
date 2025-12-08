"use client";

import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface TypingAnimationLiteProps {
  children: string;
  className?: string;
  duration?: number;
  delay?: number;
  showCursor?: boolean;
  blinkCursor?: boolean;
  onComplete?: () => void;
}

export function TypingAnimationLite({
  children,
  className,
  duration = 50,
  delay = 0,
  showCursor = true,
  blinkCursor = true,
  onComplete,
}: TypingAnimationLiteProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [started, setStarted] = useState(delay === 0);

  const characters = useMemo(() => Array.from(children), [children]);

  // 延迟开始
  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setStarted(true), delay);
      return () => clearTimeout(timer);
    }
  }, [delay]);

  // 打字效果
  useEffect(() => {
    if (!started) return;

    if (displayedText.length < characters.length) {
      const timer = setTimeout(() => {
        setDisplayedText(
          characters.slice(0, displayedText.length + 1).join("")
        );
      }, duration);
      return () => clearTimeout(timer);
    } else if (!isComplete) {
      setIsComplete(true);
      onComplete?.();
    }
  }, [started, displayedText, characters, duration, isComplete, onComplete]);

  // 重置当 children 变化时
  useEffect(() => {
    setDisplayedText("");
    setIsComplete(false);
    if (delay === 0) {
      setStarted(true);
    } else {
      setStarted(false);
    }
  }, [children, delay]);

  return (
    <span className={cn("inline", className)}>
      {displayedText}
      {showCursor && (
        <span
          className={cn(
            "inline-block w-[2px] h-[1em] bg-current ml-[1px] align-middle",
            blinkCursor && !isComplete && "animate-pulse"
          )}
          style={{
            opacity: isComplete && blinkCursor ? 0 : 1,
            transition: "opacity 0.3s",
          }}
        />
      )}
    </span>
  );
}
