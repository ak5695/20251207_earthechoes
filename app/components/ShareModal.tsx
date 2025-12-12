"use client";

import React, { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { X, Download, Share2 } from "lucide-react";
import { Post } from "@/lib/supabase";
import ShareCard from "@/app/components/ShareCard";
import { triggerHapticFeedback } from "../utils/haptics";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  language: string;
}

const translations: Record<string, Record<string, string>> = {
  zh: {
    share: "分享心情",
    download: "保存图片",
    downloading: "保存中...",
    shareText: "分享",
  },
  en: {
    share: "Share Mood",
    download: "Save Image",
    downloading: "Saving...",
    shareText: "Share",
  },
  ja: {
    share: "気持ちをシェア",
    download: "画像を保存",
    downloading: "保存中...",
    shareText: "シェア",
  },
  ko: {
    share: "기분 공유",
    download: "이미지 저장",
    downloading: "저장 중...",
    shareText: "공유",
  },
  fr: {
    share: "Partager l'humeur",
    download: "Enregistrer l'image",
    downloading: "Enregistrement...",
    shareText: "Partager",
  },
  es: {
    share: "Compartir estado",
    download: "Guardar imagen",
    downloading: "Guardando...",
    shareText: "Compartir",
  },
};

export default function ShareModal({
  isOpen,
  onClose,
  post,
  language,
}: ShareModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const t = translations[language] || translations.en;

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!cardRef.current || isDownloading) return;

    try {
      setIsDownloading(true);
      triggerHapticFeedback();

      // Wait for fonts and images to load
      await new Promise((resolve) => setTimeout(resolve, 100));

      const dataUrl = await toPng(cardRef.current, {
        quality: 1.0,
        pixelRatio: 3,
        cacheBust: true,
      });

      const link = document.createElement("a");
      link.download = `earth-echoes-${post.id.slice(0, 8)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error generating image:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current || isDownloading) return;

    try {
      setIsDownloading(true);
      triggerHapticFeedback();

      const dataUrl = await toPng(cardRef.current, {
        quality: 1.0,
        pixelRatio: 3,
      });

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "earth-echoes-share.png", {
        type: "image/png",
      });

      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: "Earth Echoes",
          text: post.content,
        });
      } else {
        // Fallback to download if Web Share API is not supported
        handleDownload();
      }
    } catch (err) {
      console.error("Error sharing:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm animate-scale-in">
        {/* Header */}
        <div className="w-full flex items-center justify-between text-white px-2">
          <h3 className="text-lg font-medium">{t.share}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Card Preview */}
        <div className="relative w-full shadow-2xl rounded-2xl overflow-hidden">
          <div ref={cardRef}>
            <ShareCard post={post} language={language} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 w-full">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50"
          >
            {isDownloading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
            <span className="font-medium">
              {isDownloading ? t.downloading : t.download}
            </span>
          </button>

          {typeof navigator !== "undefined" && "share" in navigator && (
            <button
              onClick={handleShare}
              disabled={isDownloading}
              className="flex-1 flex items-center justify-center gap-2 bg-white text-black hover:bg-white/90 py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50"
            >
              <Share2 className="w-5 h-5" />
              <span className="font-medium">{t.shareText}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
