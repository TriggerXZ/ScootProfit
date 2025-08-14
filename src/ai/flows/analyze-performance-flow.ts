
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

// Input schema for the performance analysis flow.
const AnalyzePerformanceInputSchema = z.object({
  locationTotals: z.string().describe(
    'Una cadena separada por comas del ingreso total por ubicación. Ejemplo: "La 72: $10,000,000, El Cubo: $8,000,000"'
  ),
  groupTotals: z.string().describe(
    'Una cadena separada por comas del ingreso total por grupo. Ejemplo: "Grupo Cubo: $9,000,000, Grupo Luces: $9,500,000"'
  ),
});
export type AnalyzePerformanceInput = z.infer<typeof AnalyzePerformanceInputSchema>;

// Output schema for the performance analysis flow.
const AnalyzePerformanceOutputSchema = z.object({
  executiveSummary: z.string().describe('Un resumen breve y de alto nivel del rendimiento general del negocio.'),
  positiveObservations: z.array(z.string()).describe('Una lista de puntos positivos clave, como las ubicaciones o grupos con mejor rendimiento.'),
  areasForImprovement: z.array(z.string()).describe('Una lista de áreas que necesitan atención, como los grupos o ubicaciones con menor rendimiento.'),
  recommendations: z.array(z.string()).describe('Una lista de recomendaciones accionables para mejorar el rendimiento.'),
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
    Eres un analista de negocios para una empresa de alquiler de scooters en Colombia.
    Tu tarea es analizar los datos históricos de rendimiento proporcionados y generar un informe conciso con ideas accionables.
    La moneda es el peso colombiano (COP).

    Aquí están los datos para analizar:
    - Ingresos totales acumulados por cada ubicación: {{{locationTotals}}}
    - Ingresos totales acumulados por cada grupo de rotación: {{{groupTotals}}}

    Basado en estos datos, proporciona lo siguiente:
    1.  **Resumen Ejecutivo:** Un resumen de una o dos frases sobre la situación general.
    2.  **Observaciones Positivas:** 2-3 puntos destacando lo que está funcionando bien. Identifica la ubicación y el grupo con mejor rendimiento.
    3.  **Áreas de Mejora:** 2-3 puntos identificando la ubicación y el grupo con el rendimiento más bajo, o cualquier disparidad significativa.
    4.  **Recomendaciones:** 2-3 recomendaciones claras y accionables. Por ejemplo, sugiere investigar por qué un cierto grupo tiene un rendimiento bajo o enfocar los esfuerzos de marketing en una ubicación específica.

    Sé conciso, profesional y enfócate en proporcionar un valor de negocio real.
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
