import React from 'react';
import { DataRow } from '../types';

export const DataPreview: React.FC<{ data: DataRow[] }> = ({ data }) => {
  if (!data || data.length === 0) return null;

  const headers = Object.keys(data[0]);

  return (
    <div className="w-full overflow-x-auto border border-white/10 bg-white/5" id="data-preview">
      <table className="w-full text-left border-collapse">
        <thead className="bg-white/10">
          <tr>
            {headers.map(header => (
              <th key={header} className="px-3 py-2 label-caps text-[9px] text-white/50 border-r border-white/10 last:border-r-0">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 5).map((row, i) => (
            <tr key={i} className="border-bottom border-white/5 last:border-b-0">
              {headers.map(header => (
                <td key={`${i}-${header}`} className="px-3 py-1.5 text-[10px] font-mono text-white/70 border-r border-white/5 last:border-r-0 truncate max-w-[150px]">
                  {row[header]?.toString() || '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 5 && (
        <div className="px-3 py-1.5 label-caps text-[8px] opacity-20 italic">
          Sample: 5 of {data.length} records
        </div>
      )}
    </div>
  );
};
