
'use server';
/**
 * @fileOverview An AI flow to translate text to a specified language.
 *
 * - translateText: A function that takes text and a target language and returns the translation.
 * - TranslateTextInput: The input schema for the translation flow.
 * - TranslateTextOutput: The output schema for the translation flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {googleAI} from '@genkit-ai/googleai';

const TranslateTextInputSchema = z.object({
  text: z.string().describe('The text to be translated.'),
  targetLanguage: z.string().describe('The target language for the translation (e.g., "Spanish", "English").'),
});
export type TranslateTextInput = z.infer<typeof TranslateTextInputSchema>;

const TranslateTextOutputSchema = z.object({
  translatedText: z.string().describe('The resulting translated text.'),
});
export type TranslateTextOutput = z.infer<typeof TranslateTextOutputSchema>;

export async function translateText(input: TranslateTextInput): Promise<TranslateTextOutput> {
  return translateTextFlow(input);
}

const translationPrompt = ai.definePrompt({
  name: 'translationPrompt',
  model: googleAI.model('gemini-1.5-flash-latest'),
  input: { schema: TranslateTextInputSchema },
  output: { schema: TranslateTextOutputSchema },
  prompt: `Translate the following text to {{{targetLanguage}}}. Respond only with the translated text.

Text to translate:
{{{text}}}
`,
});

const translateTextFlow = ai.defineFlow(
  {
    name: 'translateTextFlow',
    inputSchema: TranslateTextInputSchema,
    outputSchema: TranslateTextOutputSchema,
  },
  async (input) => {
    const { output } = await translationPrompt(input);

    if (!output) {
      throw new Error("The AI model did not return a valid translation.");
    }
    
    return output;
  }
);
