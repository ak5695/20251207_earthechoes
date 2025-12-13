"use client";

import { Bell, CircleAlert, Compass } from "lucide-react";
import { GeneratedAvatar } from "@/components/generated-avatar";
import type { User } from "@/lib/supabase";
import { triggerHapticFeedback } from "../utils/haptics";

interface HeaderProps {
  currentUser: User | null;
  unreadNotifications: number;
  isMusicPlaying: boolean;
  isMusicLoading: boolean;
  onToggleMusic: () => void;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onOpenUserSetup: () => void;
  onOpenInfo: () => void;
  onOpenExplore: () => void;
}

export default function Header({
  currentUser,
  unreadNotifications,
  isMusicPlaying,
  isMusicLoading,
  onToggleMusic,
  onOpenNotifications,
  onOpenProfile,
  onOpenUserSetup,
  onOpenInfo,
  onOpenExplore,
}: HeaderProps) {
  return (
    <div className="flex justify-between items-start pointer-events-auto">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity cursor-pointer">
          <span className="text-base md:text-lg font-bold tracking-wider text-white/60">
            Echoes of the Stars
          </span>
        </div>

        {/* 音乐控制按钮 */}
        <button
          onClick={() => {
            triggerHapticFeedback();
            onToggleMusic();
          }}
          disabled={isMusicLoading}
          className={`w-10 h-10 flex items-center justify-center gap-[2px] text-indigo-300/60 hover:text-indigo-300 transition-colors btn-icon ${
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

      {/* 右侧 - 通知和用户 */}
      <div className="flex items-start gap-3">
        {/* 通知按钮 */}
        {currentUser && (
          <button
            onClick={() => {
              triggerHapticFeedback();
              onOpenNotifications();
            }}
            className="relative w-10 h-10 flex items-center justify-center text-white/50 hover:text-white transition-colors btn-icon"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
          </button>
        )}

        <div className="flex flex-col items-center gap-2">
          {/* 用户头像/登录按钮 */}
          <button
            onClick={() => {
              triggerHapticFeedback();
              if (currentUser) {
                onOpenProfile();
              } else {
                onOpenUserSetup();
              }
            }}
            className="relative w-10 h-10 rounded-full border flex items-center justify-center overflow-hidden bg-white/20 hover:bg-white/30 transition-colors btn-icon p-0"
          >
            {currentUser ? (
              <>
                <GeneratedAvatar
                  seed={currentUser.nickname}
                  className="w-[38px] h-[38px] cursor-pointer"
                />
                {unreadNotifications > 0 && (
                  <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center px-1 border-2 border-black">
                    <span className="text-[10px] font-bold text-white leading-none">
                      {unreadNotifications > 99 ? "99+" : unreadNotifications}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <svg
                className="w-5 h-5 text-white/60"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            )}
          </button>
        <div className="flex flex-col items-center gap-2">

        </div>
         
        </div>
      </div>
    </div>
  );
}
