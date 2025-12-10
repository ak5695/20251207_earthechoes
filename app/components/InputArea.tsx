"use client";

import { forwardRef, RefObject } from "react";
import { Send } from "lucide-react";
import { triggerHapticFeedback } from "../utils/haptics";

type ContributionState = "idle" | "condensing" | "pulsing" | "launched";

interface InputAreaProps {
  inputText: string;
  contributionState: ContributionState;
  placeholder: string;
  floatAmplitude: number;
  collapseDuration: number;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}

// 获取输入框样式
export const getInputStyles = (
  contributionState: ContributionState,
  collapseDuration: number
) => {
  switch (contributionState) {
    case "condensing":
      return {
        className:
          "w-14 md:w-16 h-14 md:h-16 max-w-14 md:max-w-16 bg-white/60 px-0 shadow-[0_0_30px_rgba(255,255,255,0.5),inset_0_0_20px_rgba(255,255,255,0.4)] border-transparent scale-100 rounded-full",
        style: {
          transitionDuration: `${collapseDuration}ms`,
          transitionTimingFunction: "cubic-bezier(0.25, 0.1, 0.25, 1)",
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
          transitionTimingFunction: "cubic-bezier(0.5, 0, 0.75, 0)",
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
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
          transitionProperty: "all",
        },
      };
  }
};

const InputArea = forwardRef<HTMLDivElement, InputAreaProps>(
  (
    {
      inputText,
      contributionState,
      placeholder,
      floatAmplitude,
      collapseDuration,
      onInputChange,
      onSubmit,
      inputRef,
    },
    containerRef
  ) => {
    const inputStyle = getInputStyles(contributionState, collapseDuration);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") onSubmit();
    };

    return (
      <div className="w-full flex justify-center items-end pb-24 pointer-events-none">
        <div
          ref={containerRef}
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
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={contributionState !== "idle"}
            placeholder={placeholder}
            className={`w-full h-full bg-transparent border-none text-base md:text-lg text-white placeholder:text-white/60 placeholder:text-center focus:outline-none text-center md:text-left transition-opacity duration-300 ${
              contributionState !== "idle" ? "opacity-0" : "opacity-100"
            }`}
            style={{
              paddingLeft: contributionState === "idle" ? "0rem" : "0",
              paddingRight: contributionState === "idle" ? "0rem" : "0",
            }}
          />

          <div
            className={`absolute right-3 top-1/2 -translate-y-1/2 z-30 transition-opacity duration-300 ${
              contributionState !== "idle" ? "opacity-0" : "opacity-100"
            }`}
          >
            <button
              onClick={() => {
                triggerHapticFeedback();
                onSubmit();
              }}
              disabled={!inputText}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed btn-interactive btn-ripple"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }
);

InputArea.displayName = "InputArea";

export default InputArea;
