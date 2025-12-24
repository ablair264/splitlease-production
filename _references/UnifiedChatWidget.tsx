import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, Send, X, Sparkles, User, Search, Lightbulb, PhoneCall, Loader2 } from 'lucide-react';
import SmartSearchResults from './search/SmartSearchResults';
import { SearchProduct } from './search/SmartSearchProductCard';

const API_BASE = '/.netlify/functions/products';
const LIVECHAT_API = '/.netlify/functions/livechat';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'admin' | 'system';
  content: string;
  adminName?: string;
};

type ChatMode = 'livechat' | 'smartsearch';

// Clothing page paths
const CLOTHING_PATHS = ['/clothing', '/product/', '/all-clothing'];

// AI System Prompt for SmartSearch mode
const SMART_SEARCH_PROMPT = `You are a helpful product search assistant for Outpost, a workwear and promotional clothing company.

CRITICAL BEHAVIOR:
- When the user mentions ANY product type or describes clothing needs, ALWAYS search immediately
- Don't ask clarifying questions unless the query is genuinely unclear (e.g., just "hi" or "help")
- Search first, then offer to refine. Users can see results and ask for changes.
- IMPORTANT: When refining a search (e.g., "in red", "under £10"), KEEP the previous category and just ADD the new filter

SEMANTIC UNDERSTANDING - Map user intent to appropriate categories:
- "Smart clothes/office wear/professional" → Shirts, Polo Shirts
- "Warm clothing/winter wear" → Fleeces, Jackets, Hoodies, Softshells, Gilets
- "Staff uniforms/team wear" → Polo Shirts, Shirts, T-Shirts
- "Safety/construction" → Hi-Vis, Workwear

SEARCHABLE ATTRIBUTES - Use keywords for:
- Fabric: "cotton", "polyester", "organic", "recycled"
- Features: "waterproof", "breathable", "lightweight"
- Certifications: "organic", "vegan", "sustainable"

IMPORTANT: You must respond with a JSON object in this exact format:
{
  "message": "Your conversational response to the user",
  "searchQuery": {
    "keywords": ["keyword1", "keyword2"],
    "category": "single category OR comma-separated categories",
    "brand": "brand name or null",
    "priceMax": number or null,
    "priceMin": number or null,
    "color": "color name or null",
    "sustainable": boolean or null,
    "gender": "Mens", "Ladies", "Unisex" or null
  }
}

CONVERSATION CONTEXT:
- Remember the previous search context when user refines
- "Any in red?" after polo search = keep category "Polo Shirts", add color "red"
- "Something cheaper?" = keep current filters, add priceMax

Available categories: T-Shirts, Polo Shirts, Sweatshirts, Hoodies, Fleeces, Jackets, Softshells, Gilets, Shirts, Trousers, Shorts, Hi-Vis, Caps, Beanies, Bags, Aprons.

Keep responses concise (1-2 sentences).`;

