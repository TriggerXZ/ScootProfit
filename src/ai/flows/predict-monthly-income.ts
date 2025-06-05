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
  prompt: `You are an expert financial analyst specializing in predicting future income for scooter rental businesses in Colombia.

You will use historical income data and seasonal trends to predict the next month's income in Colombian pesos.
Consider the historical data and any seasonal trends to provide an accurate prediction. Explain your reasoning.

Historical Data: {{{historicalData}}}
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
