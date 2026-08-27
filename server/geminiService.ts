import { GoogleGenAI, Type } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getGeminiAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export interface ExtractedInvoice {
  vendorName: string;
  totalInvoiceAmount: string;
  dueDate: string;
  invoiceNumber?: string;
  summary?: string;
  confidenceScore?: number;
}

export async function extractInvoiceData(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<ExtractedInvoice> {
  const ai = getGeminiAI();

  // Normalize mime type for Gemini
  let effectiveMimeType = mimeType;
  if (!effectiveMimeType || effectiveMimeType === 'application/octet-stream') {
    if (fileName.toLowerCase().endsWith('.pdf')) {
      effectiveMimeType = 'application/pdf';
    } else if (fileName.toLowerCase().endsWith('.png')) {
      effectiveMimeType = 'image/png';
    } else if (fileName.toLowerCase().endsWith('.jpg') || fileName.toLowerCase().endsWith('.jpeg')) {
      effectiveMimeType = 'image/jpeg';
    } else if (fileName.toLowerCase().endsWith('.webp')) {
      effectiveMimeType = 'image/webp';
    } else if (fileName.toLowerCase().endsWith('.txt') || fileName.toLowerCase().endsWith('.csv')) {
      effectiveMimeType = 'text/plain';
    }
  }

  const prompt = `You are a high-precision financial document analysis agent.
Analyze this invoice/receipt document ("${fileName}") and extract the following core financial details:
1. Vendor Name: The official business or company name of the vendor/supplier who issued this invoice.
2. Total Invoice Amount: The grand total amount due or charged, formatted with currency symbol if present (e.g. "$1,450.00", "€350.25", "£98.00").
3. Due Date: The payment due date. If an explicit due date is not written, use payment terms or issue date, formatted as YYYY-MM-DD (e.g. "2026-09-15") or as clearly stated on document.
4. Invoice Number: The invoice ID/reference number if found.
5. Summary: A short 1-sentence summary of the goods or services billed.
6. Confidence Score: A decimal between 0.0 and 1.0 indicating extraction confidence.

Be accurate and extract exact figures from the invoice.`;

  // Prepare content payload
  const isText = effectiveMimeType.startsWith('text/') || effectiveMimeType.includes('csv');
  let contents: any[] = [];

  if (isText) {
    const textContent = fileBuffer.toString('utf-8');
    contents = [
      { text: `Document content (${fileName}):\n\n${textContent}\n\n${prompt}` }
    ];
  } else {
    // Binary document like PDF or image
    contents = [
      {
        inlineData: {
          mimeType: effectiveMimeType,
          data: fileBuffer.toString('base64'),
        },
      },
      { text: prompt },
    ];
  }

  try {
    // Using gemini-2.5-flash (the modern fast model alias)
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vendorName: {
              type: Type.STRING,
              description: 'The legal or business name of the vendor or supplier.',
            },
            totalInvoiceAmount: {
              type: Type.STRING,
              description: 'The final total invoice amount with currency (e.g., $1,250.00).',
            },
            dueDate: {
              type: Type.STRING,
              description: 'The payment due date (e.g., 2026-09-15 or September 15, 2026).',
            },
            invoiceNumber: {
              type: Type.STRING,
              description: 'The invoice reference number or identifier.',
            },
            summary: {
              type: Type.STRING,
              description: 'Brief description of items or services.',
            },
            confidenceScore: {
              type: Type.NUMBER,
              description: 'Confidence score from 0.0 to 1.0.',
            },
          },
          required: ['vendorName', 'totalInvoiceAmount', 'dueDate'],
        },
      },
    });

    const responseText = response.text || '{}';
    const parsed = JSON.parse(responseText) as ExtractedInvoice;

    return {
      vendorName: parsed.vendorName || 'Unknown Vendor',
      totalInvoiceAmount: parsed.totalInvoiceAmount || 'N/A',
      dueDate: parsed.dueDate || 'N/A',
      invoiceNumber: parsed.invoiceNumber || 'N/A',
      summary: parsed.summary || 'Invoice document cataloged',
      confidenceScore: parsed.confidenceScore ?? 0.95,
    };
  } catch (err: any) {
    console.error('Gemini extraction error:', err);
    throw new Error(`Gemini 3.5/2.5 Flash invoice extraction failed: ${err.message}`);
  }
}
