"use client";

import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { Post } from "@/lib/supabase";
import { GeneratedAvatar } from "@/components/generated-avatar";

interface ShareCardProps {
  post: Post;
  language: string;
}

export default function ShareCard({ post, language }: ShareCardProps) {
  // Generate stars for background
  const stars = React.useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.7 + 0.3,
    }));
  }, []);

  const appUrl = "https://earthechoes.dufran.cn";

  return (
    <div className="dark relative w-full aspect-[4/5] bg-gradient-to-b from-[#0B1026] to-[#2B32B2] p-6 flex flex-col justify-between overflow-hidden">
      {/* Starry Background */}
      <div className="absolute inset-0 pointer-events-none">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-white"
            style={{
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20">
            <GeneratedAvatar
              seed={post.user?.nickname || "User"}
              className="w-full h-full"
            />
          </div>
          <div>
            <h3 className="text-white font-medium text-lg">
              {post.user?.nickname || "Anonymous"}
            </h3>
            <p className="text-white/60 text-xs">
              {new Date(post.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Quote/Content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative">
            <span className="absolute -top-6 -left-4 text-6xl text-white/10 font-serif">
              "
            </span>
            <p className="text-white text-xl leading-relaxed font-light text-center px-4">
              {post.content}
            </p>
            <span className="absolute -bottom-8 -right-4 text-6xl text-white/10 font-serif rotate-180">
              "
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 flex items-end justify-between pt-6 border-t border-white/10">
        <div>
          <h4 className="text-white font-bold text-lg tracking-wider">
            EARTH ECHOES
          </h4>
          <p className="text-white/40 text-xs mt-1">
            Listen to the world's inner voice
          </p>
        </div>
        <div className="bg-white p-1.5 rounded-lg">
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
  );
}
