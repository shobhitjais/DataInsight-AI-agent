/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DataRow {
  [key: string]: string | number | boolean | null;
}

export interface DataSummary {
  rowCount: number;
  columns: string[];
  sampleData: DataRow[];
  columnStats: {
    [key: string]: {
      type: 'numeric' | 'categorical' | 'date';
      uniqueCount: number;
      min?: number | string;
      max?: number | string;
      topValues?: string[];
    };
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'chart' | 'insight';
  chartConfig?: ChartConfig;
  dataframeConfig?: DataframeConfig;
  timestamp: number;
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'area';
  title: string;
  xAxis: string;
  yAxis: string;
  data: any[];
}

export interface DataframeConfig {
  title: string;
  headers: string[];
  rows: any[][];
}
