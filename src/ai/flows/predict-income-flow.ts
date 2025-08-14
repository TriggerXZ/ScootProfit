
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
  estimatedIncome: z.number().describe('El ingreso estimado para el próximo período de 28 días, en pesos colombianos.'),
  analysis: z.string().describe('Un breve análisis de la predicción, mencionando tendencias, estacionalidad o nivel de confianza.'),
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
    Eres un analista financiero para un negocio de alquiler de scooters en Colombia.
    Tu tarea es predecir el ingreso total para el próximo período de 28 días basado en los datos históricos proporcionados.

    Analiza los datos de ingresos pasados en busca de tendencias, crecimiento y posible estacionalidad.
    La moneda es el peso colombiano (COP).

    Datos Históricos:
    {{{pastIncome}}}

    Basado en tu análisis, proporciona una estimación de ingresos realista para el próximo período de 28 días.
    Además, proporciona un breve análisis de una o dos frases explicando tu razonamiento. Por ejemplo, menciona si ves una tendencia de crecimiento o si tu predicción es conservadora debido a fluctuaciones.
    Presenta el ingreso estimado como un solo número sin símbolos de moneda ni formato.
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
