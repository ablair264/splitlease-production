"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Loader2, Sparkles, RefreshCw } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

const quickActions = [
  { label: "Market Summary", query: "Give me a summary of the current market" },
  { label: "Price Comparison", query: "How do our prices compare to competitors?" },
  { label: "Best Opportunities", query: "What are our best opportunities right now?" },
  { label: "EV Market", query: "What's the electric vehicle landscape looking like?" },
  { label: "Special Offer Ideas", query: "Suggest vehicles we should feature as special offers" },
];

export function IntelligenceChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Add welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content:
            "Hi! I'm your market intelligence assistant. Ask me about competitor pricing, market trends, or what vehicles to feature as special offers.",
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Add placeholder for assistant message
    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      },
    ]);

    try {
      const response = await fetch("/api/admin/intelligence/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content.trim(),
          sessionId,
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response stream");

      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "session") {
                setSessionId(data.sessionId);
              } else if (data.type === "chunk") {
                fullContent += data.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: fullContent }
                      : m
                  )
                );
              } else if (data.type === "done") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, isStreaming: false }
                      : m
                  )
                );
              } else if (data.type === "error") {
                throw new Error(data.error);
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "Sorry, I encountered an error. Please try again.",
                isStreaming: false,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleQuickAction = (query: string) => {
    sendMessage(query);
  };

  const handleNewChat = () => {
    setSessionId(null);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Hi! I'm your market intelligence assistant. Ask me about competitor pricing, market trends, or what vehicles to feature as special offers.",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {message.role === "assistant" && (
              <div
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(121, 213, 233, 0.15)" }}
              >
                <Bot className="w-4 h-4 text-[#79d5e9]" />
              </div>
            )}

            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 ${
                message.role === "user"
                  ? "bg-[#79d5e9] text-[#0f1419]"
                  : "bg-white/5 text-white"
              }`}
            >
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {message.content}
                {message.isStreaming && (
                  <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
                )}
              </div>
            </div>

            {message.role === "user" && (
              <div
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(121, 213, 233, 0.3)" }}
              >
                <User className="w-4 h-4 text-[#79d5e9]" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => handleQuickAction(action.query)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                  bg-white/5 text-white/70 hover:bg-white/10 hover:text-white
                  border border-white/10"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div
        className="p-4 border-t"
        style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}
      >
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1 text-xs text-white/50 hover:text-white/70 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            New Chat
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about market intelligence..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-xl text-sm text-white placeholder-white/40
              bg-white/5 border border-white/10
              focus:outline-none focus:border-[#79d5e9]/50
              disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-3 rounded-xl transition-colors disabled:opacity-50
              bg-[#79d5e9] text-[#0f1419] hover:bg-[#79d5e9]/90"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
