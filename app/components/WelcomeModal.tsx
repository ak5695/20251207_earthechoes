"use client";

import React, { useState, useEffect } from "react";
import { Globe, ChevronDown } from "lucide-react";
import { TypingAnimationLite } from "@/components/ui/typing-animation-lite";
import {
  translations,
  Language,
  TranslationStrings,
} from "../config/translations";
import { triggerHapticFeedback } from "../utils/haptics";

interface WelcomeModalProps {
  language: Language;
  isClosing: boolean;
  onClose: () => void;
  onLanguageChange: (lang: Language) => void;
}

export default function WelcomeModal({
  language,
  isClosing,
  onClose,
  onLanguageChange,
}: WelcomeModalProps) {
  const [showLangMenu, setShowLangMenu] = useState(false);
  const t = translations[language];

  useEffect(() => {
    console.log("WelcomeModal: language changed to", language);
  }, [language]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      {/* 背景遮罩 */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm ${
          isClosing ? "animate-backdrop-exit" : "animate-backdrop-enter"
        }`}
      />

      {/* 欢迎卡片 - 外层浮动，内层进出动画 */}
      <div className="w-full max-w-[420px]">
        <div
          className={`relative bg-black/70 border border-white/20 rounded-2xl p-6 sm:p-8 w-full shadow-2xl ${
            isClosing ? "animate-card-exit" : "animate-card-enter-float"
          }`}
        >
          {/* 语言选择器 */}
          <div className="absolute top-4 right-4">
            <div className="relative">
              <button
                onClick={() => {
                  triggerHapticFeedback();
                  setShowLangMenu(!showLangMenu);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/60 hover:text-white/80 text-sm transition-colors btn-interactive"
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
                        triggerHapticFeedback();
                        onLanguageChange(lang);
                        setShowLangMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors btn-interactive ${
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
              <div className="absolute inset-0 bg-yellow-400 rounded-full blur-xl opacity-30"></div>
              <svg
                viewBox="0 0 1024 1024"
                className="relative w-16 h-16 drop-shadow-lg"
              >
                <path
                  d="M602.24 246.72a17.28 17.28 0 0 0-11.84-16.32l-42.88-14.4A90.56 90.56 0 0 1 490.24 160l-14.4-42.88a17.28 17.28 0 0 0-32 0L428.8 160a90.56 90.56 0 0 1-57.28 57.28l-42.88 14.4a17.28 17.28 0 0 0 0 32l42.88 14.4a90.56 90.56 0 0 1 57.28 57.28l14.4 42.88a17.28 17.28 0 0 0 32 0l14.4-42.88a90.56 90.56 0 0 1 57.28-57.28l42.88-14.4a17.28 17.28 0 0 0 12.48-16.96z m301.12 221.76l-48.32-16a101.44 101.44 0 0 1-64-64l-16-48.32a19.2 19.2 0 0 0-36.8 0l-16 48.32a101.44 101.44 0 0 1-64 64l-48.32 16a19.2 19.2 0 0 0 0 36.8l48.32 16a101.44 101.44 0 0 1 64 64l16 48.32a19.2 19.2 0 0 0 36.8 0l16-48.32a101.44 101.44 0 0 1 64-64l48.32-16a19.2 19.2 0 0 0 0-36.8z m-376.64 195.52l-64-20.8a131.84 131.84 0 0 1-83.52-83.52l-20.8-64a25.28 25.28 0 0 0-47.68 0l-20.8 64a131.84 131.84 0 0 1-82.24 83.52l-64 20.8a25.28 25.28 0 0 0 0 47.68l64 20.8a131.84 131.84 0 0 1 83.52 83.84l20.8 64a25.28 25.28 0 0 0 47.68 0l20.8-64a131.84 131.84 0 0 1 83.52-83.52l64-20.8a25.28 25.28 0 0 0 0-47.68z"
                  fill="#f4ea29"
                />
              </svg>
            </div>
            {/* 固定高度的标题区域 */}
            <div className="h-8 mb-4 min-w-0">
              <TypingAnimationLite
                key={`title-${language}`}
                duration={80}
                delay={200}
                showCursor={false}
                className="text-xl md:text-2xl font-light text-white/90 whitespace-nowrap overflow-hidden"
              >
                {t.welcomeTitle}
              </TypingAnimationLite>
            </div>
            {/* 固定高度的文字区域 */}
            <div className="h-32 sm:h-28 flex flex-col justify-start min-w-0">
              <div className="text-white/50 text-sm leading-relaxed mb-2 min-h-[3rem] sm:min-h-[2.5rem]">
                <TypingAnimationLite
                  key={`text1-${language}`}
                  duration={50}
                  delay={600}
                  showCursor={false}
                  className="text-white/50 text-sm leading-relaxed"
                >
                  {t.welcomeText1}
                </TypingAnimationLite>
              </div>
              <div className="text-white/50 text-sm leading-relaxed min-h-[3rem] sm:min-h-[2.5rem]">
                <TypingAnimationLite
                  key={`text2-${language}`}
                  duration={50}
                  delay={1200}
                  showCursor={false}
                  className="text-white/50 text-sm leading-relaxed"
                >
                  {t.welcomeText2}
                </TypingAnimationLite>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHapticFeedback();
              onClose();
            }}
            className="w-full py-3 bg-transparent hover:bg-white/5 border border-white/30 hover:border-white/50 rounded-xl text-white/80 hover:text-white font-medium transition-colors btn-glow btn-ripple"
          >
            {t.startButton}
          </button>
        </div>
      </div>
    </div>
  );
}
