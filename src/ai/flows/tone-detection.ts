'use server';

/**
 * @fileOverview An AI agent that detects the tone of a message and suggests aura options.
 *
 * - detectToneAndSuggestAuras - A function that handles the tone detection and aura suggestion process.
 * - ToneDetectionInput - The input type for the detectToneAndSuggestAuras function.
 * - ToneDetectionOutput - The return type for the detectToneAndSuggestAuras function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ToneDetectionInputSchema = z.object({
  message: z.string().describe('The message to analyze for tone.'),
});
export type ToneDetectionInput = z.infer<typeof ToneDetectionInputSchema>;

const ToneDetectionOutputSchema = z.object({
  tone: z.string().describe('The detected tone of the message.'),
  suggestedAuras: z
    .array(z.string())
    .describe('Suggested aura options based on the detected tone.'),
});
export type ToneDetectionOutput = z.infer<typeof ToneDetectionOutputSchema>;

export async function detectToneAndSuggestAuras(
  input: ToneDetectionInput
): Promise<ToneDetectionOutput> {
  return detectToneAndSuggestAurasFlow(input);
}

const prompt = ai.definePrompt({
  name: 'toneDetectionPrompt',
  input: {schema: ToneDetectionInputSchema},
  output: {schema: ToneDetectionOutputSchema},
  prompt: `You are an AI assistant designed to detect the tone of a message and suggest appropriate aura options.

Analyze the following message and determine its tone. Then, suggest 3 aura options that best reflect the detected tone.

Message: {{{message}}}

Respond in JSON format with the tone and suggestedAuras fields.
`,
});

const detectToneAndSuggestAurasFlow = ai.defineFlow(
  {
    name: 'detectToneAndSuggestAurasFlow',
    inputSchema: ToneDetectionInputSchema,
    outputSchema: ToneDetectionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
