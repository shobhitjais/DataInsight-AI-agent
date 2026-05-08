import React, { useState, useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Search, X, Filter, Download } from 'lucide-react';
import { DataRow } from '../types';
import { exportCSV } from '../lib/dataUtils';

const pulseData = Array.from({ length: 20 }, (_, i) => ({
  name: i,
  value: Math.floor(Math.random() * 40) + 60,
}));

export const PulseChart = () => (
  <div className="w-full h-12 opacity-40">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={pulseData}>
        <Line 
          type="stepAfter" 
          dataKey="value" 
          stroke="#C2410C" 
          strokeWidth={1.5} 
          dot={false} 
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

export const DataPreview: React.FC<{ data: DataRow[] }> = ({ data }) => {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  if (!data || data.length === 0) return null;

  const headers = Object.keys(data[0]);

  const filteredData = useMemo(() => {
    return data.filter(row => {
      return Object.entries(filters).every(([col, val]) => {
        if (!val) return true;
        const cellValue = String(row[col] ?? '').toLowerCase();
        return cellValue.includes(val.toLowerCase());
      });
    });
  }, [data, filters]);

  const toggleFilter = () => setShowFilters(!showFilters);
  const updateFilter = (col: string, val: string) => {
    setFilters(prev => ({ ...prev, [col]: val }));
  };
  const clearFilters = () => setFilters({});

  const handleExportFiltered = () => {
    exportCSV(filteredData, 'filtered_dataset.csv');
  };

  return (
    <div className="w-full flex flex-col gap-2" id="data-preview">
      <div className="flex items-center justify-between mb-1">
        <div className="label-caps text-[8px] text-white/30 italic">
          {filteredData.length} records matching current parameters
        </div>
        <div className="flex gap-2">
          {filteredData.length > 0 && filteredData.length !== data.length && (
            <button 
              onClick={handleExportFiltered}
              className="label-caps text-[8px] text-accent hover:underline flex items-center gap-1 border border-accent/20 px-2 py-0.5"
            >
              <Download size={8} /> Export Filtered
            </button>
          )}
          {Object.values(filters).some(v => v) && (
            <button 
              onClick={clearFilters}
              className="label-caps text-[8px] text-accent hover:underline flex items-center gap-1"
            >
              <X size={8} /> Clear
            </button>
          )}
          <button 
            onClick={toggleFilter}
            className={`label-caps text-[8px] flex items-center gap-1 px-2 py-0.5 border ${showFilters ? 'bg-accent border-accent text-white' : 'border-white/20 text-white/50 hover:border-white/40'}`}
          >
            <Filter size={8} /> {showFilters ? 'Active' : 'Filter'}
          </button>
        </div>
      </div>

      <div className="w-full overflow-x-auto border border-white/10 bg-white/5">
        <table className="w-full text-left border-collapse table-fixed">
          <thead className="bg-white/10">
            <tr>
              {headers.map(header => (
                <th key={header} className="px-3 py-2 border-r border-white/10 last:border-r-0 w-[120px] min-w-[120px]">
                  <div className="label-caps text-[9px] text-white/50 mb-1 truncate">{header}</div>
                  {showFilters && (
                    <div className="relative">
                      <Search size={8} className="absolute left-2 top-1.5 text-white/30" />
                      <input 
                        type="text"
                        value={filters[header] || ''}
                        onChange={(e) => updateFilter(header, e.target.value)}
                        placeholder="Search..."
                        className="w-full bg-black/40 border border-white/10 rounded-none px-5 py-1 text-[8px] font-mono focus:border-accent outline-none text-white ring-0"
                      />
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.slice(0, 10).map((row, i) => (
              <tr key={i} className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors">
                {headers.map(header => (
                  <td key={`${i}-${header}`} className="px-3 py-1.5 text-[9px] font-mono text-white/70 border-r border-white/5 last:border-r-0 truncate">
                    {row[header]?.toString() || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filteredData.length === 0 && (
          <div className="py-8 text-center text-white/20 label-caps text-[9px]">
            No records match selected filters
          </div>
        )}
        {filteredData.length > 10 && (
          <div className="px-3 py-1.5 border-t border-white/10 label-caps text-[8px] text-white/20 italic">
            Displaying top 10 results
          </div>
        )}
      </div>
    </div>
  );
};
