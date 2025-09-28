/**
 * @fileoverview This file initializes the Genkit AI framework with the Google AI plugin.
 * It exports a configured `ai` object for use throughout the application.
 */
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI()],
});
