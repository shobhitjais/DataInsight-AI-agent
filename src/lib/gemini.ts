import { GoogleGenAI } from "@google/genai";
import { DataSummary, ChartConfig } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function* streamAnalysis(
  query: string, 
  dataSummary: DataSummary,
  history: { role: 'user' | 'assistant'; content: string }[]
) {
  const systemInstruction = `You are DataInsight AI, a professional data analyst.
You have access to a dataset summarized as follows:
- Total Rows: ${dataSummary.rowCount}
- Columns: ${dataSummary.columns.join(", ")}
- Column Statistics: ${JSON.stringify(dataSummary.columnStats)}
- Sample Data: ${JSON.stringify(dataSummary.sampleData)}

Instructions:
1. Provide deep insights, not just surface-level descriptions.
2. If the user asks for a visualization, describe the visualization in text AND prepare to suggest a chart.
3. Be concise but thorough.
4. If you suggest a chart, use the following format at the end of your response:
   [CHART_START]
   {
     "type": "bar" | "line" | "pie" | "scatter" | "area",
     "title": "A clear title",
     "xAxis": "column_name",
     "yAxis": "column_name",
     "data": [...] // Only if the user requested a specific aggregation that isn't directly in the dataset, otherwise I will handle mapping.
   }
   [CHART_END]
   Actually, provide the data directly in the chart config if it's an aggregation. If it's a direct mapping of the existing data, the client can handle it, but it's safer if you provide the aggregated data for the chart.

Current context: Analysis of an uploaded dataset.`;

  const model = "gemini-3-flash-preview"; // Using the correct preview model as per skill guidelines

  const contents = [
    ...history.map(h => ({ role: h.role, parts: [{ text: h.content }] })),
    { role: 'user', parts: [{ text: query }] }
  ];

  const stream = await ai.models.generateContentStream({
    model,
    contents,
    config: {
      systemInstruction,
      temperature: 0.2, // Low temperature for more factual data analysis
    }
  });

  for await (const chunk of stream) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}

export function parseChartConfig(text: string): ChartConfig | null {
  const match = text.match(/\[CHART_START\]([\s\S]*?)\[CHART_END\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim());
  } catch (e) {
    console.error("Failed to parse chart config", e);
    return null;
  }
}
