/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Send, FileText, BarChart3, Database, Trash2, Wand2, Sparkles, AlertCircle, Download, Moon, Sun, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parseCSV, generateDataSummary, imputeMissing, standardize, detectOutliers, exportCSV } from './lib/dataUtils';
import { streamAnalysis, parseChartConfig, parseDataframeConfig } from './lib/gemini';
import { DataRow, DataSummary, ChatMessage } from './types';
import { DataPreview, PulseChart } from './components/DataPreview';
import { ChatBubble } from './components/ChatBubble';

import { cn } from './lib/utils';

const DEFAULT_SUGGESTIONS = [
  "Show me a summary of results",
  "Visualize distribution of high-value columns",
  "Identify potential outliers",
  "Compare core segments"
];

const QUOTES = [
  { text: "Information is the resolution of uncertainty.", author: "Claude Shannon" },
  { text: "In God we trust, all others must bring data.", author: "W. Edwards Deming" },
  { text: "The goal is to turn data into information, and information into insight.", author: "Carly Fiorina" },
  { text: "Data are just summaries of thousands of stories.", author: "Chip Heath" }
];

export default function App() {
  const [data, setData] = useState<DataRow[] | null>(null);
  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'index' | 'clean'>('index');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % QUOTES.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const parsedData = await parseCSV(file);
      const dataSummary = generateDataSummary(parsedData);
      setData(parsedData);
      setSummary(dataSummary);
      
      // Update suggestions based on data
      const colSuggs = dataSummary.columns.slice(0, 2).map(c => `Analyze distribution of ${c}`);
      setSuggestions([...colSuggs, ...DEFAULT_SUGGESTIONS]);

      const welcomeMsg: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: `I've analyzed your file **${file.name}**. It has ${dataSummary.rowCount} rows across ${dataSummary.columns.length} columns. \n\nI can help you explore this data or **clean it** (missing values, standardization) via the **Processor** tab. \n\nWhat would you like to build first?`,
        timestamp: Date.now()
      };
      setMessages([welcomeMsg]);
    } catch (err) {
      console.error(err);
      alert('Error parsing CSV file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleExport = () => {
    if (data) {
      exportCSV(data, 'cleaned_dataset.csv');
    }
  };

  const handleClean = (column: string, action: 'impute' | 'standardize') => {
    if (!data) return;
    let newData = [...data];
    if (action === 'impute') {
      const isNumeric = summary?.columnStats[column].type === 'numeric';
      newData = imputeMissing(newData, column, isNumeric ? 'mean' : 'mode');
    } else {
      newData = standardize(newData, column);
    }
    
    setData(newData);
    setSummary(generateDataSummary(newData));
    
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content: `System Update: Applied **${action}** transformation to column \`${column}\`. The dataset summary has been re-indexed.`,
      timestamp: Date.now()
    }]);
  };

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        console.warn("Speech recognition: No speech detected.");
      } else {
        console.error("Speech recognition error", event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSend = async () => {
    if (!input.trim() || !summary || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const assistantId = (Date.now() + 1).toString();
    let fullResponse = '';
    
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    }]);

    try {
      const stream = streamAnalysis(
        input, 
        summary, 
        messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
      );

      for await (const chunk of stream) {
        fullResponse += chunk;
        setMessages(prev => prev.map(m => 
          m.id === assistantId ? { ...m, content: fullResponse } : m
        ));
      }

      // After stream finished, check for chart config
      const chartConfig = parseChartConfig(fullResponse);
      const dataframeConfig = parseDataframeConfig(fullResponse);
      
      if (chartConfig || dataframeConfig) {
        setMessages(prev => prev.map(m => 
          m.id === assistantId ? { ...m, chartConfig: chartConfig || undefined, dataframeConfig: dataframeConfig || undefined } : m
        ));
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => prev.map(m => 
        m.id === assistantId ? { ...m, content: 'Sorry, I encountered an error during analysis.' } : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setSummary(null);
    setMessages([]);
  };

  return (
    <div className={cn(
      "flex flex-col h-screen font-serif border-8 transition-colors duration-500",
      isDarkMode ? "bg-[#0A0A0A] text-[#F4F1EA] border-[#121212]" : "bg-[#F4F1EA] text-[#121212] border-white"
    )}>
      {/* Header */}
      <header className={cn(
        "h-20 border-b flex items-baseline justify-between px-8 mx-2 mt-4 transition-all",
        isDarkMode ? "border-white/10" : "border-ink/20"
      )}>
        <div className="flex flex-col">
          <div className="label-caps text-[#C2410C]">Architectural Node / Analyst Workstation</div>
          <h1 className="text-3xl italic font-light tracking-tight">Welcome to DataInsight</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="label-caps hidden md:block">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — {new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })} UTC</div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-full transition-all border",
                isDarkMode ? "border-white/20 bg-white/5 text-white" : "border-black/10 bg-black/5 text-black"
              )}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {data && (
              <>
                <button 
                  onClick={handleExport}
                  className="label-caps border border-accent text-accent px-4 py-1 hover:bg-accent hover:text-white transition-all transform hover:scale-105 flex items-center gap-2"
                >
                  <Download size={14} />
                  Export CSV
                </button>
                <button 
                  onClick={reset}
                  className={cn(
                    "label-caps border px-4 py-1 hover:bg-ink hover:text-white transition-all transform hover:scale-105",
                    isDarkMode ? "border-white/20 text-white/70" : "border-ink/20 text-ink"
                  )}
                >
                  Reset System
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden p-2">
        {/* Left - Chat Section */}
        <motion.div 
          className="flex-1 flex flex-col relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {!data ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center" id="upload-zone">
              <motion.div 
                whileHover={{ y: -4 }}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "w-full max-w-lg p-16 border shadow-sm group cursor-pointer relative transition-colors duration-500",
                  isDarkMode ? "bg-[#121212] border-white/10 hover:border-accent" : "bg-white border-ink/10 hover:border-accent"
                )}
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                  <Database size={40} className="text-accent" />
                </div>
                <h2 className="text-6xl font-light tracking-tighter mb-4 leading-none text-current">
                  Welcome to <br/>
                  <span className="italic text-current">DataInsight.</span>
                </h2>
                <p className="label-caps opacity-50 mb-10 max-w-xs mx-auto text-current">
                  Specializing in fintech analysis
                </p>
                <button className="label-caps border-b-2 border-accent pb-1 group-hover:text-accent transition-colors text-current">
                  Select Dataset Library
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".csv" 
                  className="hidden" 
                />
              </motion.div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-10 py-10" id="chat-messages">
                <div className="max-w-4xl mx-auto">
                  <AnimatePresence initial={false}>
                    {messages.map((m) => (
                      <motion.div 
                        key={m.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-full"
                      >
                        <ChatBubble 
                          role={m.role} 
                          content={m.content} 
                          chartConfig={m.chartConfig} 
                          dataframeConfig={m.dataframeConfig}
                          isDarkMode={isDarkMode}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div ref={chatEndRef} />
                </div>
              </div>

              {/* Input Area */}
              <div className="px-10 pb-8 pt-4 shrink-0">
                <div className="max-w-4xl mx-auto relative">
                  {/* Quick Suggestions */}
                  <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
                    {suggestions.map((s, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => { setInput(s); }}
                        className={cn(
                          "whitespace-nowrap label-caps text-[8px] border px-3 py-1.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0",
                          isDarkMode 
                            ? "bg-white/5 border-white/10 text-white/70 hover:bg-white/10" 
                            : "bg-white border-ink/10 text-ink hover:bg-ink hover:text-white"
                        )}
                      >
                        {s}
                      </motion.button>
                    ))}
                  </div>

                  <div className={cn(
                    "flex items-center gap-4 p-2 transition-colors duration-500",
                    isDarkMode ? "bg-white/5 border border-white/10 text-white" : "bg-[#121212] text-white"
                  )}>
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder={isListening ? "Listening..." : "Ask the analyst anything..."}
                      disabled={isLoading}
                      className="flex-1 bg-transparent border-none outline-none font-sans text-sm italic px-4 py-3 placeholder:text-white/30"
                    />
                    <button 
                      onClick={toggleListening}
                      className={cn(
                        "w-10 h-10 flex items-center justify-center transition-colors hover:text-accent",
                        isListening ? "text-accent animate-pulse" : "text-white/40"
                      )}
                      title="Voice Command"
                    >
                      {isListening ? <Mic size={18} /> : <Mic size={18} />}
                    </button>
                    <button 
                      onClick={handleSend}
                      disabled={isLoading || !input.trim()}
                      className={cn(
                        "w-10 h-10 flex items-center justify-center transition-colors disabled:opacity-30",
                        isDarkMode ? "hover:bg-white/10" : "hover:bg-accent"
                      )}
                    >
                      <Send size={18} />
                    </button>
                  </div>
                  <div className="mt-4 flex justify-between items-center opacity-40">
                     <span className="label-caps text-[9px]">Status: Synchronized</span>
                     <span className="label-caps text-[9px] lowercase italic font-light">Every dataset tells a story</span>
                     <span className="label-caps text-[9px]">Node: 882-Delta</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.div>

        {/* Right - Data Section (Agent Control Panel look) */}
        {data && (
          <aside className="w-[450px] bg-[#121212] text-white overflow-y-auto p-10 flex flex-col gap-10 shadow-2xl z-0">
            <header className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative w-2 h-2">
                    <motion.div 
                      animate={{ scale: [1, 2, 1], opacity: [1, 0, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-accent rounded-full"
                    />
                    <div className="absolute inset-0 bg-accent rounded-full shadow-[0_0_8px_rgba(194,65,12,0.8)]" />
                  </div>
                  <span className="label-caps text-white">Agent Online</span>
                </div>
                <button 
                  onClick={handleExport}
                  className="label-caps text-[9px] border border-white/20 px-2 py-1 hover:bg-accent hover:border-accent transition-all flex items-center gap-2"
                >
                  <Download size={10} />
                  Export CSV
                </button>
              </div>

              <div className="border border-white/5 p-4 bg-white/[0.02]">
                <div className="label-caps text-[8px] mb-2 text-white/30">Process Pulse / Frequency</div>
                <PulseChart />
              </div>
              
              <div className="flex border-b border-white/10">
                <button 
                  onClick={() => setActiveTab('index')}
                  className={cn("label-caps pb-2 px-1 transition-all border-b-2", activeTab === 'index' ? "border-accent text-white" : "border-transparent text-white/30")}
                >
                  Index
                </button>
                <button 
                  onClick={() => setActiveTab('clean')}
                  className={cn("label-caps pb-2 px-6 transition-all border-b-2", activeTab === 'clean' ? "border-accent text-white" : "border-transparent text-white/30")}
                >
                  Processor
                </button>
              </div>
            </header>

            {activeTab === 'index' ? (
              <section className="space-y-6">
                <div className="border-t border-white/10 pt-4">
                  <span className="label-caps text-white/50 mb-2 block">System Metrics</span>
                  <div className="grid grid-cols-2 gap-px bg-white/10 mb-4">
                    <div className="bg-[#121212] p-4">
                      <div className="text-3xl font-light italic leading-none mb-1">{summary?.rowCount}</div>
                      <div className="label-caps text-[9px] text-white/40">Observations</div>
                    </div>
                    <div className="bg-[#121212] p-4">
                      <div className="text-3xl font-light italic leading-none mb-1">{summary?.columns.length}</div>
                      <div className="label-caps text-[9px] text-white/40">Vectors</div>
                    </div>
                  </div>
                  
                  {/* Infographic: Heuristic Integrity Matrix */}
                  <div className="bg-white/[0.02] border border-white/5 p-4">
                     <div className="flex justify-between items-center mb-3">
                        <span className="label-caps text-[8px] text-white/30">Heuristic Integrity Matrix</span>
                        <div className="flex gap-1">
                           <div className="w-1.5 h-1.5 bg-accent/50 rounded-full" />
                           <div className="w-1.5 h-1.5 bg-white/10 rounded-full" />
                        </div>
                     </div>
                     <div className="grid grid-cols-10 gap-1 opacity-40">
                        {Array.from({ length: 40 }).map((_, i) => (
                          <motion.div 
                            key={i}
                            animate={{ 
                              opacity: [0.2, 0.5, 0.2],
                              backgroundColor: Math.random() > 0.9 ? "#C2410C" : "rgba(255,255,255,0.1)"
                            }}
                            transition={{ 
                              duration: 3 + Math.random() * 4, 
                              repeat: Infinity,
                              delay: Math.random() * 2
                            }}
                            className="w-full aspect-square rounded-sm"
                          />
                        ))}
                     </div>
                     <div className="mt-3 flex justify-between label-caps text-[7px] text-white/20">
                        <span>L-Frequency</span>
                        <span>Vector Variance</span>
                     </div>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-6">
                   <div className="flex justify-between items-center mb-2">
                     <span className="label-caps text-white/50">Vector Integrity</span>
                     <span className="label-caps text-accent">94.2%</span>
                   </div>
                   <div className="w-full h-1 bg-white/10">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "94.2%" }}
                        className="h-full bg-accent"
                      />
                   </div>
                </div>

                <div className="border-t border-white/10 pt-6">
                  <span className="label-caps text-white/50 mb-4 block">Neural Processing Hub</span>
                  <div className="flex justify-center py-4 bg-white/[0.01] border border-white/5 rounded-sm overflow-hidden relative">
                    <div className="absolute inset-0 opacity-10">
                       <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
                    </div>
                    <div className="flex items-center gap-8 relative z-10">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-3 h-3 border border-white/20 rounded-full" />
                        <div className="w-px h-12 bg-gradient-to-b from-white/20 to-accent" />
                        <div className="w-4 h-4 bg-accent rotate-45 border border-white/50 shadow-[0_0_10px_#C2410C]" />
                        <div className="w-px h-8 bg-white/10" />
                        <div className="w-2 h-2 border border-white/20 rounded-full" />
                      </div>
                      <div className="flex flex-col gap-4">
                         {Array.from({ length: 3 }).map((_, i) => (
                           <motion.div 
                             key={i}
                             animate={{ x: [0, 4, 0], opacity: [0.3, 0.6, 0.3] }}
                             transition={{ duration: 3, delay: i * 0.5, repeat: Infinity }}
                             className="h-1 w-24 bg-white/5 rounded-full overflow-hidden"
                           >
                             <motion.div 
                               animate={{ x: ["-100%", "100%"] }}
                               transition={{ duration: 2, delay: i * 0.8, repeat: Infinity, ease: "linear" }}
                               className="h-full w-12 bg-accent"
                             />
                           </motion.div>
                         ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-6">
                  <span className="label-caps text-white/50 mb-4 block">Variable Indexed</span>
                  <div className="space-y-3">
                    {summary?.columns.map(col => (
                      <div key={col} className="flex justify-between items-end border-b border-white/5 pb-2">
                         <div className="flex flex-col">
                           <span className="font-sans text-xs font-bold truncate max-w-[150px]">{col}</span>
                           <span className="text-[9px] font-mono text-white/30 uppercase leading-none">
                              {summary.columnStats[col].type}
                           </span>
                         </div>
                         <span className="text-[10px] font-mono text-accent">{summary.columnStats[col].uniqueCount}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <section className="border-t border-white/10 pt-8 pb-4">
                  <span className="label-caps text-accent mb-4 block">Editorial Context</span>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={quoteIndex}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-2"
                    >
                      <p className="text-lg leading-tight font-light italic text-white/90">
                        "{QUOTES[quoteIndex].text}"
                      </p>
                      <p className="label-caps text-[9px] text-white/30">— {QUOTES[quoteIndex].author}</p>
                    </motion.div>
                  </AnimatePresence>
                </section>
              </section>
            ) : (
              <section className="space-y-10">
                <div className="border-t border-white/10 pt-4">
                   <div className="label-caps text-accent mb-2">Automated Scrubbing</div>
                   <p className="text-xs font-light text-white/50 leading-relaxed italic">
                     Select an operational vector to apply information recovery or standardization algorithms.
                   </p>
                </div>
                
                <div className="space-y-8">
                  {summary?.columns.map(col => (
                    <div key={col} className="space-y-3 border-l border-white/10 pl-4 py-1">
                      <div className="flex items-center justify-between">
                         <span className="font-sans text-sm font-bold">{col}</span>
                         <span className="label-caps text-[8px] opacity-40">{summary.columnStats[col].type}</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleClean(col, 'impute')}
                          className="flex-1 label-caps text-[8px] border border-white/20 py-2 hover:bg-white/5 hover:border-accent transition-all flex items-center justify-center gap-2"
                        >
                          <Sparkles size={10} />
                          Impute Missing
                        </button>
                        {summary.columnStats[col].type === 'numeric' && (
                          <button 
                            onClick={() => handleClean(col, 'standardize')}
                            className="flex-1 label-caps text-[8px] border border-white/20 py-2 hover:bg-white/5 hover:border-accent transition-all flex items-center justify-center gap-2"
                          >
                            <Wand2 size={10} />
                            Standardize
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-auto border-t border-white/10 pt-6">
              <span className="label-caps text-white/50 mb-4 block">Data Structure</span>
              <div className="scale-90 origin-top-left">
                <DataPreview data={data} />
              </div>
            </section>
          </aside>
        )}
      </main>

      {/* Uploading Overlay */}
      <AnimatePresence>
        {isUploading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <div className="bg-surface rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
              <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <h3 className="text-xl font-bold mb-2 font-serif italic text-ink">Analyzing Dataset</h3>
              <div className="label-caps opacity-60">Extracting structure and calculating statistics...</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
