"use client";

import React, { useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Post } from "@/lib/supabase";
import { GeneratedAvatar } from "@/components/generated-avatar";

interface ShareCardProps {
  post: Post;
  language: string;
}

export default function ShareCard({ post, language }: ShareCardProps) {
  const t = {
    zh: {
      anonymous: "匿名",
      slogan: "倾听世界内心的声音",
      appName: "星际回响",
    },
    en: {
      anonymous: "Anonymous",
      slogan: "Listen to the world's inner voice",
      appName: "STARSECHOES",
    },
    ja: {
      anonymous: "匿名",
      slogan: "世界の内なる声に耳を傾ける",
      appName: "星のこだま",
    },
    ko: {
      anonymous: "익명",
      slogan: "세상의 내면의 소리를 듣다",
      appName: "별의 메아리",
    },
    fr: {
      anonymous: "Anonyme",
      slogan: "Écoutez la voix intérieure du monde",
      appName: "ÉCHOS DES ÉTOILES",
    },
    es: {
      anonymous: "Anónimo",
      slogan: "Escucha la voz interior del mundo",
      appName: "ECOS DE ESTRELLAS",
    },
  }[language] || {
    anonymous: "Anonymous",
    slogan: "Listen to the world's inner voice",
    appName: "STARSECHOES",
  };

  // Generate stars
  const stars = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.8 + 0.2,
      animationDelay: `${Math.random() * 3}s`,
    }));
  }, []);

  // Generate Tree Particles (Leaves)
  const treeLeaves = useMemo(() => {
    const leaves = [];
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FFEEAD",
      "#D4A5A5",
      "#9B59B6",
      "#3498DB",
      "#E056FD",
      "#F0932B",
    ];

    // Create a compact crown shape for Small tree
    for (let i = 0; i < 120; i++) {
      const r = 60 * Math.sqrt(Math.random());
      const theta = Math.random() * 2 * Math.PI;

      const x = 100 + r * Math.cos(theta);
      const y = 90 + r * Math.sin(theta) * 0.8;

      // Only keep leaves that are somewhat within bounds or slightly out
      if (y < 160) {
        leaves.push({
          cx: x,
          cy: y,
          r: Math.random() * 2.5 + 1, // Smaller leaves for "small-leaf banyan"
          fill: colors[Math.floor(Math.random() * colors.length)],
          opacity: Math.random() * 0.6 + 0.4,
        });
      }
    }
    return leaves;
  }, []);

  const appUrl = "https://earthechoes.dufran.cn";

  return (
    <div className="dark relative w-full aspect-[4/5] bg-[#02040a] overflow-hidden flex flex-col">
      {/* Background: Black with hint of blue */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-[#1a237e]/30 via-[#050b24] to-black" />

      {/* Stars */}
      <div className="absolute inset-0">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              left: star.left,
              top: star.top,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              animationDelay: star.animationDelay,
              animationDuration: "3s",
            }}
          />
        ))}
      </div>

      {/* Colorful Tree SVG Background */}
      <div className="absolute bottom-0 left-0 right-0 h-[85%] pointer-events-none opacity-80 mix-blend-screen">
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full"
          preserveAspectRatio="xMidYMax slice"
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="trunkGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3e2723" />
              <stop offset="50%" stopColor="#5d4037" />
              <stop offset="100%" stopColor="#3e2723" />
            </linearGradient>
          </defs>

          {/* Small Tree Trunk */}
          <path
            d="M95,200 Q98,170 99,140 L101,140 Q102,170 105,200 Z"
            fill="url(#trunkGradient)"
            opacity="0.9"
          />

          {/* Small Branches */}
          <g stroke="#5d4037" fill="none" opacity="0.8" strokeLinecap="round">
            <path d="M100,140 Q80,120 70,100" strokeWidth="2" />
            <path d="M100,140 Q120,120 130,100" strokeWidth="2" />
            <path d="M100,140 Q90,110 90,80" strokeWidth="1.5" />
            <path d="M100,140 Q110,110 110,80" strokeWidth="1.5" />
            <path d="M100,140 Q100,110 100,70" strokeWidth="1.5" />
          </g>

          {/* Leaves */}
          <g filter="url(#glow)">
            {treeLeaves.map((leaf, i) => (
              <circle
                key={i}
                cx={leaf.cx}
                cy={leaf.cy}
                r={leaf.r}
                fill={leaf.fill}
                opacity={leaf.opacity}
              />
            ))}
          </g>
        </svg>
      </div>

      {/* Content Layer */}
      <div className="relative z-10 flex-1 flex flex-col p-6 justify-between bg-black/10 backdrop-blur-[1px]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            <GeneratedAvatar
              seed={post.user?.nickname || "User"}
              className="w-full h-full"
            />
          </div>
          <div>
            <h3 className="text-white font-medium text-lg drop-shadow-md">
              {post.user?.nickname || t.anonymous}
            </h3>
            <p className="text-white/60 text-xs drop-shadow-sm">
              {new Date(post.created_at).toLocaleDateString(
                language === "zh"
                  ? "zh-CN"
                  : language === "ja"
                  ? "ja-JP"
                  : "en-US"
              )}
            </p>
          </div>
        </div>

        {/* Quote/Content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative">
            <span className="absolute -top-6 -left-4 text-6xl text-white/20 font-serif">
              "
            </span>
            <p className="text-white text-xl leading-relaxed font-bold text-center px-4 drop-shadow-lg text-shadow-sm">
              {post.content}
            </p>
            <span className="absolute -bottom-8 -right-4 text-6xl text-white/20 font-serif rotate-180">
              "
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-end justify-between pt-6 border-t border-white/10">
          <div>
            <h4 className="text-white font-bold text-lg tracking-wider drop-shadow-md uppercase">
              {t.appName}
            </h4>
            <p className="text-white/40 text-xs mt-1 drop-shadow-sm">
              {t.slogan}
            </p>
          </div>
          <div className="bg-white p-1.5 rounded-lg shadow-lg">
            <QRCodeSVG
              value={`${appUrl}?post=${post.id}`}
              size={60}
              level="M"
              fgColor="#000000"
              bgColor="#FFFFFF"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
