"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Car,
  Zap,
  Truck,
  Clock,
  PoundSterling,
  Fuel,
  Sparkles,
  ChevronRight,
  Loader2,
  Bot,
  User,
  ArrowRight,
  Search,
} from "lucide-react";
import Link from "next/link";

const colors = {
  dark: "#0f1419",
  darkMid: "#1a1f2a",
  darkLight: "#2c3e50",
  accent: "#79d5e9",
  accentOrange: "#f77d11",
  text: "#ffffff",
  textMuted: "rgba(255, 255, 255, 0.7)",
};

const quickActions = [
  { icon: Car, label: "Family SUV", query: "I'm looking for a family SUV with good fuel economy" },
  { icon: Zap, label: "Electric", query: "Show me electric vehicles with the longest range" },
  { icon: PoundSterling, label: "Under £300", query: "What cars can I lease for under £300 per month?" },
  { icon: Truck, label: "Vans", query: "I need a large van for my business" },
  { icon: Clock, label: "Quick delivery", query: "What vehicles are available for quick delivery?" },
  { icon: Fuel, label: "Hybrid", query: "Show me hybrid cars with low CO2 emissions" },
];

interface VehicleResult {
  id: string;
  manufacturer: string;
  model: string;
  derivative: string;
  monthlyPrice: number;
  fuelType: string;
  bodyType?: string;
  transmission?: string;
  imageFolder?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  vehicles?: VehicleResult[];
  isTyping?: boolean;
}

const R2_BASE_URL = "https://pub-112aac78c28540e8804e41f113416d30.r2.dev/gateway2lease";