// Generate or retrieve visitor ID
const getVisitorId = (): string => {
  const stored = localStorage.getItem('outpost_visitor_id');
  if (stored) return stored;

  const newId = `v_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  localStorage.setItem('outpost_visitor_id', newId);
  return newId;
};

const UnifiedChatWidget: React.FC = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ChatMode>('livechat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [showProactivePopup, setShowProactivePopup] = useState(false);
  const [idleTime, setIdleTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // LiveChat state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isAdminOnline, setIsAdminOnline] = useState(false);
  const [adminJoined, setAdminJoined] = useState(false);
  const [showEscalateForm, setShowEscalateForm] = useState(false);
  const [escalateName, setEscalateName] = useState('');
  const [escalateEmail, setEscalateEmail] = useState('');
  const [escalating, setEscalating] = useState(false);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  // Determine if we're on a clothing page
  const isClothingPage = CLOTHING_PATHS.some(path => location.pathname.startsWith(path));

  // Check admin online status
  const checkAdminStatus = useCallback(async () => {
    try {
      const response = await fetch(`${LIVECHAT_API}/status`);
      const data = await response.json();
      if (data.success) {
        setIsAdminOnline(data.isOnline);
      }
    } catch (error) {
      console.error('Failed to check admin status:', error);
    }
  }, []);

  // Initialize or restore session
  const initSession = useCallback(async () => {
    if (mode !== 'livechat') return;

    try {
      const visitorId = getVisitorId();
      const productContext = location.pathname.startsWith('/product/') ? {
        page: location.pathname,
        // Add product details if available
      } : null;

      const response = await fetch(`${LIVECHAT_API}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId,
          currentPage: location.pathname,
          productContext,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSessionId(data.session.id);
        setAdminJoined(data.session.status === 'admin_joined');

        // Restore messages from session
        if (data.session.messages && data.session.messages.length > 0) {
          const restoredMessages: ChatMessage[] = data.session.messages.map((m: any) => ({
            id: m.id,
            role: m.sender_type === 'visitor' ? 'user' : m.sender_type,
            content: m.content,
            adminName: m.admin_name,
          }));
          setMessages(restoredMessages);
        }
      }
    } catch (error) {
      console.error('Failed to init session:', error);
    }
  }, [mode, location.pathname]);

  // Poll for new messages
  const pollMessages = useCallback(async () => {
    if (!sessionId || mode !== 'livechat') return;

    try {
      const lastMessage = messages[messages.length - 1];
      const since = lastMessage ? new Date(Date.now() - 5000).toISOString() : undefined;

      const url = since
        ? `${LIVECHAT_API}/messages/${sessionId}?since=${since}`
        : `${LIVECHAT_API}/messages/${sessionId}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        // Update admin joined status
        if (data.adminJoined && !adminJoined) {
          setAdminJoined(true);
        }

        // Add any new messages we don't have (only non-visitor messages, since visitor messages are added locally)
        if (data.messages && data.messages.length > 0) {
          // Filter to only admin/ai/system messages - we already add visitor messages locally
          const nonVisitorMessages = data.messages.filter((m: any) => m.sender_type !== 'visitor');
          const existingContents = new Set(messages.map(m => m.content));
          const newMessages = nonVisitorMessages.filter((m: any) => !existingContents.has(m.content));

          if (newMessages.length > 0) {
            const formattedNew: ChatMessage[] = newMessages.map((m: any) => ({
              id: m.id,
              role: m.sender_type === 'visitor' ? 'user' : m.sender_type,
              content: m.content,
              adminName: m.admin_name,
            }));
            setMessages(prev => [...prev, ...formattedNew]);
          }
        }
      }
    } catch (error) {
      console.error('Failed to poll messages:', error);
    }
  }, [sessionId, mode, messages, adminJoined]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Only check admin status when in livechat mode and chat is open (or about to open)
  useEffect(() => {
    // Only check status when in livechat mode
    if (mode !== 'livechat') return;

    // Check once when mode switches to livechat
    checkAdminStatus();

    // Only poll periodically if chat is open
    if (isOpen) {
      const interval = setInterval(checkAdminStatus, 30000); // Check every 30s while open
      return () => clearInterval(interval);
    }
  }, [checkAdminStatus, mode, isOpen]);

  // Initialize session when chat opens in livechat mode
  useEffect(() => {
    if (isOpen && mode === 'livechat') {
      initSession();
    }
  }, [isOpen, mode, initSession]);

  // Poll for messages when in livechat mode
  useEffect(() => {
    if (isOpen && mode === 'livechat' && sessionId) {
      pollInterval.current = setInterval(pollMessages, 2000); // Poll every 2s
    }

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [isOpen, mode, sessionId, pollMessages]);

  // Reset state when modal closes (but keep session for livechat)
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        // Only reset search-related state
        setProducts([]);
        setHasSearched(false);
        setShowEscalateForm(false);

        // For livechat, keep messages and session
        // For smartsearch, reset everything
        if (mode === 'smartsearch') {
          setMessages([]);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, mode]);

  // Set mode based on page
  useEffect(() => {
    if (isClothingPage) {
      setMode('smartsearch');
    } else {
      setMode('livechat');
    }
  }, [isClothingPage]);

  // Proactive prompt after idle time on clothing pages (desktop only)
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

    if (!isClothingPage || isOpen || isMobile) {
      setIdleTime(0);
      setShowProactivePopup(false);
      return;
    }

    const interval = setInterval(() => {
      setIdleTime(prev => prev + 1);
    }, 1000);

    if (idleTime >= 30 && !showProactivePopup) {
      setShowProactivePopup(true);
    }

    return () => clearInterval(interval);
  }, [isClothingPage, isOpen, idleTime, showProactivePopup]);

  // Reset idle time on user activity
  useEffect(() => {
    const resetIdle = () => setIdleTime(0);
    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', resetIdle);
    window.addEventListener('scroll', resetIdle);
    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      window.removeEventListener('scroll', resetIdle);
    };
  }, []);

  // Execute product search using Netlify API
  const executeSearch = async (searchQuery: {
    keywords?: string[];
    category?: string;
    brand?: string;
    priceMax?: number;
    priceMin?: number;
    color?: string;
    gender?: string;
  }): Promise<SearchProduct[]> => {
    try {
      const params = new URLSearchParams();
      params.set('limit', '24');

      if (searchQuery.category) {
        params.set('productType', searchQuery.category);
      }
      if (searchQuery.brand) {
        params.set('brand', searchQuery.brand);
      }
      if (searchQuery.priceMin !== undefined && searchQuery.priceMin !== null) {
        params.set('priceMin', searchQuery.priceMin.toString());
      }
      if (searchQuery.priceMax !== undefined && searchQuery.priceMax !== null) {
        params.set('priceMax', searchQuery.priceMax.toString());
      }
      if (searchQuery.color) {
        const normalizedColor = searchQuery.color.charAt(0).toUpperCase() + searchQuery.color.slice(1).toLowerCase();
        params.set('colors', normalizedColor);
      }
      if (searchQuery.gender) {
        params.set('gender', searchQuery.gender);
      }
      if (searchQuery.keywords && searchQuery.keywords.length > 0) {
        params.set('search', searchQuery.keywords.join(' '));
      }

      const response = await fetch(`${API_BASE}/styles?${params.toString()}`);
      if (!response.ok) return [];

      const data = await response.json();
      const styles = data.styles || [];

      return styles.map((item: any) => ({
        id: item.id?.toString() || item.style_code,
        sku: item.style_code,
        title: item.style_name,
        supplier_name: item.brand,
        category: item.product_type,
        base_price: item.price_min ? parseFloat(item.price_min) : undefined,
        max_price: item.price_max ? parseFloat(item.price_max) : undefined,
        primary_image_url: item.primary_product_image_url,
        color_count: item.available_colors?.length || 1,
      }));
    } catch {
      return [];
    }
  };

  // Save message to backend
  const saveMessage = async (senderType: string, content: string) => {
    if (!sessionId) return;

    try {
      await fetch(`${LIVECHAT_API}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          senderType,
          content,
        }),
      });
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  };

  // Escalate to human
  const handleEscalate = async () => {
    if (!sessionId) return;

    setEscalating(true);
    try {
      await fetch(`${LIVECHAT_API}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          visitorName: escalateName || null,
          visitorEmail: escalateEmail || null,
        }),
      });

      setShowEscalateForm(false);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'system',
        content: isAdminOnline
          ? 'A team member will join shortly. Please wait...'
          : 'Our team is currently offline. We\'ll get back to you as soon as possible!',
      }]);
    } catch (error) {
      console.error('Failed to escalate:', error);
    } finally {
      setEscalating(false);
    }
  };

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      if (mode === 'smartsearch') {
        // SmartSearch mode - use product search API
        const response = await fetch('https://outpost-custom-production.up.railway.app/api/smart-search-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })).concat([{ role: 'user', content: trimmed }]),
            systemPrompt: SMART_SEARCH_PROMPT,
          }),
        });

        const data = await response.json();
        let aiMessage = "I'd be happy to help you find what you're looking for.";
        let searchQuery = null;

        try {
          const parsed = JSON.parse(data.message);
          aiMessage = parsed.message || aiMessage;
          searchQuery = parsed.searchQuery;
        } catch {
          aiMessage = data.message || aiMessage;
        }

        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiMessage,
        }]);

        const hasSearchCriteria = searchQuery && (
          (searchQuery.keywords && searchQuery.keywords.length > 0) ||
          (searchQuery.category && searchQuery.category.trim() !== '') ||
          (searchQuery.brand && searchQuery.brand.trim() !== '')
        );

        if (hasSearchCriteria) {
          setHasSearched(true);
          const results = await executeSearch(searchQuery);
          setProducts(results);
        }
      } else if (adminJoined) {
        // Admin has taken over - just save the message, don't call AI
        await saveMessage('visitor', trimmed);
        // The polling will pick up any admin responses
      } else {
        // LiveChat mode with AI - save message and get AI response
        await saveMessage('visitor', trimmed);

        const apiUrl = process.env.REACT_APP_CHAT_API_URL || 'https://outpost-custom-production.up.railway.app/api/chat';
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            history: messages.filter(m => m.role !== 'system').map(m => ({
              role: m.role === 'user' ? 'user' : 'assistant',
              content: m.content
            })),
          }),
        });

        const data = await response.json();
        const aiResponse = data.reply || data.error || 'Sorry, I had trouble with that.';

        // Save AI response to backend
        await saveMessage('ai', aiResponse);

        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiResponse,
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Network error. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, mode, adminJoined, sessionId]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleOpen = (forceMode?: ChatMode) => {
    if (forceMode) setMode(forceMode);
    setIsOpen(true);
    setShowProactivePopup(false);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const isExpanded = mode === 'smartsearch' && isOpen;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50" data-chat-widget>
        <AnimatePresence>
          {isOpen ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`bg-[#183028] shadow-2xl flex flex-col overflow-hidden border border-white/10 ${
                isExpanded
                  ? 'fixed inset-0 sm:relative sm:inset-auto w-full h-full sm:w-[900px] sm:h-[600px] sm:rounded-2xl rounded-none'
                  : 'fixed inset-0 sm:relative sm:inset-auto w-full h-full sm:w-[380px] sm:h-[550px] sm:rounded-2xl rounded-none'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gradient-to-r from-[#64a70b]/10 to-transparent">
                <div className="flex items-center gap-3">
                  {mode === 'smartsearch' ? (
                    <div className="w-10 h-10 rounded-full bg-[#64a70b]/20 flex items-center justify-center">
                      <Search size={20} className="text-[#64a70b]" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#64a70b]/20 flex items-center justify-center relative">
                      <MessageCircle size={20} className="text-[#64a70b]" />
                      {adminJoined && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#183028]" />
                      )}
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-semibold text-white hearns-font">
                      {mode === 'smartsearch' ? 'Smart Search' : adminJoined ? 'Live Chat' : 'Chat'}
                    </h2>
                    <p className="text-xs text-white/50">
                      {mode === 'smartsearch'
                        ? 'Find the perfect products'
                        : adminJoined
                          ? 'Connected with team member'
                          : isAdminOnline
                            ? 'Team available'
                            : 'AI assistant'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X size={20} className="text-white/60" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
                {/* Products Panel (top on mobile, left on desktop, only in SmartSearch) */}
                {isExpanded && (
                  <div className="h-[45%] sm:h-auto sm:w-[55%] border-b sm:border-b-0 sm:border-r border-white/10 overflow-auto">
                    <SmartSearchResults
                      products={products}
                      isLoading={loading && hasSearched}
                      hasSearched={hasSearched}
                      onClose={handleClose}
                    />
                  </div>
                )}

                {/* Chat Panel */}
                <div className={`flex flex-col ${isExpanded ? 'h-[55%] sm:h-auto sm:w-[45%]' : 'w-full'}`}>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 && (
                      <div className="text-center py-8">
                        <div className="w-14 h-14 rounded-full bg-[#64a70b]/15 flex items-center justify-center mx-auto mb-4">
                          <Sparkles size={28} className="text-[#64a70b]" />
                        </div>
                        <h3 className="text-base font-medium text-white mb-2 hearns-font">
                          {mode === 'smartsearch' ? 'How can I help?' : 'Hi there!'}
                        </h3>
                        <p className="text-sm text-white/50 max-w-xs mx-auto">
                          {mode === 'smartsearch'
                            ? 'Describe what you\'re looking for'
                            : 'Ask about our services, pricing, or anything else'}
                        </p>

                        {/* Quick suggestions for SmartSearch */}
                        {mode === 'smartsearch' && (
                          <div className="flex flex-wrap gap-2 justify-center mt-4">
                            {['Polo shirts for staff', 'Budget t-shirts', 'Warm jackets'].map((suggestion) => (
                              <button
                                key={suggestion}
                                onClick={() => {
                                  setInput(suggestion);
                                  setTimeout(() => sendMessage(), 100);
                                }}
                                className="px-3 py-1.5 rounded-full text-xs bg-[#64a70b]/15 text-[#64a70b] border border-[#64a70b]/30 hover:bg-[#64a70b]/25 transition-colors"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : msg.role === 'system' ? 'justify-center' : 'justify-start'}`}
                      >
                        {msg.role === 'system' ? (
                          <div className="px-4 py-2 rounded-xl bg-yellow-500/10 text-yellow-300/80 text-sm text-center max-w-[90%]">
                            {msg.content}
                          </div>
                        ) : (
                          <>
                            {(msg.role === 'assistant' || msg.role === 'admin') && (
                              <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${
                                msg.role === 'admin' ? 'bg-purple-500/20' : 'bg-[#64a70b]/20'
                              }`}>
                                {msg.role === 'admin' ? (
                                  <User size={14} className="text-purple-400" />
                                ) : (
                                  <Sparkles size={14} className="text-[#64a70b]" />
                                )}
                              </div>
                            )}
                            <div className="flex flex-col max-w-[80%]">
                              {msg.role === 'admin' && msg.adminName && (
                                <span className="text-xs text-purple-400 mb-1">{msg.adminName}</span>
                              )}
                              <div
                                className={`px-3 py-2 rounded-2xl text-sm ${
                                  msg.role === 'user'
                                    ? 'bg-[#64a70b] text-white rounded-br-sm'
                                    : msg.role === 'admin'
                                      ? 'bg-purple-500/20 text-purple-100 rounded-bl-sm'
                                      : 'bg-white/10 text-white/90 rounded-bl-sm'
                                }`}
                              >
                                {msg.content}
                              </div>
                            </div>
                            {msg.role === 'user' && (
                              <div className="w-7 h-7 rounded-full bg-white/10 flex-shrink-0 flex items-center justify-center">
                                <User size={14} className="text-white/70" />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}

                    {loading && (
                      <div className="flex gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#64a70b]/20 flex-shrink-0 flex items-center justify-center">
                          <Sparkles size={14} className="text-[#64a70b]" />
                        </div>
                        <div className="bg-white/10 px-4 py-3 rounded-2xl rounded-bl-sm">
                          <div className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                              <motion.span
                                key={i}
                                className="w-2 h-2 rounded-full bg-[#64a70b]"
                                animate={{ y: [0, -4, 0] }}
                                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Escalate Form */}
                  {showEscalateForm && mode === 'livechat' && !adminJoined && (
                    <div className="p-4 border-t border-white/10 bg-white/5">
                      <p className="text-sm text-white/70 mb-3">
                        {isAdminOnline
                          ? 'Enter your details and a team member will join shortly:'
                          : 'Leave your details and we\'ll get back to you:'}
                      </p>
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={escalateName}
                          onChange={(e) => setEscalateName(e.target.value)}
                          placeholder="Your name (optional)"
                          className="w-full px-3 py-2 rounded-lg bg-white/10 text-white text-base placeholder-white/40 outline-none border border-white/10 focus:border-[#64a70b]/50"
                          style={{ fontSize: '16px' }}
                        />
                        <input
                          type="email"
                          value={escalateEmail}
                          onChange={(e) => setEscalateEmail(e.target.value)}
                          placeholder="Your email (optional)"
                          className="w-full px-3 py-2 rounded-lg bg-white/10 text-white text-base placeholder-white/40 outline-none border border-white/10 focus:border-[#64a70b]/50"
                          style={{ fontSize: '16px' }}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowEscalateForm(false)}
                            className="flex-1 px-3 py-2 rounded-lg text-sm text-white/60 hover:bg-white/5"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleEscalate}
                            disabled={escalating}
                            className="flex-1 px-3 py-2 rounded-lg bg-[#64a70b] text-white text-sm font-medium disabled:opacity-50"
                          >
                            {escalating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Connect'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Input */}
                  <div className="p-3 border-t border-white/10">
                    {/* Talk to human button (only in livechat mode, not when admin joined) */}
                    {mode === 'livechat' && !adminJoined && !showEscalateForm && messages.length >= 2 && (
                      <button
                        onClick={() => setShowEscalateForm(true)}
                        className="w-full mb-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center gap-2"
                      >
                        <PhoneCall size={14} />
                        <span>Speak to a team member</span>
                        {isAdminOnline && (
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        )}
                      </button>
                    )}

                    <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKey}
                        placeholder={mode === 'smartsearch' ? 'Describe what you need...' : 'Type a message...'}
                        disabled={loading}
                        className="flex-1 bg-transparent text-base sm:text-sm text-white placeholder-white/40 outline-none"
                        style={{ fontSize: '16px' }}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!input.trim() || loading}
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-[#64a70b] disabled:opacity-40 transition-opacity"
                      >
                        <Send size={16} className="text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Main toggle button */}
              <motion.button
                initial={{ scale: 0 }}
                animate={{
                  scale: showProactivePopup ? [1, 1.08, 1] : 1,
                }}
                transition={{
                  scale: showProactivePopup ? {
                    duration: 0.6,
                    repeat: 2,
                    repeatType: "reverse",
                    ease: "easeInOut"
                  } : {}
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setShowProactivePopup(false);
                  handleOpen();
                }}
                className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2.5 sm:py-3 rounded-full bg-[#64a70b] text-white font-semibold shadow-lg shadow-[#64a70b]/30"
              >
                {isClothingPage ? (
                  <>
                    <Lightbulb size={20} fill="currentColor" />
                    <span className="hidden sm:inline">
                      {showProactivePopup ? "Need help? Try Smart Search" : "Smart Search"}
                    </span>
                  </>
                ) : (
                  <>
                    <MessageCircle size={20} />
                    <span className="hidden sm:inline">Chat with us</span>
                  </>
                )}
              </motion.button>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default UnifiedChatWidget;
