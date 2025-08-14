
'use server';
/**
 * @fileoverview This file initializes the Genkit AI framework and configures the Google AI plugin.
 * It sets up a global `ai` object that can be used throughout the application to interact with generative models.
 *
 * It is crucial to have the `GEMINI_API_KEY` environment variable set for the Google AI plugin to work.
 */

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Initialize Genkit and configure the Google AI plugin.
// The plugin requires the GEMINI_API_KEY environment variable to be set.
// You can get a key from Google AI Studio: https://aistudio.google.com/app/apikey
export const ai = genkit({
  plugins: [
    googleAI({
      // The API key is read automatically from the GEMINI_API_KEY environment variable.
      // Make sure to set this variable in your deployment environment (e.g., Netlify, Vercel)
      // and in your local .env.local file for development.
    }),
  ],
  // Log developer-level details to the console.
  logLevel: 'debug',
  // Omit transaction-level details from the log.
  enableTracing: false,
});
