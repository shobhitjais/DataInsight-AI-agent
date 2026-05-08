import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ChartConfig } from '../types';
import { ChartRenderer } from './ChartRenderer';
import { User, Bot } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  chartConfig?: ChartConfig | null;
  isDarkMode?: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ role, content, chartConfig, isDarkMode }) => {
  const isAssistant = role === 'assistant';

  // Extract text by removing chart block if exists
  const textContent = content.replace(/\[CHART_START\][\s\S]*?\[CHART_END\]/g, '').trim();

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
          <div className={cn("label-caps mb-4 flex items-center gap-2", isDarkMode ? "text-white/80" : "text-ink")}>
            <span className="text-accent underline decoration-accent/20">AI Analysis</span>
            <span className="opacity-20">/</span>
            <span className="opacity-40 italic lowercase font-light">Insight node active</span>
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
      </div>
    </div>
  );
};
