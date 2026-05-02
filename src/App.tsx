/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Send, FileText, BarChart3, Database, Trash2, Github, Wand2, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parseCSV, generateDataSummary, imputeMissing, standardize, detectOutliers } from './lib/dataUtils';
import { streamAnalysis, parseChartConfig } from './lib/gemini';
import { DataRow, DataSummary, ChatMessage } from './types';
import { DataPreview } from './components/DataPreview';
import { ChatBubble } from './components/ChatBubble';

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [data, setData] = useState<DataRow[] | null>(null);
  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'index' | 'clean'>('index');
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const parsedData = await parseCSV(file);
      const dataSummary = generateDataSummary(parsedData);
      setData(parsedData);
      setSummary(dataSummary);
      
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
      if (chartConfig) {
        setMessages(prev => prev.map(m => 
          m.id === assistantId ? { ...m, chartConfig } : m
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
    <div className="flex flex-col h-screen bg-[#F4F1EA] text-[#121212] font-serif border-8 border-white">
      {/* Header */}
      <header className="h-20 border-b border-ink/20 flex items-baseline justify-between px-8 mx-2 mt-4 transition-all">
        <div className="flex flex-col">
          <div className="label-caps text-[#C2410C]">DataIntelligence / Analyst Node</div>
          <h1 className="text-3xl italic font-light tracking-tight">Intelligence Report</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="label-caps hidden md:block">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — {new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })} UTC</div>
          {data && (
            <button 
              onClick={reset}
              className="label-caps border border-ink/20 px-3 py-1 hover:bg-ink hover:text-white transition-all transform hover:scale-105"
            >
              Reset System
            </button>
          )}
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
                className="w-full max-w-lg p-16 border border-ink/10 bg-white shadow-sm hover:border-accent group cursor-pointer relative"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                  <Database size={40} className="text-accent" />
                </div>
                <h2 className="text-6xl font-light tracking-tighter mb-4 leading-none">
                  Data <br/>
                  <span className="italic">redefined.</span>
                </h2>
                <p className="label-caps opacity-50 mb-10 max-w-xs mx-auto">
                  Upload a dataset to generate insights
                </p>
                <button className="label-caps border-b-2 border-accent pb-1 group-hover:text-accent transition-colors">
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
                  <div className="flex items-center gap-4 bg-[#121212] text-white p-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Ask the analyst anything..."
                      disabled={isLoading}
                      className="flex-1 bg-transparent border-none outline-none font-sans text-sm italic px-4 py-3 placeholder:text-white/30"
                    />
                    <button 
                      onClick={handleSend}
                      disabled={isLoading || !input.trim()}
                      className="w-10 h-10 flex items-center justify-center hover:bg-accent transition-colors disabled:opacity-30"
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
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_8px_rgba(194,65,12,0.8)]"></div>
                <span className="label-caps text-white">Agent Online</span>
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
                  <div className="grid grid-cols-2 gap-px bg-white/10">
                    <div className="bg-[#121212] p-4">
                      <div className="text-3xl font-light italic leading-none mb-1">{summary?.rowCount}</div>
                      <div className="label-caps text-[9px] text-white/40">Observations</div>
                    </div>
                    <div className="bg-[#121212] p-4">
                      <div className="text-3xl font-light italic leading-none mb-1">{summary?.columns.length}</div>
                      <div className="label-caps text-[9px] text-white/40">Vectors</div>
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
