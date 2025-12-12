"use client";

import React, { useEffect, useState } from "react";
import { X, Download } from "lucide-react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if it's iOS
    const isIosDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)"
    ).matches;

    if (isIosDevice && !isStandalone) {
      setIsIOS(true);
      // Only show iOS prompt once per session or check local storage
      const hasSeenPrompt = sessionStorage.getItem("iosInstallPromptSeen");
      if (!hasSeenPrompt) {
        setShowPrompt(true);
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleClose = () => {
    setShowPrompt(false);
    if (isIOS) {
      sessionStorage.setItem("iosInstallPromptSeen", "true");
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-2xl flex flex-col gap-3 animate-in slide-in-from-bottom-10 fade-in duration-500">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shrink-0">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-white">Install App</h3>
              <p className="text-sm text-slate-400">
                {isIOS
                  ? "Install for a better experience"
                  : "Install for a better experience"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isIOS ? (
          <div className="text-sm text-slate-300 bg-slate-800/50 p-3 rounded-lg">
            <p>
              Tap <span className="inline-block px-1">Share</span> and then{" "}
              <span className="font-semibold">Add to Home Screen</span>
            </p>
          </div>
        ) : (
          <button
            onClick={handleInstallClick}
            className="w-full py-2 px-4 bg-white text-black font-medium rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Install Now
          </button>
        )}
      </div>
    </div>
  );
}
