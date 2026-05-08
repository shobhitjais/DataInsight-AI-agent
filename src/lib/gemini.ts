import { GoogleGenAI } from "@google/genai";
import { DataSummary, ChartConfig, DataframeConfig } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function* streamAnalysis(
  query: string, 
  dataSummary: DataSummary,
  history: { role: 'user' | 'assistant'; content: string }[]
) {
 const systemInstruction = `You are the FinRisk Intelligence Architect, a specialized Fintech data analyst focused on customer lifecycle value and churn mitigation.

Your primary objective is to identify friction points in the financial user journey using the following dataset:
- Total Rows: ${dataSummary.rowCount}
- Columns: ${dataSummary.columns.join(", ")}
- Statistics: ${JSON.stringify(dataSummary.columnStats)}

Fintech Analytical Protocol:
1. Identify Churn Catalysts: Look for "Silent Churn" indicators—decreasing transaction frequency, balance depletion, or high support ticket volume.
2. Segment Risk: Categorize users into "Stable," "At-Risk," and "Critical" based on their financial activity vectors.
3. Heuristic Dashboards: When generating charts, prioritize:
    - Correlation between Account Balance and Churn.
    - Transaction Frequency Heatmaps.
    - Tenure vs. Product Adoption rate.
4. Technical Precision: Use industry terms like 'AUM' (Assets Under Management), 'MRR' (Monthly Recurring Revenue), 'Retention Cohorts', and 'Liquidity Variance'.

Chart Logic:
If you suggest a chart, use the following format:
[CHART_START]
{
  "type": "bar" | "line" | "pie" | "scatter" | "area",
  "title": "A financial heuristic title (e.g., Churn Probability vs. Transaction Density)",
  "xAxis": "column_name",
  "yAxis": "column_name",
  "data": [...] 
}
[CHART_END]

5. Dataframe Logic:
If you want to present data in a tabular/dataframe format, use:
[DATAFRAME_START]
{
  "title": "A descriptive title for the data",
  "headers": ["Column 1", "Column 2", ...],
  "rows": [
    ["Value 1A", "Value 1B", ...],
    ["Value 2A", "Value 2B", ...]
  ]
}
[DATAFRAME_END]

Your goal is to transform raw entropy into a structured intelligence report.`;

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

export function parseDataframeConfig(text: string): DataframeConfig | null {
  const match = text.match(/\[DATAFRAME_START\]([\s\S]*?)\[DATAFRAME_END\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim());
  } catch (e) {
    console.error("Failed to parse dataframe config", e);
    return null;
  }
}
