import React, { useState, useEffect, useRef } from 'react';
import { SalesRecord, UserRole } from '../types';
import { Bot, Sparkles, Key, Send, Cpu, MessageSquare, Trash2, HelpCircle, Eye, EyeOff, Loader2, ArrowRight, Zap, RefreshCw, BarChart2, ShieldAlert, X } from 'lucide-react';

interface AISalesAnalystProps {
  currentRole: UserRole;
  records: SalesRecord[];
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export default function AISalesAnalyst({ currentRole, records }: AISalesAnalystProps) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openrouter_api_key') || '');
  const [showKey, setShowKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('openrouter_model') || 'google/gemini-2.5-flash');
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Live Model retrieval states
  const [fetchedModels, setFetchedModels] = useState<any[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchOpenRouterModels = async () => {
    setIsFetchingModels(true);
    setFetchError(null);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey.trim()) {
        headers['Authorization'] = `Bearer ${apiKey.trim()}`;
      }
      
      const res = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers
      });
      
      if (!res.ok) {
        throw new Error(`Failed to load models list. Status: ${res.status}`);
      }
      
      const data = await res.json();
      if (data && Array.isArray(data.data)) {
        setFetchedModels(data.data);
        setIsModelModalOpen(true);
        setFetchError(null);
      } else {
        throw new Error('Invalid response structure from OpenRouter Models API');
      }
    } catch (err: any) {
      console.error(err);
      setFetchError(err.message || 'Error occurred while loading models list.');
      alert(`⚠️ Could not fetch live models: ${err.message || err}. Showing pre-configured model list instead.`);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const models = [
    { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: 'Fast, smart, highly recommended & cost-efficient' },
    { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', desc: 'Deep analytical intelligence & high complexity' },
    { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', desc: 'Exceptional coding and reasoning model' },
    { id: 'meta-llama/llama-3-8b-instruct', name: 'Llama 3 8B Instruct', desc: 'Fast general-purpose open-weight model' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', desc: 'Lightweight, fast and highly reliable' }
  ];

  // Load chat history or set default welcome message
  useEffect(() => {
    const savedChat = localStorage.getItem('ai_chat_history');
    if (savedChat) {
      try {
        const parsed = JSON.parse(savedChat);
        setMessages(parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
        return;
      } catch (e) {
        console.error('Error parsing chat history:', e);
      }
    }
    
    // Set default greeting if no history
    setMessages([
      {
        role: 'assistant',
        content: `👋 **Welcome to your E-Commerce AI Sales Analyst!**

I am an intelligent bot trained to analyze your sales transactions, predict customer demand, and suggest data-driven marketing strategies.

To begin, **please enter your OpenRouter API Key** in the configuration panel above.

Once configured, we can discuss:
* 📊 **Sales Performance**: Top-selling items, underperforming products, and portal-wise revenue share.
* 🔮 **Demand Forecasting**: Run rate assessments and 6-month replenishment predictions.
* 📈 **Marketing Recommendations**: Tailored growth hacks, pricing adjustments, and clearance sales.

*Click one of the Quick prompts below to start instantly!*`,
        timestamp: new Date()
      }
    ]);
  }, []);

  // Save key & model on changes
  useEffect(() => {
    localStorage.setItem('openrouter_api_key', apiKey);
  }, [apiKey]);

  // Automatically fetch models and open modal when API key is entered
  useEffect(() => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey || trimmedKey.length < 15) return;
    
    // Prevent refetching the exact same key during the same session
    const lastFetchedKey = sessionStorage.getItem('last_fetched_models_key');
    if (lastFetchedKey === trimmedKey) return;

    const timer = setTimeout(() => {
      sessionStorage.setItem('last_fetched_models_key', trimmedKey);
      fetchOpenRouterModels();
    }, 1200);

    return () => clearTimeout(timer);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('openrouter_model', selectedModel);
  }, [selectedModel]);

  // Save chat history
  const saveChatHistory = (updatedMessages: ChatMessage[]) => {
    localStorage.setItem('ai_chat_history', JSON.stringify(updatedMessages));
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const clearChat = () => {
    if (window.confirm('Are you sure you want to clear the entire chat conversation history?')) {
      const defaultMsg: ChatMessage[] = [
        {
          role: 'assistant',
          content: `🧹 **Chat conversation history cleared.**\n\nAsk me anything about your current dataset of **${records.length.toLocaleString()}** transactions!`,
          timestamp: new Date()
        }
      ];
      setMessages(defaultMsg);
      saveChatHistory(defaultMsg);
    }
  };

  const getContextSummary = (salesData: SalesRecord[]) => {
    if (salesData.length === 0) return "No sales records loaded.";

    // High-level aggregates
    const totalRevenue = salesData.reduce((acc, r) => acc + r.amount, 0);
    const totalUnits = salesData.reduce((acc, r) => acc + r.units, 0);
    const portals = Array.from(new Set(salesData.map(r => r.portal)));
    const products = Array.from(new Set(salesData.map(r => r.product)));
    
    // Group by Product
    const productSummary: Record<string, { units: number; revenue: number; txCount: number }> = {};
    // Group by Portal
    const portalSummary: Record<string, { units: number; revenue: number; txCount: number }> = {};

    salesData.forEach(r => {
      if (!productSummary[r.product]) productSummary[r.product] = { units: 0, revenue: 0, txCount: 0 };
      productSummary[r.product].units += r.units;
      productSummary[r.product].revenue += r.amount;
      productSummary[r.product].txCount += 1;

      if (!portalSummary[r.portal]) portalSummary[r.portal] = { units: 0, revenue: 0, txCount: 0 };
      portalSummary[r.portal].units += r.units;
      portalSummary[r.portal].revenue += r.amount;
      portalSummary[r.portal].txCount += 1;
    });

    // Take first 40 raw records for reference
    const rawSample = salesData.slice(0, 45).map(r => ({
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0],
      product: r.product,
      units: r.units,
      amount: r.amount,
      portal: r.portal,
      quality: r.quality || 'N/A',
      size: r.size || 'N/A',
      colour: r.colour || 'N/A'
    }));

    return {
      aggregateMetrics: {
        totalRevenueINR: totalRevenue,
        totalUnitsSold: totalUnits,
        averageOrderValueINR: salesData.length > 0 ? totalRevenue / salesData.length : 0,
        distinctProductsCount: products.length,
        distinctPortalsCount: portals.length
      },
      performanceByProduct: productSummary,
      performanceByPortal: portalSummary,
      sampleRawTransactions: rawSample,
      note: `This is a summary of the current user's e-commerce dataset containing ${salesData.length} total records.`
    };
  };

  const handleSendMessage = async (userPromptText: string) => {
    if (!userPromptText.trim()) return;
    if (!apiKey.trim()) {
      alert('Please configure your OpenRouter API Key in the config section first.');
      return;
    }

    const newUserMessage: ChatMessage = {
      role: 'user',
      content: userPromptText,
      timestamp: new Date()
    };

    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    saveChatHistory(updatedMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Gather data summary for context
      const dataContext = getContextSummary(records);

      // System Instructions
      const systemInstructions = `You are "E-Commerce AI Sales Analyst", a professional sales analytics bot designed for Indian and global e-commerce merchants.
You are given a rich summary of the merchant's current sales transaction dataset in JSON format.
Your goal is to answer user queries with precise numerical calculations, actionable intelligence, clear logic, and professional business advice.

Current Sales Dataset Context:
${JSON.stringify(dataContext, null, 2)}

Instructions:
1. Always format currency numbers elegantly using Indian Rupees format (INR, e.g. ₹5,40,200 or ₹3,500).
2. Highlight specific products or portals when discussing performance trends.
3. Be professional, direct, structured and use markdown extensively (tables, bold, checklists, codeblocks).
4. If asked to forecast, use the data logic provided in performanceByProduct or performanceByPortal.
5. Keep descriptions clear and clean. Avoid flowery or robotic AI jargon. Speak as a top-tier retail advisor.`;

      // Call OpenRouter API
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
          'HTTP-Referer': 'https://ai.studio/build',
          'X-Title': 'E-Commerce Executive Hub'
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: systemInstructions },
            ...updatedMessages.map(m => ({ role: m.role, content: m.content }))
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP Status ${response.status}`);
      }

      const resData = await response.json();
      const aiReply = resData.choices?.[0]?.message?.content || 'Sorry, I received an empty response from the AI gateway.';

      const newAiMessage: ChatMessage = {
        role: 'assistant',
        content: aiReply,
        timestamp: new Date()
      };

      const finalMessages = [...updatedMessages, newAiMessage];
      setMessages(finalMessages);
      saveChatHistory(finalMessages);
    } catch (err: any) {
      console.error('OpenRouter API Error:', err);
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `❌ **API Connection Error**

I was unable to connect to the OpenRouter gateway. Please double check:
1. **Your OpenRouter API Key**: Ensure it is valid and has active credit/balance.
2. **Network Connection**: Reload the workspace tab and try again.

*Technical Error Logs:*
\`\`\`text
${err.message || err}
\`\`\`\n\nYou can input a new key above to resume synchronization.`,
        timestamp: new Date()
      };
      
      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
      saveChatHistory(finalMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    if (isLoading) return;
    handleSendMessage(prompt);
  };

  // Simple Markdown parsing helper to render bold, codeblocks, lists, and paragraphs
  const parseMarkdown = (text: string) => {
    const lines = text.split('\n');
    let inCodeBlock = false;
    let codeContent: string[] = [];

    return lines.map((line, index) => {
      // Codeblock toggling
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          inCodeBlock = false;
          const currentCode = codeContent.join('\n');
          codeContent = [];
          return (
            <pre key={index} className="my-3 p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg overflow-x-auto border border-slate-800">
              <code>{currentCode}</code>
            </pre>
          );
        } else {
          inCodeBlock = true;
          return null;
        }
      }

      if (inCodeBlock) {
        codeContent.push(line);
        return null;
      }

      // Headers (e.g. ### Header or ## Header)
      if (line.startsWith('### ')) {
        return <h4 key={index} className="text-sm font-extrabold text-slate-800 dark:text-slate-150 mt-4 mb-2 tracking-wide uppercase">{renderInlines(line.slice(4))}</h4>;
      }
      if (line.startsWith('## ') || line.startsWith('# ')) {
        const cleanLine = line.replace(/^#+\s+/, '');
        return <h3 key={index} className="text-base font-black text-slate-900 dark:text-slate-100 mt-5 mb-2.5 border-b border-slate-100 dark:border-slate-800 pb-1 uppercase tracking-wide">{renderInlines(cleanLine)}</h3>;
      }

      // Bullet points
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
        const cleanLine = line.replace(/^\s*[\*\-•]\s+/, '');
        return (
          <div key={index} className="flex items-start gap-2 pl-3 my-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <span className="text-blue-500 font-extrabold mt-0.5">•</span>
            <span>{renderInlines(cleanLine)}</span>
          </div>
        );
      }

      // Numbered lists
      if (/^\s*\d+\.\s+/.test(line)) {
        const cleanLine = line.replace(/^\s*\d+\.\s+/, '');
        const match = line.match(/^\s*(\d+)\.\s+/);
        const num = match ? match[1] : '1';
        return (
          <div key={index} className="flex items-start gap-2 pl-3 my-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <span className="text-blue-600 dark:text-blue-400 font-bold font-mono">{num}.</span>
            <span>{renderInlines(cleanLine)}</span>
          </div>
        );
      }

      // Empty line
      if (!line.trim()) {
        return <div key={index} className="h-2" />;
      }

      // Standard paragraphs
      return (
        <p key={index} className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed my-2">
          {renderInlines(line)}
        </p>
      );
    }).filter(Boolean);
  };

  // Helper to parse inline bold **text** or code `code`
  const renderInlines = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-slate-900 dark:text-slate-100">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-pink-600 dark:text-pink-400 rounded border border-slate-200 dark:border-slate-700">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  const quickPrompts = [
    { title: '📈 Performance Audit', text: 'Analyze our top-performing products, total revenue breakdown, and general sales trends. Highlight key milestones.' },
    { title: '🔮 Predict Stock Shortfall', text: 'Review current active sales data and predict demand shortages or supply chain bottlenecks for next month.' },
    { title: '💡 Growth Hack Strategy', text: 'Generate 4 custom marketing ideas or promotions to boost the lowest performing marketplace channel.' },
    { title: '⚠️ Threshold Review', text: 'Analyze high volume units sold and advise if target safety limits should be expanded based on run rate averages.' }
  ];

  return (
    <div id="ai-analyst-panel" className="grid grid-cols-1 xl:grid-cols-4 gap-6 animate-in fade-in duration-300">
      
      {/* 1. CONFIGURATION COLLATERALS PANEL (LEFT) */}
      <div className="xl:col-span-1 space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Cpu className="text-blue-600 dark:text-blue-400 shrink-0" size={18} />
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider font-mono">OpenRouter Config</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Control AI gateway and models</p>
            </div>
          </div>

          {/* API Key Form Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Key size={12} /> API Access Key
              </label>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            
            <input
              id="input-openrouter-key"
              type={showKey ? 'text' : 'password'}
              placeholder="sk-or-v1-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="text-[9px] text-slate-400 leading-normal">
              Enter your credentials from <a href="https://openrouter.ai" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">openrouter.ai</a>. Keys are stored safely in local storage.
            </p>
          </div>

          {/* Model selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={12} /> Active Analytics Brain
              </label>
              <button
                type="button"
                onClick={fetchOpenRouterModels}
                disabled={isFetchingModels}
                className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold hover:underline cursor-pointer flex items-center gap-1 shrink-0"
                title="Fetch and search all models on OpenRouter"
              >
                {isFetchingModels ? (
                  <>
                    <Loader2 size={10} className="animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Cpu size={10} />
                    Search 100+ Models
                  </>
                )}
              </button>
            </div>
            
            {fetchError && (
              <p className="text-[9px] text-rose-500 font-medium leading-normal bg-rose-50 dark:bg-rose-950/20 p-1.5 rounded border border-rose-200/50">
                ⚠️ {fetchError}
              </p>
            )}

            <div className="space-y-1.5">
              {/* Highlight active model if it's not in the default quick-picks list */}
              {!models.some(m => m.id === selectedModel) && (
                <div className="p-2.5 rounded-lg border bg-blue-50/60 dark:bg-blue-950/30 border-blue-600 dark:border-blue-500 text-blue-950 dark:text-blue-300">
                  <span className="text-[11px] font-bold flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
                    Custom: {selectedModel.split('/').pop() || selectedModel}
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono block mt-0.5 truncate">{selectedModel}</span>
                </div>
              )}

              {models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all flex flex-col gap-0.5 cursor-pointer ${
                    selectedModel === m.id
                      ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-600 dark:border-blue-500 text-blue-950 dark:text-blue-300'
                      : 'bg-white dark:bg-slate-850 border-slate-150 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className="text-[11px] font-bold flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${selectedModel === m.id ? 'bg-blue-600 dark:bg-blue-400' : 'bg-slate-300'}`} />
                    {m.name}
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-sans leading-normal">{m.desc}</span>
                </button>
              ))}
            </div>
            
            <button
              type="button"
              onClick={fetchOpenRouterModels}
              className="w-full mt-1.5 py-2 px-3 border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-lg text-[10px] text-center font-bold text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer bg-slate-50/50 dark:bg-slate-900/50"
            >
              🔍 Open Dynamic Model Directory Modal
            </button>
          </div>
        </div>

        {/* ACTIVE DATASET META */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 text-xs">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono block border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
            Active Feed Context Scope
          </span>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500 font-medium">Synced Records</span>
              <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{records.length.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500 font-medium">Distinct Products</span>
              <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                {Array.from(new Set(records.map(r => r.product))).length}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500 font-medium">Total Volume Sold</span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {records.reduce((acc, r) => acc + r.units, 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500 font-medium">Total Revenue INR</span>
              <span className="font-bold font-mono text-blue-600 dark:text-blue-400">
                ₹{records.reduce((acc, r) => acc + r.amount, 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CHAT FEED & MESSAGE PLATFORM (RIGHT) */}
      <div className="xl:col-span-3 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm h-[650px] overflow-hidden">
        
        {/* Chat Header */}
        <div className="px-5 py-4 border-b border-slate-150 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Bot size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider font-sans">E-Commerce AI Sales Analyst</h3>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase font-mono tracking-widest bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400">
                  Online
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Equipped with active financial context & forecasting loops</p>
            </div>
          </div>

          <button
            id="btn-clear-chat"
            onClick={clearChat}
            title="Clear Chat History"
            className="p-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Message scroll container */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/30 dark:bg-slate-950/10">
          {messages.map((msg, index) => {
            const isAI = msg.role === 'assistant';
            return (
              <div
                key={index}
                className={`flex gap-3 max-w-[85%] ${isAI ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
              >
                {/* Avatar Icon */}
                <div className={`h-8 w-8 rounded-lg shrink-0 flex items-center justify-center border text-xs font-bold ${
                  isAI
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900 text-blue-600 dark:text-blue-400'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {isAI ? <Bot size={15} /> : 'ME'}
                </div>

                {/* Message Balloon */}
                <div className={`p-4 rounded-xl shadow-2xs border text-xs leading-relaxed space-y-1.5 ${
                  isAI
                    ? 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800/80 text-slate-800 dark:text-slate-200 rounded-tl-none'
                    : 'bg-blue-600 text-white border-blue-700 rounded-tr-none shadow-blue-500/5'
                }`}>
                  {isAI ? (
                    <div className="prose prose-sm dark:prose-invert">
                      {parseMarkdown(msg.content)}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                  
                  <span className={`block text-[8px] font-semibold text-right ${isAI ? 'text-slate-400' : 'text-blue-200'} font-mono mt-2`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Loader typing indicator */}
          {isLoading && (
            <div className="flex gap-3 mr-auto max-w-[80%] animate-pulse">
              <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 flex items-center justify-center text-blue-600 shrink-0">
                <Bot size={15} />
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl rounded-tl-none flex items-center gap-2">
                <Loader2 size={13} className="text-blue-500 animate-spin" />
                <span className="text-xs text-slate-400 font-medium italic">Evaluating current spreadsheet sales trends...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        {messages.length <= 2 && !isLoading && (
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800/50 bg-white dark:bg-slate-900">
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 font-mono">
              ⚡ Quick Prompt Accelerators
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickPrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickPrompt(p.text)}
                  disabled={!apiKey.trim()}
                  className="p-2 text-left bg-slate-50 hover:bg-blue-50/50 dark:bg-slate-850 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Zap size={11} className="text-amber-500 shrink-0" />
                  <span className="truncate">{p.title}</span>
                  <ArrowRight size={10} className="ml-auto text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Input Bar */}
        <div className="p-4 border-t border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputMessage);
            }}
            className="flex gap-2"
          >
            <input
              id="input-ai-chat"
              type="text"
              placeholder={apiKey.trim() ? "Ask me anything about your products, portals, or sales run rates..." : "Please configure your OpenRouter API Key first..."}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isLoading || !apiKey.trim()}
              className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-750 rounded-lg text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
            />
            <button
              id="btn-ai-send"
              type="submit"
              disabled={isLoading || !apiKey.trim() || !inputMessage.trim()}
              className="px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 dark:disabled:text-slate-600 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <Send size={14} />
              <span className="text-xs font-bold hidden sm:inline">Ask AI</span>
            </button>
          </form>
        </div>
      </div>

      {/* OPENROUTER MODELS BROWSER MODAL */}
      {isModelModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-100 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="text-blue-500 shrink-0" size={18} />
                <div>
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                    Live OpenRouter Model Directory
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Showing available models synced in real-time. Click to switch cognitive intelligence.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModelModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="p-4 bg-slate-50/50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex gap-2">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Cpu size={14} />
                </span>
                <input
                  type="text"
                  placeholder="Search 100+ OpenRouter models (e.g. gemini, deepseek, gpt, llama, claude)..."
                  value={modelSearchQuery}
                  onChange={(e) => setModelSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-lg text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-sans"
                />
              </div>
              {modelSearchQuery && (
                <button
                  onClick={() => setModelSearchQuery('')}
                  className="px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Modal Body: Filtered list of models */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/30 dark:bg-slate-950/10">
              {(() => {
                const query = modelSearchQuery.toLowerCase().trim();
                const filtered = fetchedModels.filter(m => 
                  m.id.toLowerCase().includes(query) || 
                  (m.name && m.name.toLowerCase().includes(query)) ||
                  (m.description && m.description.toLowerCase().includes(query))
                );

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <HelpCircle size={32} className="mx-auto text-slate-300 mb-2.5" />
                      <p className="text-xs text-slate-500 font-bold">No models match "{modelSearchQuery}"</p>
                      <p className="text-[10px] text-slate-400 mt-1">Try searching for other popular names like "gemini", "llama", "claude" or "gpt"</p>
                    </div>
                  );
                }

                return filtered.slice(0, 80).map((m) => {
                  const isSelected = selectedModel === m.id;
                  const promptPrice = m.pricing?.prompt ? (parseFloat(m.pricing.prompt) * 1000000).toFixed(2) : '0.00';
                  const completionPrice = m.pricing?.completion ? (parseFloat(m.pricing.completion) * 1000000).toFixed(2) : '0.00';
                  const contextLimit = m.context_length ? (m.context_length / 1000).toLocaleString() + 'k' : 'N/A';

                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedModel(m.id);
                        setIsModelModalOpen(false);
                      }}
                      className={`w-full text-left p-3.5 rounded-lg border transition-all flex items-start gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-600 dark:border-blue-500 text-blue-950 dark:text-blue-300'
                          : 'bg-white dark:bg-slate-850 border-slate-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className={`mt-0.5 p-1.5 rounded-md ${isSelected ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-850 text-slate-400 dark:text-slate-500'}`}>
                        <Cpu size={14} />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-black tracking-wide text-slate-800 dark:text-slate-150 truncate block">
                            {m.name || m.id}
                          </span>
                          {isSelected && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                              Active
                            </span>
                          )}
                        </div>
                        
                        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 block truncate">{m.id}</span>
                        
                        {m.description && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-2 leading-relaxed font-sans">
                            {m.description}
                          </p>
                        )}

                        {/* Badges and details */}
                        <div className="flex flex-wrap gap-1.5 pt-1.5">
                          <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[8px] font-bold font-mono text-slate-500">
                            Context: {contextLimit}
                          </span>
                          <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 rounded text-[8px] font-bold font-mono text-emerald-600 dark:text-emerald-400">
                            In: ${promptPrice}/M • Out: ${completionPrice}/M
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/50 flex items-center justify-between text-[10px] text-slate-400">
              <span className="font-mono">Total Synced: {fetchedModels.length} models</span>
              <button
                onClick={() => setIsModelModalOpen(false)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-750 font-bold text-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
