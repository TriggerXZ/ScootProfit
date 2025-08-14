
'use server';
/**
 * @fileOverview An AI flow to predict future monthly income based on historical data.
 *
 * - predictMonthlyIncome: A function that takes past income data and returns a prediction for the next period.
 * - PredictMonthlyIncomeInput: The input schema for the prediction flow.
 * - PredictMonthlyIncomeOutput: The output schema for the prediction flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/googleai';

// Input schema for the income prediction flow.
const PredictMonthlyIncomeInputSchema = z.object({
  pastIncome: z.string().describe(
    'A comma-separated string of past monthly income data. Each entry should be in the format "Period Label:Amount". ' +
    'Example: "Periodo del 4 jun al 1 jul 2024:115000000,Periodo del 2 jul al 29 jul 2024:125000000"'
  ),
});
export type PredictMonthlyIncomeInput = z.infer<typeof PredictMonthlyIncomeInputSchema>;

// Output schema for the income prediction flow.
const PredictMonthlyIncomeOutputSchema = z.object({
  estimatedIncome: z.number().describe('The estimated income for the next 28-day period, in Colombian Pesos.'),
  analysis: z.string().describe('A brief analysis of the prediction, mentioning trends, seasonality, or confidence level.'),
});
export type PredictMonthlyIncomeOutput = z.infer<typeof PredictMonthlyIncomeOutputSchema>;

// The main exported function that clients will call.
export async function predictMonthlyIncome(input: PredictMonthlyIncomeInput): Promise<PredictMonthlyIncomeOutput> {
  return predictIncomeFlow(input);
}

// Define the Genkit prompt for the AI model.
const incomePredictionPrompt = ai.definePrompt({
  name: 'incomePredictionPrompt',
  model: googleAI.model('gemini-1.5-flash-latest'),
  input: { schema: PredictMonthlyIncomeInputSchema },
  output: { schema: PredictMonthlyIncomeOutputSchema },
  prompt: `
    You are a financial analyst for a scooter rental business in Colombia.
    Your task is to predict the total income for the next 28-day period based on the historical data provided.

    Analyze the past income data for trends, growth, and potential seasonality.
    The currency is Colombian Pesos (COP).

    Historical Data:
    {{{pastIncome}}}

    Based on your analysis, provide a realistic income estimate for the next 28-day period.
    Also, provide a brief, one or two-sentence analysis explaining your reasoning. For example, mention if you see a growth trend or if your prediction is conservative due to fluctuations.
    Present the estimated income as a single number without currency symbols or formatting.
  `,
});

// Define the Genkit flow that orchestrates the prediction.
const predictIncomeFlow = ai.defineFlow(
  {
    name: 'predictIncomeFlow',
    inputSchema: PredictMonthlyIncomeInputSchema,
    outputSchema: PredictMonthlyIncomeOutputSchema,
  },
  async (input) => {
    // Generate the response from the AI model using the defined prompt.
    const { output } = await incomePredictionPrompt(input);

    // If the model does not return a valid output, throw an error.
    if (!output) {
      throw new Error("The AI model did not return a valid prediction.");
    }
    
    return output;
  }
);
