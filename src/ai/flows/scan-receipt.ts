// Scans a receipt image and extracts the amount, date, and vendor information.
//
// - scanReceipt - A function that handles the receipt scanning process.
// - ScanReceiptInput - The input type for the scanReceipt function.
// - ScanReceiptOutput - The return type for the scanReceipt function.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ScanReceiptInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ScanReceiptInput = z.infer<typeof ScanReceiptInputSchema>;

const ScanReceiptOutputSchema = z.object({
  amount: z.number().describe('The total amount on the receipt.'),
  date: z.string().describe('The date on the receipt (ISO format).'),
  vendor: z.string().describe('The name of the vendor on the receipt.'),
});
export type ScanReceiptOutput = z.infer<typeof ScanReceiptOutputSchema>;

export async function scanReceipt(input: ScanReceiptInput): Promise<ScanReceiptOutput> {
  return scanReceiptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'scanReceiptPrompt',
  input: {schema: ScanReceiptInputSchema},
  output: {schema: ScanReceiptOutputSchema},
  prompt: `You are an expert receipt scanner and data extractor. Your job is to extract the amount, date, and vendor from the receipt image provided.

  Return the data as a JSON object.

  Receipt Image: {{media url=photoDataUri}}
  `,
});

const scanReceiptFlow = ai.defineFlow(
  {
    name: 'scanReceiptFlow',
    inputSchema: ScanReceiptInputSchema,
    outputSchema: ScanReceiptOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
