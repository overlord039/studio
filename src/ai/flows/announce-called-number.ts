'use server';
/**
 * @fileOverview Announces a called number using the Web Speech API.
 *
 * - announceCalledNumber - A function that announces the given number.
 * - AnnounceCalledNumberInput - The input type for the announceCalledNumber function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnnounceCalledNumberInputSchema = z.object({
  number: z.number().describe('The number to be announced.'),
});
export type AnnounceCalledNumberInput = z.infer<typeof AnnounceCalledNumberInputSchema>;

export async function announceCalledNumber(input: AnnounceCalledNumberInput): Promise<void> {
  return announceCalledNumberFlow(input);
}

const announceCalledNumberFlow = ai.defineFlow(
  {
    name: 'announceCalledNumberFlow',
    inputSchema: AnnounceCalledNumberInputSchema,
    outputSchema: z.void(),
  },
  async input => {
    // No LLM call needed, so just return void.
    // The actual speech synthesis will be handled in the client component.
  }
);