export default function VehicleChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [displayedVehicles, setDisplayedVehicles] = useState<VehicleResult[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: "Hi! I'm your SplitLease assistant. Tell me what you're looking for and I'll find the perfect vehicle for you.",
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, messages.length]);

  // Conversation history for context
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);

  // Call OpenAI-powered smart search API
  const generateResponse = useCallback(async (query: string): Promise<{ content: string; vehicles?: VehicleResult[] }> => {
    try {
      const response = await fetch("/api/smart-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: query }],
          history: conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      // Update conversation history
      setConversationHistory((prev) => [
        ...prev,
        { role: "user", content: query },
        { role: "assistant", content: data.message },
      ]);

      return {
        content: data.message,
        vehicles: data.vehicles?.map((v: any) => ({
          id: v.id,
          manufacturer: v.manufacturer,
          model: v.model,
          derivative: v.derivative,
          monthlyPrice: v.monthlyPrice,
          fuelType: v.fuelType,
          bodyType: v.bodyType,
          transmission: v.transmission,
          imageFolder: v.imageFolder,
        })),
      };
    } catch (error) {
      console.error("Smart search error:", error);
      return {
        content: "I'm having trouble searching right now. Please try again or browse our vehicles directly.",
      };
    }
  }, [conversationHistory]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    setHasInteracted(true);
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    const typingId = `typing-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: typingId, role: "assistant", content: "", timestamp: new Date(), isTyping: true },
    ]);

    await new Promise((resolve) => setTimeout(resolve, 500));
    const response = await generateResponse(content);

    setMessages((prev) => [
      ...prev.filter((m) => m.id !== typingId),
      {
        id: Date.now().toString(),
        role: "assistant",
        content: response.content,
        timestamp: new Date(),
        vehicles: response.vehicles,
      },
    ]);

    if (response.vehicles) {
      setDisplayedVehicles(response.vehicles);
    }

    setIsLoading(false);
  }, [isLoading, generateResponse]);

  const handleQuickAction = useCallback((query: string) => {
    handleSendMessage(query);
  }, [handleSendMessage]);

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, type: "spring" }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 left-6 z-40 flex items-center gap-3 rounded-full px-5 py-3 shadow-lg transition-all hover:scale-105 ${
          isOpen ? "pointer-events-none opacity-0" : ""
        }`}
        style={{ backgroundColor: colors.accent }}
      >
        <Search size={20} className="text-black" />
        <span className="text-sm font-semibold text-black">Smart Search</span>
        {!hasInteracted && (
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: colors.accent }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.button>

      {/* Full Panel Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 z-50 flex w-full max-w-5xl shadow-2xl"
              style={{ backgroundColor: colors.dark }}
            >
              {/* Chat Section */}
              <div className="flex w-[380px] flex-shrink-0 flex-col border-r border-white/10">
                {/* Header */}
                <div
                  className="flex items-center justify-between border-b border-white/10 px-4 py-4"
                  style={{ backgroundColor: colors.darkMid }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${colors.accent}20` }}
                    >
                      <Sparkles size={20} style={{ color: colors.accent }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">SmartSearch</h3>
                      <p className="text-xs text-white/60">AI-powered vehicle finder</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                      >
                        <div
                          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                            message.role === "user" ? "bg-white/10" : ""
                          }`}
                          style={{
                            backgroundColor: message.role === "assistant" ? `${colors.accent}20` : undefined,
                          }}
                        >
                          {message.role === "assistant" ? (
                            <Bot size={16} style={{ color: colors.accent }} />
                          ) : (
                            <User size={16} className="text-white/60" />
                          )}
                        </div>

                        <div className={`max-w-[85%] ${message.role === "user" ? "text-right" : ""}`}>
                          {message.isTyping ? (
                            <div
                              className="inline-flex items-center gap-1 rounded-2xl px-4 py-3"
                              style={{ backgroundColor: colors.darkMid }}
                            >
                              <motion.span className="h-2 w-2 rounded-full bg-white/40" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }} />
                              <motion.span className="h-2 w-2 rounded-full bg-white/40" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} />
                              <motion.span className="h-2 w-2 rounded-full bg-white/40" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} />
                            </div>
                          ) : (
                            <div
                              className={`inline-block rounded-2xl px-4 py-3 text-sm ${
                                message.role === "user" ? "text-black" : "text-white"
                              }`}
                              style={{
                                backgroundColor: message.role === "user" ? colors.accent : colors.darkMid,
                              }}
                            >
                              <p className="whitespace-pre-wrap">{message.content}</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Quick actions */}
                  {messages.length === 1 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="mt-6"
                    >
                      <p className="mb-3 text-xs text-white/40">Quick searches:</p>
                      <div className="flex flex-wrap gap-2">
                        {quickActions.map((action) => {
                          const Icon = action.icon;
                          return (
                            <button
                              key={action.label}
                              onClick={() => handleQuickAction(action.query)}
                              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                            >
                              <Icon size={12} style={{ color: colors.accent }} />
                              {action.label}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Input */}
                <div className="border-t border-white/10 p-4" style={{ backgroundColor: colors.darkMid }}>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage(inputValue);
                    }}
                    className="flex items-center gap-3"
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(inputValue);
                        }
                      }}
                      placeholder="Describe your ideal vehicle..."
                      className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 transition-all focus:border-white/20 focus:outline-none"
                      disabled={isLoading}
                    />
                    <button
                      type="submit"
                      disabled={!inputValue.trim() || isLoading}
                      className="flex h-11 w-11 items-center justify-center rounded-xl transition-all disabled:opacity-50"
                      style={{
                        backgroundColor: inputValue.trim() && !isLoading ? colors.accent : `${colors.accent}40`,
                      }}
                    >
                      {isLoading ? (
                        <Loader2 size={18} className="animate-spin text-black" />
                      ) : (
                        <Send size={18} className="text-black" />
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Results Section */}
              <div className="flex-1 overflow-y-auto" style={{ backgroundColor: colors.dark }}>
                {displayedVehicles.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                    <div
                      className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: `${colors.accent}10` }}
                    >
                      <Car size={32} style={{ color: colors.accent }} />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Search Results</h3>
                    <p className="mt-2 max-w-sm text-sm text-white/60">
                      Tell me what you're looking for and I'll show matching vehicles here
                    </p>
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white">
                        {displayedVehicles.length} Results Found
                      </h3>
                      <Link
                        href="/cars"
                        className="flex items-center gap-1 text-sm font-medium transition-colors hover:text-white"
                        style={{ color: colors.accent }}
                      >
                        View all
                        <ArrowRight size={14} />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {displayedVehicles.map((vehicle) => (
                        <Link
                          key={vehicle.id}
                          href={`/cars/${vehicle.id}`}
                          onClick={() => setIsOpen(false)}
                          className="group overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all hover:border-white/20 hover:bg-white/10"
                        >
                          <div className="aspect-[4/3] overflow-hidden bg-white/5">
                            {vehicle.imageFolder ? (
                              <img
                                src={`${R2_BASE_URL}/${vehicle.imageFolder}/front_view.webp`}
                                alt={`${vehicle.manufacturer} ${vehicle.model}`}
                                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                onError={(e) => {
                                  e.currentTarget.src = "/images/car-placeholder.webp";
                                }}
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Car size={40} className="text-white/20" />
                              </div>
                            )}
                          </div>
                          <div className="p-3">
                            <p className="text-xs text-white/50">{vehicle.manufacturer}</p>
                            <p className="font-medium text-white">{vehicle.model}</p>
                            <p className="mt-0.5 truncate text-xs text-white/60">{vehicle.derivative}</p>
                            <div className="mt-2 flex items-center justify-between">
                              <div>
                                <span className="text-lg font-bold" style={{ color: colors.accent }}>
                                  £{vehicle.monthlyPrice}
                                </span>
                                <span className="text-xs text-white/40">/mo</span>
                              </div>
                              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">
                                {vehicle.fuelType}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>

                    <Link
                      href="/cars"
                      onClick={() => setIsOpen(false)}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-black transition-all hover:scale-[1.02]"
                      style={{ backgroundColor: colors.accent }}
                    >
                      Browse All Vehicles
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
