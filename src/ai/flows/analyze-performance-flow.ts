
'use server';
/**
 * @fileOverview An AI flow to analyze historical business performance and provide insights.
 *
 * - analyzePerformance: A function that takes aggregated data and returns a qualitative analysis.
 * - AnalyzePerformanceInput: The input schema for the analysis flow.
 * - AnalyzePerformanceOutput: The output schema for the analysis flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/googleai';

const AnalyzePerformanceInputSchema = z.object({
  locationTotals: z.string().describe(
    'A comma-separated string of total revenue per location. Example: "La 72: $10,000,000, El Cubo: $8,000,000"'
  ),
  groupTotals: z.string().describe(
    'A comma-separated string of total revenue per group. Example: "Grupo Cubo: $9,000,000, Grupo Luces: $9,500,000"'
  ),
});
export type AnalyzePerformanceInput = z.infer<typeof AnalyzePerformanceInputSchema>;

const AnalyzePerformanceOutputSchema = z.object({
  executiveSummary: z.string().describe('A brief, high-level summary of the overall business performance.'),
  positiveObservations: z.array(z.string()).describe('A list of key positive points, such as top-performing locations or groups.'),
  areasForImprovement: z.array(z.string()).describe('A list of areas that need attention, such as underperforming groups or locations.'),
  recommendations: z.array(z.string()).describe('A list of actionable recommendations to improve performance.'),
});
export type AnalyzePerformanceOutput = z.infer<typeof AnalyzePerformanceOutputSchema>;

// The main exported function that clients will call.
export async function analyzePerformance(input: AnalyzePerformanceInput): Promise<AnalyzePerformanceOutput> {
  return analyzePerformanceFlow(input);
}

// Define the Genkit prompt for the AI model.
const performanceAnalysisPrompt = ai.definePrompt({
  name: 'performanceAnalysisPrompt',
  model: googleAI.model('gemini-1.5-flash-latest'),
  input: { schema: AnalyzePerformanceInputSchema },
  output: { schema: AnalyzePerformanceOutputSchema },
  prompt: `
    You are a business analyst for a scooter rental company in Colombia.
    Your task is to analyze the provided historical performance data and generate a concise report with actionable insights.
    The currency is Colombian Pesos (COP).

    Here is the data to analyze:
    - Total aggregated revenue for each location: {{{locationTotals}}}
    - Total aggregated revenue for each rotation group: {{{groupTotals}}}

    Based on this data, provide the following:
    1.  **Executive Summary:** A one or two-sentence summary of the overall situation.
    2.  **Positive Observations:** 2-3 bullet points highlighting what is working well. Identify the top-performing location and group.
    3.  **Areas for Improvement:** 2-3 bullet points identifying the lowest-performing location and group, or any significant disparities.
    4.  **Recommendations:** 2-3 clear, actionable recommendations. For example, suggest investigating why a certain group is underperforming or focusing marketing efforts on a specific location.

    Be concise, professional, and focus on providing real business value. Respond in English.
  `,
});

// Define the Genkit flow that orchestrates the analysis.
const analyzePerformanceFlow = ai.defineFlow(
  {
    name: 'analyzePerformanceFlow',
    inputSchema: AnalyzePerformanceInputSchema,
    outputSchema: AnalyzePerformanceOutputSchema,
  },
  async (input) => {
    // Generate the response from the AI model using the defined prompt.
    const { output } = await performanceAnalysisPrompt(input);

    // If the model does not return a valid output, throw an error.
    if (!output) {
      throw new Error("The AI model did not return a valid analysis.");
    }
    
    return output;
  }
);
