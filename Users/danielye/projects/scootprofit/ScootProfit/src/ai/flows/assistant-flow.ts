
'use server';
/**
 * @fileOverview Un flujo de IA que actúa como un asistente de negocios, respondiendo preguntas sobre datos de ingresos y gastos.
 *
 * - askBusinessAssistant: Función principal que procesa la pregunta del usuario y los datos del negocio.
 * - BusinessAssistantInput: El tipo de entrada para el flujo del asistente.
 * - BusinessAssistantOutput: El tipo de retorno para el flujo del asistente.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/googleai';

const BusinessAssistantInputSchema = z.object({
  question: z.string().describe('La pregunta específica del usuario sobre sus datos de negocio.'),
  revenueData: z.string().describe('Una cadena JSON que contiene un array de todos los registros de ingresos diarios.'),
  expenseData: z.string().describe('Una cadena JSON que contiene un array de todos los registros de gastos.'),
});
export type BusinessAssistantInput = z.infer<typeof BusinessAssistantInputSchema>;

const BusinessAssistantOutputSchema = z.object({
  answer: z.string().describe('La respuesta clara, concisa y útil a la pregunta del usuario, basada en los datos proporcionados.'),
});
export type BusinessAssistantOutput = z.infer<typeof BusinessAssistantOutputSchema>;

// La función principal exportada que los clientes llamarán.
export async function askBusinessAssistant(input: BusinessAssistantInput): Promise<BusinessAssistantOutput> {
  return businessAssistantFlow(input);
}

// Define el prompt de Genkit para el modelo de IA.
const assistantPrompt = ai.definePrompt({
  name: 'businessAssistantPrompt',
  model: googleAI.model('gemini-1.5-flash-latest'),
  input: { schema: BusinessAssistantInputSchema },
  output: { schema: BusinessAssistantOutputSchema },
  prompt: `
    Eres un asistente de negocios experto para una empresa de alquiler de scooters en Colombia.
    Tu tarea es analizar los datos de ingresos y gastos proporcionados para responder la pregunta del usuario de manera precisa y útil.
    La moneda es el Peso Colombiano (COP). Responde siempre en español.

    Aquí están los datos que necesitas para tu análisis:
    - Historial de Ingresos Diarios (en formato JSON): {{{revenueData}}}
    - Historial de Gastos (en formato JSON): {{{expenseData}}}

    Pregunta del usuario:
    "{{{question}}}"

    Instrucciones:
    1.  Analiza los datos de ingresos y gastos para entender el contexto completo.
    2.  Responde la pregunta del usuario de la manera más directa y clara posible.
    3.  Si la pregunta requiere cálculos (sumas, promedios, comparaciones), realízalos.
    4.  Si los datos no son suficientes para responder, indícalo amablemente.
    5.  Formatea los números de moneda de forma clara (ej. $1,234,567 COP).
    6.  Sé amable y profesional. Tu objetivo es proporcionar insights valiosos basados en los datos.
  `,
   config: {
    temperature: 0.3, // Un poco más determinista para respuestas basadas en datos
  },
});

// Define el flujo de Genkit que orquesta la lógica del asistente.
const businessAssistantFlow = ai.defineFlow(
  {
    name: 'businessAssistantFlow',
    inputSchema: BusinessAssistantInputSchema,
    outputSchema: BusinessAssistantOutputSchema,
  },
  async (input) => {
    // Genera la respuesta del modelo de IA usando el prompt definido.
    const { output } = await assistantPrompt(input);

    // Si el modelo no devuelve una salida válida, lanza un error.
    if (!output) {
      throw new Error("El modelo de IA no devolvió una respuesta válida.");
    }
    
    return output;
  }
);
