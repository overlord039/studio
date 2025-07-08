'use server';
/**
 * @fileOverview A flow to convert a number to speech audio.
 *
 * - announceCalledNumber - Converts a number to an audio data URI.
 * - AnnounceCalledNumberInput - The input type for the announceCalledNumber function.
 * - AnnounceCalledNumberOutput - The return type for the announceCalledNumber function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import wav from 'wav';

const AnnounceCalledNumberInputSchema = z.object({
  number: z.number().describe('The number to be announced.'),
});
export type AnnounceCalledNumberInput = z.infer<typeof AnnounceCalledNumberInputSchema>;

const AnnounceCalledNumberOutputSchema = z.object({
    audioContent: z.string().describe('The base64 encoded WAV audio content.'),
});
export type AnnounceCalledNumberOutput = z.infer<typeof AnnounceCalledNumberOutputSchema>;


export async function announceCalledNumber(input: AnnounceCalledNumberInput): Promise<AnnounceCalledNumberOutput> {
  return announceCalledNumberFlow(input);
}

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    const bufs: any[] = [];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

const announceCalledNumberFlow = ai.defineFlow(
  {
    name: 'announceCalledNumberFlow',
    inputSchema: AnnounceCalledNumberInputSchema,
    outputSchema: AnnounceCalledNumberOutputSchema,
  },
  async input => {
    const { media } = await ai.generate({
        model: googleAI.model('gemini-2.5-flash-preview-tts'),
        config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Algenib' },
                },
            },
        },
        prompt: String(input.number),
    });

    if (!media) {
      throw new Error('No audio media was generated.');
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );
    
    const wavContent = await toWav(audioBuffer);

    return {
        audioContent: wavContent,
    };
  }
);
