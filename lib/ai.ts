import OpenAI from 'openai';
import jpeg from 'jpeg-js';
import { PDFDocument, PDFName, PDFRawStream, PDFDict } from 'pdf-lib';

/**
 * Lazy load OpenAI to prevent build-time errors when env var is missing
 */
function getOpenAI() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        // Warning instead of error to allow build to pass if this path isn't hit
        console.warn("OPENAI_API_KEY is missing. AI features will fail at runtime.");
    }
    return new OpenAI({ apiKey: apiKey || 'dummy-key-for-build' });
}

/**
 * Extracts raw image data from a PDF buffer using pdf-lib.
 * This looks for XObject Images in the PDF resources.
 * 
 * NOTE: This replaces pdfjs-dist usage which proved incompatible with Vercel Serverless.
 */
export async function extractImagesFromPdf(pdfBuffer: Buffer): Promise<{ pageNumber: number, image: Buffer }[]> {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    const extractedImages: { pageNumber: number, image: Buffer }[] = [];

    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];

        // Resources() is a method on PDFPageLeaf
        const resources = page.node.Resources();
        if (!resources || !(resources instanceof PDFDict)) continue;

        // Resources is a PDFDictionary
        const xObjects = resources.lookup(PDFName.of('XObject'));
        if (!xObjects || !(xObjects instanceof PDFDict)) continue;

        // Iterate through XObjects keys
        const keys = xObjects.keys();
        for (const key of keys) {
            const xObject = xObjects.lookup(key);

            // We are looking for an Image XObject
            if (xObject instanceof PDFRawStream) {
                const subtype = xObject.dict.lookup(PDFName.of('Subtype'));
                if (subtype === PDFName.of('Image')) {
                    const data = xObject.contents;
                    // The data is likely already a JPEG or PNG stream if filter is DCTDecode
                    // Note: Real-world PDFs might have FlateDecode (PNG) or other filters. 
                    // To keep it simple and robust for Scanners (which usually output JPEG):
                    // We assume DCTDecode (JPEG) or simple streams. 
                    // If it is complex, this simple extractor might fail to decode correctly without sharp/jimp.
                    // BUT, since pdfjs-dist is failing mostly on worker loading, this is a valid "Hail Mary".
                    // Let's rely on the fact that scanner PDFs are usually just JPEGs wrapped.

                    extractedImages.push({
                        pageNumber: i + 1,
                        image: Buffer.from(data)
                    });

                    // One image per page is typical for scans - prevent loading too many icons
                    if (extractedImages.filter(e => e.pageNumber === i + 1).length > 2) break;
                }
            }
        }
    }

    return extractedImages;
}

export async function extractDonationData(imageBuffer: Buffer, pageNumber: number, batchType: string = 'Check'): Promise<any> {
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    const contextInstructions = {
        'Check': 'Focus on extracting Check Number, Amount, and Donor Name. Look for "Memo" or handwritten notes on the check/slip.',
        'Cash': 'Focus on Cash/Coin amounts written on the slip. Amount might be handwritten.',
        'Credit': 'Focus on Credit Card info (Last 4) and total amount authorized.',
        'Zero': 'Focus on finding the Donor Name. CRITICAL: Look for keywords indicating removal like "Remove me", "Deceased", "Stop mail", "Kill list". If found, set isKillList=true.'
    }[batchType] || '';

    const prompt = `
    Analyze this image of a donation document (Check, Reply Slip, or Correspondence) for a "${batchType}" batch.
    ${contextInstructions}

    Extract the following fields in JSON format:
    - donorName (string, best guess)
    - amount (number, 0.00 if none)
    - checkNumber (string, if visible)
    - last4 (string, if CC)
    - routingNumber (string, 9 digits)
    - accountNumber (string)
    - address (string, full address if visible)
    - email (string)
    - campaign (string, e.g. "24GEN")
    - notes (string, Capture ANY handwritten notes, prayer requests, or comments exactly as written)
    - isKillList (boolean, true ONLY if user explicitly asks to be removed/stop mail)
    - confidence (number, 0-1 score of how readable this is)
    
    If the image is blank or irrelevant, return { "isIrrelevant": true }.
    Output ONLY JSON.
    `;

    try {
        const response = await getOpenAI().chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                "url": dataUrl,
                            },
                        },
                    ],
                },
            ],
            response_format: { type: "json_object" },
        });

        const content = response.choices[0].message.content;
        if (!content) return null;
        return { ...JSON.parse(content), pageNumber };
    } catch (e) {
        console.error("OpenAI Error:", e);
        return null;
    }
}
