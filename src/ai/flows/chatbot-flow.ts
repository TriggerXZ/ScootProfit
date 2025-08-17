import { defineFlow, generate } from 'genkit';
import { z } from 'zod';

export const chatbotFlow = defineFlow(
  {
    name: 'chatbotFlow',
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (prompt) => {
    const response = await generate({
      prompt: `Echo: ${prompt}`,
      config: {
        maxOutputTokens: 128,
      },
    });
    return response.text();
  }
);