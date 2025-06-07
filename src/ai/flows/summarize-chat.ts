// Summarizes a chat history for a user who has been away, to quickly catch them up on important updates.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeChatInputSchema = z.object({
  chatHistory: z
    .string()
    .describe('The complete chat history, including who sent each message.'),
  userName: z.string().describe('The name of the user receiving the summary.'),
});
export type SummarizeChatInput = z.infer<typeof SummarizeChatInputSchema>;

const SummarizeChatOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      'A concise summary of the chat history, highlighting key points and updates relevant to the user.'
    ),
});
export type SummarizeChatOutput = z.infer<typeof SummarizeChatOutputSchema>;

export async function summarizeChat(input: SummarizeChatInput): Promise<SummarizeChatOutput> {
  return summarizeChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeChatPrompt',
  input: {schema: SummarizeChatInputSchema},
  output: {schema: SummarizeChatOutputSchema},
  prompt: `You are an AI assistant summarizing a chat history for the user {{userName}} who has been away.

  Provide a concise summary of the following chat history, highlighting the key points and updates that {{userName}} needs to know.

  Chat History:
  {{chatHistory}}

  Summary:`,
});

const summarizeChatFlow = ai.defineFlow(
  {
    name: 'summarizeChatFlow',
    inputSchema: SummarizeChatInputSchema,
    outputSchema: SummarizeChatOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
