"use client";

import { useState, useEffect } from "react";
import Lottie from "lottie-react";
import loaderAnimation from "@/../public/animations/loader.json";

const DEFAULT_MESSAGES = [
  "Loading...",
  "Fetching data...",
  "Almost there...",
];

interface AdminLoadingModalProps {
  isLoading?: boolean;
  messages?: string[];
}

export function AdminLoadingModal({
  isLoading = true,
  messages = DEFAULT_MESSAGES
}: AdminLoadingModalProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // Cycle through messages
  useEffect(() => {
    if (!isLoading) {
      setMessageIndex(0);
      setProgress(0);
      return;
    }

    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 1500);

    return () => clearInterval(messageInterval);
  }, [isLoading, messages.length]);

  // Animate progress bar
  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      return;
    }

    // Simulate progress that slows down as it approaches 90%
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        const increment = Math.max(1, (90 - prev) / 10);
        return Math.min(90, prev + increment);
      });
    }, 100);

    return () => clearInterval(progressInterval);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0f1419]/80 backdrop-blur-sm"
        style={{ animation: "adminFadeIn 0.2s ease-out" }}
      />

      {/* Modal */}
      <div
        className="relative flex flex-col items-center gap-6 p-8 rounded-2xl"
        style={{
          background: "linear-gradient(180deg, rgba(22, 28, 36, 0.95) 0%, rgba(15, 20, 25, 0.98) 100%)",
          border: "1px solid rgba(121, 213, 233, 0.2)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(121, 213, 233, 0.1)",
          animation: "adminScaleIn 0.3s ease-out",
          minWidth: "280px",
        }}
      >
        {/* Lottie Animation */}
        <div className="w-24 h-24">
          <Lottie
            animationData={loaderAnimation}
            loop={true}
            autoplay={true}
            style={{ width: "100%", height: "100%" }}
          />
        </div>

        {/* Loading Text */}
        <div
          className="text-white/90 font-medium text-sm h-5 transition-opacity duration-300"
          key={messageIndex}
          style={{ animation: "adminFadeInUp 0.3s ease-out" }}
        >
          {messages[messageIndex]}
        </div>

        {/* Progress Bar */}
        <div className="w-full">
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ background: "rgba(255, 255, 255, 0.1)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-100 ease-out"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #1e8d8d 0%, #79d5e9 100%)",
                boxShadow: "0 0 10px rgba(121, 213, 233, 0.5)",
              }}
            />
          </div>
          <div className="mt-2 text-center text-[10px] text-white/40 font-medium">
            {Math.round(progress)}%
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes adminFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes adminScaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes adminFadeInUp {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
