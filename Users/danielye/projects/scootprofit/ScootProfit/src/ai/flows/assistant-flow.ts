'use server';
/**
 * @fileOverview Un flujo de IA que actúa como un asistente de negocios para analizar datos financieros.
 *
 * - askBusinessAssistant: Una función que toma una pregunta y datos financieros y devuelve una respuesta analítica.
 * - AskBusinessAssistantInput: El tipo de entrada para el flujo del asistente.
 * - AskBusinessAssistantOutput: El tipo de retorno para el flujo del asistente.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/googleai';

const AskBusinessAssistantInputSchema = z.object({
  question: z.string().describe('La pregunta específica del usuario sobre el negocio.'),
  revenueData: z.string().describe('Una cadena que resume los datos históricos de ingresos mensuales (28 días). Ejemplo: "Periodo X: $120M, Periodo Y: $130M"'),
  expenseData: z.string().describe('Una cadena que resume los gastos totales de los últimos meses. Ejemplo: "Enero: $5M, Febrero: $6M"'),
});
export type AskBusinessAssistantInput = z.infer<typeof AskBusinessAssistantInputSchema>;

const AskBusinessAssistantOutputSchema = z.object({
  answer: z.string().describe('La respuesta del asistente a la pregunta del usuario, basada en los datos proporcionados.'),
});
export type AskBusinessAssistantOutput = z.infer<typeof AskBusinessAssistantOutputSchema>;

// La función principal exportada que los clientes llamarán.
export async function askBusinessAssistant(input: AskBusinessAssistantInput): Promise<AskBusinessAssistantOutput> {
  return assistantFlow(input);
}

// Define el prompt de Genkit para el modelo de IA.
const assistantPrompt = ai.definePrompt({
  name: 'assistantPrompt',
  model: googleAI.model('gemini-1.5-flash-latest'),
  input: { schema: AskBusinessAssistantInputSchema },
  output: { schema: AskBusinessAssistantOutputSchema },
  prompt: `
    Eres un asistente de negocios experto para una empresa de alquiler de scooters en Colombia.
    Tu tarea es responder preguntas de los usuarios sobre el rendimiento del negocio, basándote en los datos financieros proporcionados.
    La moneda es el Peso Colombiano (COP). Responde siempre en español de forma concisa y amigable.

    Aquí están los datos para tu análisis:
    - Datos de Ingresos (últimos períodos de 28 días): {{{revenueData}}}
    - Datos de Gastos (últimos meses): {{{expenseData}}}

    Pregunta del usuario:
    "{{{question}}}"

    Basado en los datos y la pregunta, proporciona una respuesta clara y útil. Si los datos no son suficientes para responder, indícalo amablemente.
  `,
});

// Define el flujo de Genkit que orquesta la lógica del asistente.
const assistantFlow = ai.defineFlow(
  {
    name: 'assistantFlow',
    inputSchema: AskBusinessAssistantInputSchema,
    outputSchema: AskBusinessAssistantOutputSchema,
  },
  async (input) => {
    const { output } = await assistantPrompt(input);

    if (!output) {
      throw new Error("El modelo de IA no devolvió una respuesta válida.");
    }
    
    return output;
  }
);
