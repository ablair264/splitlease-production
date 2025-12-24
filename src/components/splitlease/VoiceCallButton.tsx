"use client";

import { useState, useCallback } from "react";
import { useConversation } from "@elevenlabs/react";
import { Phone, PhoneOff, Mic, MicOff, X, Volume2, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || "agent_8801kcb1gzjeea68jhcgezfh48n6";
const colors = {
  dark: "#0f1419",
  mid: "#1a1f2a",
  accent: "#79d5e9",
};

interface VoiceCallButtonProps {
  className?: string;
  variant?: "header" | "cta" | "mobile";
  style?: React.CSSProperties;
}

export default function VoiceCallButton({ className = "", variant = "header", style }: VoiceCallButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);

  const conversation = useConversation({
    micMuted,
    onConnect: () => {
      setError(null);
    },
    onDisconnect: () => {
      // Conversation ended
    },
    onError: (error) => {
      console.error("Conversation error:", error);
      setError("Connection error. Please try again.");
    },
    onMessage: (message) => {
      if (message.source === "user" && message.message) {
        setMessages((prev) => [...prev, { role: "user", text: message.message }]);
      } else if (message.source === "ai" && message.message) {
        setMessages((prev) => [...prev, { role: "assistant", text: message.message }]);
      }
    },
  });

  const { status, isSpeaking } = conversation;
  const isConnected = status === "connected";

  const requestMicrophoneAccess = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (err) {
      setError("Microphone access is required for voice calls. Please allow access and try again.");
      return false;
    }
  };

  const startCall = useCallback(async () => {
    setError(null);
    setMessages([]);

    const hasAccess = await requestMicrophoneAccess();
    if (!hasAccess) return;

    try {
      await conversation.startSession({
        agentId: AGENT_ID,
        connectionType: "webrtc" as const,
      });
    } catch (err) {
      console.error("Failed to start conversation:", err);
      setError("Failed to connect. Please try again.");
    }
  }, [conversation]);

  const endCall = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch (err) {
      console.error("Error ending conversation:", err);
    }
  }, [conversation]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setError(null);
    setMessages([]);
  };

  const handleCloseModal = async () => {
    if (isConnected) {
      await endCall();
    }
    setIsModalOpen(false);
    setMessages([]);
  };

  // Render different button styles based on variant
  const renderButton = () => {
    if (variant === "cta") {
      return (
        <button
          onClick={handleOpenModal}
          className={`flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 font-medium text-blue-700 transition-colors hover:bg-blue-50 ${className}`}
          style={style}
        >
          <Phone className="h-4 w-4" />
          Speak To Us
        </button>
      );
    }

    if (variant === "mobile") {
      return (
        <button
          onClick={handleOpenModal}
          className={className}
          style={style}
        >
          <Mic className="h-5 w-5" />
          Speak To Us
        </button>
      );
    }

    // header variant
    return (
      <button
        onClick={handleOpenModal}
        className={className}
        style={style}
      >
        <Mic className="h-4 w-4" />
        Speak To Us
      </button>
    );
  };

  return (
    <>
      {renderButton()}

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={handleCloseModal}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-[92vw] max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[rgba(26,31,42,0.95)] to-[rgba(15,20,25,0.98)] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.55)]"
            >
              {/* Header */}
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Voice Assistant</h2>
                  <p className="text-sm text-white/60">
                    {isConnected ? "Connected - speak naturally" : "Click to start a voice call"}
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="rounded-full bg-white/5 p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Error message */}
              {error && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
                  {error}
                </div>
              )}

              {/* Call status visualization */}
              <div className="mb-6 flex flex-col items-center justify-center py-8">
                <div
                  className={`relative mb-4 flex h-24 w-24 items-center justify-center rounded-full ${
                    isConnected
                      ? isSpeaking
                        ? "bg-[rgba(121,213,233,0.2)]"
                        : "bg-[rgba(0,231,220,0.15)]"
                      : "bg-white/5"
                  }`}
                >
                  {/* Animated rings when speaking */}
                  {isConnected && isSpeaking && (
                    <>
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{ backgroundColor: "rgba(121,213,233,0.3)" }}
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{ backgroundColor: "rgba(121,213,233,0.2)" }}
                        animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                      />
                    </>
                  )}

                  {/* Listening indicator */}
                  {isConnected && !isSpeaking && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2"
                      style={{ borderColor: colors.accent }}
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}

                  <Volume2
                    className="h-10 w-10"
                    style={{
                      color: isConnected
                        ? isSpeaking
                          ? "#00e7dc"
                          : colors.accent
                        : "rgba(255,255,255,0.4)",
                    }}
                  />
                </div>

                <p className="text-sm font-medium text-white">
                  {!isConnected && "Ready to connect"}
                  {isConnected && isSpeaking && "Assistant is speaking..."}
                  {isConnected && !isSpeaking && "Listening..."}
                </p>
              </div>

              {/* Transcript */}
              {messages.length > 0 && (
                <div className="mb-6 max-h-40 overflow-y-auto rounded-lg border border-white/5 bg-white/5 p-3">
                  {messages.slice(-4).map((msg, idx) => (
                    <div
                      key={idx}
                      className="mb-2 text-sm"
                      style={{ color: msg.role === "user" ? "rgba(255,255,255,0.8)" : colors.accent }}
                    >
                      <span className="font-medium">
                        {msg.role === "user" ? "You: " : "Assistant: "}
                      </span>
                      {msg.text}
                    </div>
                  ))}
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                {!isConnected ? (
                  <button
                    onClick={startCall}
                    className="flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-[#0b1a1f] transition-all"
                    style={{ backgroundColor: colors.accent, boxShadow: "0 10px 30px rgba(121,213,233,0.25)" }}
                  >
                    <Phone className="h-5 w-5" />
                    Start Call
                  </button>
                ) : (
                  <>
                    {/* Mute toggle */}
                    <button
                      onClick={() => setMicMuted(!micMuted)}
                      className={`rounded-full p-3 transition-colors border border-white/10 ${
                        micMuted
                          ? "bg-red-500/20 text-red-200 hover:bg-red-500/30"
                          : "bg-white/5 text-white hover:bg-white/10"
                      }`}
                    >
                      {micMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </button>

                    {/* End call */}
                    <button
                      onClick={endCall}
                      className="flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-red-700"
                    >
                      <PhoneOff className="h-5 w-5" />
                      End Call
                    </button>
                  </>
                )}
              </div>

              {/* Footer */}
              <p className="mt-6 text-center text-xs text-white/40">
                Powered by ElevenLabs AI
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
