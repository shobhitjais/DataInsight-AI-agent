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
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ role, content, chartConfig }) => {
  const isAssistant = role === 'assistant';

  // Extract text by removing chart block if exists
  const textContent = content.replace(/\[CHART_START\][\s\S]*?\[CHART_END\]/g, '').trim();

  return (
    <div className={cn("flex w-full mb-10 gap-6", isAssistant ? "justify-start" : "justify-end flex-row-reverse")}>
      <div className={cn(
        "w-6 h-6 flex items-center justify-center shrink-0 mt-1",
        isAssistant ? "text-[#C2410C]" : "text-ink/40"
      )}>
        {isAssistant ? <Bot size={20} /> : <User size={20} />}
      </div>
      
      <div className={cn(
        "max-w-[90%] md:max-w-[75%] pb-4",
        isAssistant ? "border-t border-ink pt-4" : "bg-[#121212] text-white p-4"
      )}>
        {isAssistant && (
          <div className="label-caps mb-4 opacity-100 flex items-center gap-2">
            <span className="text-[#C2410C]">AI Analysis</span>
            <span className="opacity-20">/</span>
            <span className="opacity-40 italic lowercase font-light">Insight node active</span>
          </div>
        )}
        <div className={cn("prose prose-sm max-w-none text-inherit leading-relaxed", isAssistant ? "text-ink font-light text-lg" : "text-white font-sans text-sm")}>
          <ReactMarkdown>{textContent}</ReactMarkdown>
        </div>
        
        {chartConfig && (
          <div className="mt-8 border-t border-ink/5 pt-6">
            <ChartRenderer config={chartConfig} />
          </div>
        )}
      </div>
    </div>
  );
};
