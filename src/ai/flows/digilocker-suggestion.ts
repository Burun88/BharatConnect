'use server';

/**
 * @fileOverview A DigiLocker document suggestion AI agent.
 *
 * - getDigiLockerSuggestions - A function that suggests relevant documents from DigiLocker based on chat context.
 * - DigiLockerSuggestionInput - The input type for the getDigiLockerSuggestions function.
 * - DigiLockerSuggestionOutput - The return type for the getDigiLockerSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DigiLockerSuggestionInputSchema = z.object({
  chatContext: z
    .string()
    .describe('The context of the current chat conversation.'),
  availableDocuments: z.array(z.string()).describe('A list of available document names in the user\'s DigiLocker.'),
});
export type DigiLockerSuggestionInput = z.infer<typeof DigiLockerSuggestionInputSchema>;

const DigiLockerSuggestionOutputSchema = z.object({
  suggestedDocuments: z
    .array(z.string())
    .describe('A list of document names suggested for sharing from DigiLocker.'),
  reasoning: z.string().describe('The AI\'s reasoning for suggesting these documents.'),
});
export type DigiLockerSuggestionOutput = z.infer<typeof DigiLockerSuggestionOutputSchema>;

export async function getDigiLockerSuggestions(input: DigiLockerSuggestionInput): Promise<DigiLockerSuggestionOutput> {
  return digiLockerSuggestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'digiLockerSuggestionPrompt',
  input: {schema: DigiLockerSuggestionInputSchema},
  output: {schema: DigiLockerSuggestionOutputSchema},
  prompt: `You are an AI assistant that suggests relevant documents from a user's DigiLocker account based on the context of their current chat.

  Given the following chat context and a list of available documents in the user's DigiLocker, determine which documents would be most helpful for the user to share.

  Chat Context: {{{chatContext}}}
  Available Documents: {{#each availableDocuments}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

  Output a list of suggested document names and your reasoning for suggesting them.

  Consider the user's privacy and only suggest documents that are directly relevant to the conversation.
  {{ai.output_schema}}
  `,
});

const digiLockerSuggestionFlow = ai.defineFlow(
  {
    name: 'digiLockerSuggestionFlow',
    inputSchema: DigiLockerSuggestionInputSchema,
    outputSchema: DigiLockerSuggestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
