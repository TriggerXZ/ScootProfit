
'use server';

/**
 * @fileOverview An AI agent to predict future monthly income based on historical data and seasonal trends.
 *
 * - predictMonthlyIncome - A function that handles the prediction process.
 * - PredictMonthlyIncomeInput - The input type for the predictMonthlyIncome function.
 * - PredictMonthlyIncomeOutput - The return type for the predictMonthlyIncome function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PredictMonthlyIncomeInputSchema = z.object({
  historicalData: z
    .string()
    .describe(
      'A string containing historical monthly income data, with each month and income separated by commas.'
    ),
  seasonalTrends: z
    .string()
    .optional()
    .describe(
      'Optional string describing seasonal trends affecting income, like increased rentals during holidays.'
    ),
});
export type PredictMonthlyIncomeInput = z.infer<typeof PredictMonthlyIncomeInputSchema>;

const PredictMonthlyIncomeOutputSchema = z.object({
  predictedIncome: z
    .number()
    .describe(
      'The predicted monthly income in Colombian pesos, based on historical data and seasonal trends.'
    ),
  reasoning: z
    .string()
    .describe(
      'Explanation of the factors considered for the prediction, including historical data and seasonal trends.'
    ),
});
export type PredictMonthlyIncomeOutput = z.infer<typeof PredictMonthlyIncomeOutputSchema>;

export async function predictMonthlyIncome(
  input: PredictMonthlyIncomeInput
): Promise<PredictMonthlyIncomeOutput> {
  return predictMonthlyIncomeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'predictMonthlyIncomePrompt',
  input: {schema: PredictMonthlyIncomeInputSchema},
  output: {schema: PredictMonthlyIncomeOutputSchema},
  prompt: `You are an expert financial analyst specializing in predicting future income for a scooter rental business in Colombia. The business operates with four groups of members who rotate weekly across four different physical locations. The business's income is reported in 28-day periods, not calendar months.

You will use historical income data (for 28-day periods) and seasonal trends to predict the next 28-day period's income in Colombian pesos.
Your analysis must be detailed and take into account the cyclical nature of the business.

Here's the context:
1.  **Business Model**: Four groups of members rotate through four locations weekly. A full rotation cycle takes 4 weeks (28 days). The performance of a group can be influenced by the location they are assigned to in a given week.
2.  **Historical Data**: This data represents the total income for past 28-day periods.
3.  **Seasonal Trends**: User-provided context about external factors (holidays, weather, etc.).

Your Task:
- Analyze the provided historical data to identify growth trends, seasonality, or cyclical patterns based on the 28-day periods.
- Incorporate the seasonal trends provided by the user.
- Provide a clear, step-by-step reasoning for your prediction. Explain how you are weighing the historical data and the seasonal trends. Discuss potential variability.
- Output a single number for the predicted income for the next 28-day period.

Historical Data (28-day periods): {{{historicalData}}}
Seasonal Trends: {{{seasonalTrends}}}

Provide the predicted income and a detailed explanation of your reasoning.
`,
});

const predictMonthlyIncomeFlow = ai.defineFlow(
  {
    name: 'predictMonthlyIncomeFlow',
    inputSchema: PredictMonthlyIncomeInputSchema,
    outputSchema: PredictMonthlyIncomeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
