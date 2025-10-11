
'use server';
/**
 * @fileOverview An AI flow for analyzing financial performance data.
 * It takes current and historical data to provide insights and recommendations.
 */
import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { AggregatedTotal } from '@/types';

const PerformanceAnalysisInputSchema = z.object({
  currentPeriodData: z.custom<AggregatedTotal>(),
  historicalData: z.string().optional().describe("A comma-separated string of monthly revenues, e.g., 'Jan:10M,Feb:12M,Mar:11M'"),
});

const PerformanceAnalysisOutputSchema = z.object({
  title: z.string().describe("A concise, engaging title for the analysis."),
  summary: z.string().describe("A brief summary of the overall financial performance in the period."),
  positivePoints: z.array(z.string()).describe("2-3 key positive highlights or successes."),
  areasForImprovement: z.array(z.string()).describe("2-3 key areas that need attention or could be improved."),
  recommendation: z.string().describe("A primary, actionable recommendation based on the analysis."),
});


export async function analyzePerformance(
  currentPeriodData: AggregatedTotal, 
  historicalData?: string
): Promise<z.infer<typeof PerformanceAnalysisOutputSchema>> {
  
  const analysisFlow = ai.defineFlow(
    {
      name: 'performanceAnalysisFlow',
      inputSchema: PerformanceAnalysisInputSchema,
      outputSchema: PerformanceAnalysisOutputSchema,
    },
    async (input) => {
      const prompt = ai.definePrompt(
        {
          name: 'performanceAnalysisPrompt',
          input: { schema: PerformanceAnalysisInputSchema },
          output: { schema: PerformanceAnalysisOutputSchema },
          model: 'googleai/gemini-1.5-pro-latest',
          config: { temperature: 0.3 },
          prompt: `
            You are an expert financial advisor for a scooter rental business.
            Your task is to analyze the provided performance data and generate a clear, concise, and actionable report.
            The currency is Colombian Pesos (COP).

            Analyze the following data for the period: ${input.currentPeriodData.period}.

            - Total Revenue: ${input.currentPeriodData.totalRevenueInPeriod}
            - Net Profit: ${input.currentPeriodData.finalNetProfit}
            - Net Share per Member: ${input.currentPeriodData.netMemberShare}
            - Total Fixed Costs: ${input.currentPeriodData.deductionsDetail.totalDeductions}
            - Total Variable Expenses: ${input.currentPeriodData.totalVariableExpenses}
            - Performance by Group: ${JSON.stringify(input.currentPeriodData.groupRevenueTotals)}
            
            ${input.historicalData ? `For context, here is the historical revenue trend for recent months: ${input.historicalData}. Use this to identify growth, decline, or stagnation trends.` : ''}

            Based on this data, generate a report with the following structure:
            1.  **title**: A short, engaging title for the analysis.
            2.  **summary**: A brief overview of the key results (profitability, comparison to goals if applicable).
            3.  **positivePoints**: 2-3 bullet points highlighting what went well (e.g., top-performing groups, high revenue, controlled costs).
            4.  **areasForImprovement**: 2-3 bullet points on what could be better (e.g., high expenses in a category, underperforming groups, negative profit).
            5.  **recommendation**: One primary, actionable recommendation. What is the single most important thing the business should do next?

            Be professional, clear, and focus on business insights.
          `,
        }
      );
      const { output } = await prompt(input);
      if (!output) {
        throw new Error("AI analysis failed to generate a valid output.");
      }
      return output;
    }
  );

  return await analysisFlow({ currentPeriodData, historicalData });
}
