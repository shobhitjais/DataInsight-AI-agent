import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, AreaChart, Area 
} from 'recharts';
import { ChartConfig } from '../types';

const COLORS = ['#121212', '#C2410C', '#666666', '#999999', '#333333'];

export const ChartRenderer: React.FC<{ config: ChartConfig, isDarkMode?: boolean }> = ({ config, isDarkMode }) => {
  const renderChart = () => {
    const gridColor = isDarkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(18, 18, 18, 0.05)";
    const axisColor = isDarkMode ? "rgba(255, 255, 255, 0.4)" : "rgba(18, 18, 18, 0.4)";
    const tooltipBg = isDarkMode ? "#1A1A1A" : "#FFFFFF";
    const tooltipBorder = isDarkMode ? "rgba(255,255,255,0.1)" : "#121212";
    const tooltipText = isDarkMode ? "#FFFFFF" : "#121212";

    switch (config.type) {
      case 'bar':
        return (
          <BarChart data={config.data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis dataKey={config.xAxis} fontSize={10} tickLine={false} axisLine={false} stroke={axisColor} />
            <YAxis fontSize={10} tickLine={false} axisLine={false} stroke={axisColor} />
            <Tooltip 
              contentStyle={{ borderRadius: '0', border: `1px solid ${tooltipBorder}`, background: tooltipBg, padding: '8px 12px' }}
              itemStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: '700', color: tooltipText }}
              labelStyle={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.5, marginBottom: '4px', color: tooltipText }}
            />
            <Bar dataKey={config.yAxis} fill={isDarkMode ? "#FFFFFF" : "#121212"} />
          </BarChart>
        );
      case 'line':
        return (
          <LineChart data={config.data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis dataKey={config.xAxis} fontSize={10} tickLine={false} axisLine={false} stroke={axisColor} />
            <YAxis fontSize={10} tickLine={false} axisLine={false} stroke={axisColor} />
            <Tooltip 
              contentStyle={{ borderRadius: '0', border: `1px solid ${tooltipBorder}`, background: tooltipBg, padding: '8px 12px' }}
              itemStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: '700', color: '#C2410C' }}
              labelStyle={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.5, marginBottom: '4px', color: tooltipText }}
            />
            <Line type="monotone" dataKey={config.yAxis} stroke="#C2410C" strokeWidth={1} dot={{ r: 2, fill: '#C2410C' }} />
          </LineChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={config.data}
              dataKey={config.yAxis}
              nameKey={config.xAxis}
              cx="50%"
              cy="50%"
              outerRadius={80}
              stroke="none"
            >
              {config.data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ borderRadius: '0', border: `1px solid ${tooltipBorder}`, background: tooltipBg, padding: '8px 12px' }}
              itemStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: '700', color: tooltipText }}
              labelStyle={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.5, marginBottom: '4px', color: tooltipText }}
            />
          </PieChart>
        );
       case 'area':
        return (
          <AreaChart data={config.data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis dataKey={config.xAxis} fontSize={10} tickLine={false} axisLine={false} stroke={axisColor} />
            <YAxis fontSize={10} tickLine={false} axisLine={false} stroke={axisColor} />
            <Tooltip 
              contentStyle={{ borderRadius: '0', border: `1px solid ${tooltipBorder}`, background: tooltipBg, padding: '8px 12px' }}
              itemStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: '700', color: tooltipText }}
              labelStyle={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.5, marginBottom: '4px', color: tooltipText }}
            />
            <Area type="monotone" dataKey={config.yAxis} stroke={isDarkMode ? "#FFFFFF" : "#121212"} fill={isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(18, 18, 18, 0.05)"} />
          </AreaChart>
        );
      case 'scatter':
        return (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis type="number" dataKey={config.xAxis} name={config.xAxis} fontSize={10} stroke={axisColor} />
            <YAxis type="number" dataKey={config.yAxis} name={config.yAxis} fontSize={10} stroke={axisColor} />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ borderRadius: '0', border: `1px solid ${tooltipBorder}`, background: tooltipBg, padding: '8px 12px' }}
              itemStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: '700', color: '#C2410C' }}
              labelStyle={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.5, marginBottom: '4px', color: tooltipText }}
            />
            <Scatter name="Data" data={config.data} fill="#C2410C" />
          </ScatterChart>
        );
      default:
        return <div>Unsupported chart type: {config.type}</div>;
    }
  };

  return (
    <div className="w-full h-80 mt-6 border-l-4 border-[#C2410C] pl-6 bg-transparent" id="chart-container">
      <h3 className={cn("label-caps mb-4", isDarkMode ? "text-white/80" : "text-[#121212]")}>{config.title}</h3>
      <div className="w-full h-[calc(100%-2rem)]">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
