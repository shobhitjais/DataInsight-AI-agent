import Papa from 'papaparse';
import { DataRow, DataSummary } from '../types';

export function parseCSV(file: File): Promise<DataRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data as DataRow[]);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

export function generateDataSummary(data: DataRow[]): DataSummary {
  if (data.length === 0) {
    return {
      rowCount: 0,
      columns: [],
      sampleData: [],
      columnStats: {}
    };
  }

  const columns = Object.keys(data[0]);
  const rowCount = data.length;
  const sampleData = data.slice(0, 5);
  const columnStats: DataSummary['columnStats'] = {};

  columns.forEach(col => {
    const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined);
    const uniqueValues = new Set(values);
    
    // Simple type detection
    const firstVal = values.find(v => v !== null && v !== undefined);
    const type = typeof firstVal === 'number' ? 'numeric' : 'categorical';

    columnStats[col] = {
      type: type as 'numeric' | 'categorical',
      uniqueCount: uniqueValues.size,
    };

    if (type === 'numeric') {
      const numValues = values as number[];
      columnStats[col].min = Math.min(...numValues);
      columnStats[col].max = Math.max(...numValues);
    } else {
      // Top 5 values
      const counts: { [key: string]: number } = {};
      values.forEach(v => {
        const key = String(v);
        counts[key] = (counts[key] || 0) + 1;
      });
      columnStats[col].topValues = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([val]) => val);
    }
  });

  return {
    rowCount,
    columns,
    sampleData,
    columnStats
  };
}

/**
 * Data Cleaning Utilities
 */

export function imputeMissing(data: DataRow[], column: string, strategy: 'mean' | 'median' | 'mode'): DataRow[] {
  const values = data.map(r => r[column]).filter(v => v !== null && v !== undefined && v !== '');
  if (values.length === 0) return data;

  let fillValue: any;

  if (strategy === 'mode') {
    const counts: { [key: string]: number } = {};
    values.forEach(v => {
      const key = String(v);
      counts[key] = (counts[key] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    fillValue = sorted[0][0];
    
    // Try to restore original type if it was numeric or boolean
    const firstVal = values[0];
    if (typeof firstVal === 'number') fillValue = Number(fillValue);
    if (typeof firstVal === 'boolean') fillValue = fillValue === 'true';
  } else {
    const numValues = values.map(v => Number(v)).filter(v => !isNaN(v));
    if (strategy === 'mean') {
      fillValue = numValues.reduce((a, b) => a + b, 0) / numValues.length;
    } else {
      numValues.sort((a, b) => a - b);
      fillValue = numValues[Math.floor(numValues.length / 2)];
    }
  }

  return data.map(row => ({
    ...row,
    [column]: (row[column] === null || row[column] === undefined || row[column] === '') ? fillValue : row[column]
  }));
}

export function detectOutliers(data: DataRow[], column: string): number[] {
  const values = data.map(r => Number(r[column])).filter(v => !isNaN(v));
  if (values.length === 0) return [];

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.map(v => Math.pow(v - mean, 2)).reduce((a, b) => a + b, 0) / values.length);
  
  // Z-score > 3
  return data.reduce((acc, row, idx) => {
    const val = Number(row[column]);
    if (!isNaN(val) && Math.abs((val - mean) / std) > 3) {
      acc.push(idx);
    }
    return acc;
  }, [] as number[]);
}

export function standardize(data: DataRow[], column: string): DataRow[] {
  const values = data.map(r => Number(r[column])).filter(v => !isNaN(v));
  if (values.length === 0) return data;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.map(v => Math.pow(v - mean, 2)).reduce((a, b) => a + b, 0) / values.length);

  return data.map(row => {
    const val = Number(row[column]);
    return {
      ...row,
      [column]: isNaN(val) ? row[column] : (val - mean) / std
    };
  });
}

export function exportCSV(data: DataRow[], filename: string) {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
