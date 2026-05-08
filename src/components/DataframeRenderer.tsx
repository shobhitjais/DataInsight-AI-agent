import React from 'react';
import { DataframeConfig } from '../types';
import { cn } from '../lib/utils';

export const DataframeRenderer: React.FC<{ config: DataframeConfig; isDarkMode?: boolean }> = ({ config, isDarkMode }) => {
  return (
    <div className="w-full mt-6 border-l-4 border-accent pl-6 bg-transparent overflow-x-auto">
      <h3 className={cn("label-caps mb-4", isDarkMode ? "text-white/80" : "text-[#121212]")}>
        {config.title}
      </h3>
      <table className={cn(
        "min-w-full text-xs font-sans border-collapse",
        isDarkMode ? "text-white/70" : "text-black/70"
      )}>
        <thead>
          <tr className={isDarkMode ? "border-b border-white/10" : "border-b border-black/10"}>
            {config.headers.map((header, i) => (
              <th key={i} className="text-left py-2 px-3 label-caps font-bold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {config.rows.map((row, i) => (
            <tr key={i} className={cn(
              "border-b transition-colors",
              isDarkMode ? "border-white/5 hover:bg-white/5" : "border-black/5 hover:bg-black/5"
            )}>
              {row.map((cell, j) => (
                <td key={j} className="py-2 px-3">
                  {cell?.toString() || '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
