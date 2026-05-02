import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, AreaChart, Area 
} from 'recharts';
import { ChartConfig } from '../types';

const COLORS = ['#121212', '#C2410C', '#666666', '#999999', '#333333'];

export const ChartRenderer: React.FC<{ config: ChartConfig }> = ({ config }) => {
  const renderChart = () => {
    switch (config.type) {
      case 'bar':
        return (
          <BarChart data={config.data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(18, 18, 18, 0.05)" />
            <XAxis dataKey={config.xAxis} fontSize={10} tickLine={false} axisLine={false} stroke="rgba(18, 18, 18, 0.4)" />
            <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="rgba(18, 18, 18, 0.4)" />
            <Tooltip 
              contentStyle={{ borderRadius: '0', border: '1px solid #121212', background: '#fff' }}
              itemStyle={{ fontSize: '10px', textTransform: 'uppercase' }}
            />
            <Bar dataKey={config.yAxis} fill="#121212" />
          </BarChart>
        );
      case 'line':
        return (
          <LineChart data={config.data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(18, 18, 18, 0.05)" />
            <XAxis dataKey={config.xAxis} fontSize={10} tickLine={false} axisLine={false} stroke="rgba(18, 18, 18, 0.4)" />
            <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="rgba(18, 18, 18, 0.4)" />
            <Tooltip 
              contentStyle={{ borderRadius: '0', border: '1px solid #121212', background: '#fff' }}
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
            <Tooltip />
          </PieChart>
        );
       case 'area':
        return (
          <AreaChart data={config.data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(18, 18, 18, 0.05)" />
            <XAxis dataKey={config.xAxis} fontSize={10} tickLine={false} axisLine={false} stroke="rgba(18, 18, 18, 0.4)" />
            <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="rgba(18, 18, 18, 0.4)" />
            <Tooltip 
              contentStyle={{ borderRadius: '0', border: '1px solid #121212', background: '#fff' }}
            />
            <Area type="monotone" dataKey={config.yAxis} stroke="#121212" fill="rgba(18, 18, 18, 0.05)" />
          </AreaChart>
        );
      case 'scatter':
        return (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(18, 18, 18, 0.05)" />
            <XAxis type="number" dataKey={config.xAxis} name={config.xAxis} fontSize={10} stroke="rgba(18, 18, 18, 0.4)" />
            <YAxis type="number" dataKey={config.yAxis} name={config.yAxis} fontSize={10} stroke="rgba(18, 18, 18, 0.4)" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name="Data" data={config.data} fill="#C2410C" />
          </ScatterChart>
        );
      default:
        return <div>Unsupported chart type: {config.type}</div>;
    }
  };

  return (
    <div className="w-full h-80 mt-6 border-l-4 border-[#C2410C] pl-6 bg-transparent" id="chart-container">
      <h3 className="label-caps mb-4 text-[#121212]">{config.title}</h3>
      <div className="w-full h-[calc(100%-2rem)]">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
