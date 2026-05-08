import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChartConfig, DataframeConfig } from '../types';
import { ChartRenderer } from './ChartRenderer';
import { DataframeRenderer } from './DataframeRenderer';
import { User, Bot, Volume2, VolumeX } from 'lucide-react';
import { cn } from '../lib/utils';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  chartConfig?: ChartConfig | null;
  dataframeConfig?: DataframeConfig | null;
  isDarkMode?: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ role, content, chartConfig, dataframeConfig, isDarkMode }) => {
  const isAssistant = role === 'assistant';
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Extract text by removing chart and dataframe blocks if exists
  const textContent = content
    .replace(/\[CHART_START\][\s\S]*?\[CHART_END\]/g, '')
    .replace(/\[DATAFRAME_START\][\s\S]*?\[DATAFRAME_END\]/g, '')
    .trim();

  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(textContent);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className={cn("flex w-full mb-10 gap-6", isAssistant ? "justify-start" : "justify-end flex-row-reverse")}>
      <div className={cn(
        "w-6 h-6 flex items-center justify-center shrink-0 mt-1",
        isAssistant 
          ? (isDarkMode ? "text-accent" : "text-[#C2410C]") 
          : (isDarkMode ? "text-white/40" : "text-ink/40")
      )}>
        {isAssistant ? <Bot size={20} /> : <User size={20} />}
      </div>
      
      <div className={cn(
        "max-w-[90%] md:max-w-[75%] pb-4",
        isAssistant 
          ? cn("border-t pt-4", isDarkMode ? "border-white/20" : "border-ink") 
          : cn("p-4", isDarkMode ? "bg-white/5 text-white border border-white/10" : "bg-[#121212] text-white")
      )}>
        {isAssistant && (
          <div className={cn("label-caps mb-4 flex items-center justify-between", isDarkMode ? "text-white/80" : "text-ink")}>
            <div className="flex items-center gap-2">
              <span className="text-accent underline decoration-accent/20">AI Analysis</span>
              <span className="opacity-20">/</span>
              <span className="opacity-40 italic lowercase font-light">Insight node active</span>
            </div>
            <button 
              onClick={handleSpeak}
              className={cn(
                "p-1 rounded-full transition-colors hover:bg-white/10",
                isSpeaking ? "text-accent" : "opacity-30 hover:opacity-100"
              )}
              title={isSpeaking ? "Stop Speaking" : "Listen to Analysis"}
            >
              {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          </div>
        )}
        <div className={cn(
          "prose prose-sm max-w-none text-inherit leading-relaxed", 
          isAssistant 
            ? cn("font-light text-lg", isDarkMode ? "text-white/90" : "text-ink") 
            : "text-white font-sans text-sm"
        )}>
          <ReactMarkdown>{textContent}</ReactMarkdown>
        </div>
        
        {chartConfig && (
          <div className={cn("mt-8 border-t pt-6", isDarkMode ? "border-white/5" : "border-ink/5")}>
            <ChartRenderer config={chartConfig} isDarkMode={isDarkMode} />
          </div>
        )}

        {dataframeConfig && (
          <div className={cn("mt-8 border-t pt-6", isDarkMode ? "border-white/5" : "border-ink/5")}>
            <DataframeRenderer config={dataframeConfig} isDarkMode={isDarkMode} />
          </div>
        )}
      </div>
    </div>
  );
};
