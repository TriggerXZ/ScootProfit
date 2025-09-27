
'use server';
/**
 * @fileOverview Un flujo de IA para analizar el rendimiento histórico del negocio y proporcionar insights.
 *
 * - analyzePerformance: Una función que toma datos agregados y devuelve un análisis cualitativo.
 * - AnalyzePerformanceInput: El tipo de entrada para el flujo de análisis.
 * - AnalyzePerformanceOutput: El tipo de retorno para el flujo de análisis.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/googleai';

const AnalyzePerformanceInputSchema = z.object({
  locationTotals: z.string().describe(
    'Una cadena separada por comas de los ingresos totales por ubicación. Ejemplo: "La 72: $10,000,000, El Cubo: $8,000,000"'
  ),
  groupTotals: z.string().describe(
    'Una cadena separada por comas de los ingresos totales por grupo de rotación. Ejemplo: "Grupo Cubo: $9,000,000, Grupo Luces: $9,500,000"'
  ),
});
export type AnalyzePerformanceInput = z.infer<typeof AnalyzePerformanceInputSchema>;

const AnalyzePerformanceOutputSchema = z.object({
  executiveSummary: z.string().describe('Un resumen breve y de alto nivel sobre el rendimiento general del negocio.'),
  positiveObservations: z.array(z.string()).describe('Una lista de puntos positivos clave, como las ubicaciones o grupos con mejor rendimiento.'),
  areasForImprovement: z.array(z.string()).describe('Una lista de áreas que necesitan atención, como los grupos o ubicaciones con menor rendimiento.'),
  recommendations: z.array(z.string()).describe('Una lista de recomendaciones accionables para mejorar el rendimiento.'),
  groupComparison: z.string().describe('Un análisis comparativo detallado entre el rendimiento de los diferentes grupos, destacando eficiencias o inconsistencias.')
});
export type AnalyzePerformanceOutput = z.infer<typeof AnalyzePerformanceOutputSchema>;

// The main exported function that clients will call.
export async function analyzePerformance(input: AnalyzePerformanceInput): Promise<AnalyzePerformanceOutput> {
  return analyzePerformanceFlow(input);
}

// Define the Genkit prompt for the AI model.
const performanceAnalysisPrompt = ai.definePrompt({
  name: 'performanceAnalysisPrompt',
  model: googleAI.model('gemini-1.5-flash'),
  input: { schema: AnalyzePerformanceInputSchema },
  output: { schema: AnalyzePerformanceOutputSchema },
  prompt: `
    Eres un analista de negocios para una empresa de alquiler de scooters en Colombia.
    Tu tarea es analizar los datos de rendimiento histórico proporcionados y generar un informe conciso con insights accionables.
    La moneda es el Peso Colombiano (COP). Responde siempre en español.

    Aquí están los datos para analizar:
    - Ingresos totales agregados por cada ubicación: {{{locationTotals}}}
    - Ingresos totales agregados por cada grupo de rotación: {{{groupTotals}}}

    Basado en estos datos, proporciona lo siguiente:
    1.  **Resumen Ejecutivo:** Un resumen de una o dos frases sobre la situación general.
    2.  **Observaciones Positivas:** 2-3 puntos destacando lo que está funcionando bien. Identifica la ubicación y el grupo de mayor rendimiento.
    3.  **Áreas de Mejora:** 2-3 puntos identificando la ubicación y el grupo de menor rendimiento, o cualquier disparidad significativa.
    4.  **Comparativa de Grupos:** Un análisis un poco más profundo comparando la eficiencia entre los grupos. Por ejemplo, si dos grupos tuvieron ingresos similares, ¿fue uno más consistente que el otro? ¿Hay algún patrón notable?
    5.  **Recomendaciones:** 2-3 recomendaciones claras y accionables. Por ejemplo, sugiere investigar por qué un grupo está rindiendo por debajo del promedio o enfocar esfuerzos de marketing en una ubicación específica.

    Sé conciso, profesional y enfócate en proporcionar valor de negocio real.
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
      throw new Error("El modelo de IA no devolvió un análisis válido.");
    }
    
    return output;
  }
);
