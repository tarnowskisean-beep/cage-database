import OpenAI from 'openai';
import jpeg from 'jpeg-js';

// Lazy load OpenAI to prevent build-time errors when env var is missing
function getOpenAI() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        // Warning instead of error to allow build to pass if this path isn't hit
        console.warn("OPENAI_API_KEY is missing. AI features will fail at runtime.");
    }
    return new OpenAI({ apiKey: apiKey || 'dummy-key-for-build' });
}


/**
 * Extracts raw image data from a PDF buffer by parsing internal operators.
 * This avoids the need for Canvas/DOM dependencies.
 */
export async function extractImagesFromPdf(pdfBuffer: Buffer): Promise<{ pageNumber: number, image: Buffer }[]> {
    // Polyfill for DOMMatrix and DOMPoint which are needed by pdfjs-dist in Node < 22 or serverless
    if (typeof global.DOMMatrix === 'undefined') {
        // @ts-ignore
        global.DOMMatrix = class DOMMatrix {
            a: number; b: number; c: number; d: number; e: number; f: number;
            constructor(init?: any) {
                this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
                if (init && init.length === 6) { [this.a, this.b, this.c, this.d, this.e, this.f] = init; }
            }
            // Minimal stubs
            setMatrixValue(str: string) { return this; }
            translate(x: number, y: number) { return this; }
            scale(x: number, y: number) { return this; }
            toString() { return `matrix(${this.a}, ${this.b}, ${this.c}, ${this.d}, ${this.e}, ${this.f})`; }
        };
    }
    if (typeof global.DOMPoint === 'undefined') {
        // @ts-ignore
        global.DOMPoint = class DOMPoint {
            x: number; y: number; z: number; w: number;
            constructor(x = 0, y = 0, z = 0, w = 1) { this.x = x; this.y = y; this.z = z; this.w = w; }
            matrixTransform(matrix: any) { return new global.DOMPoint(this.x, this.y, this.z, this.w); }
        };
    }

    // Dynamic import to prevent top-level crashes in Serverless/Edge
    // @ts-ignore
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

    // Standard Node.js worker setup for pdfjs-dist
    // We do NOT want to set workerSrc for Vercel/Serverless as it causes path resolution errors.
    // PDF.js will fall back to "fake worker" (main thread) which is fine for backend tasks.
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        // Only set if strictly needed, but for Vercel often best to leave null to force main thread
        // pdfjs.GlobalWorkerOptions.workerSrc = '...';
    }

    // Load the PDF
    const data = new Uint8Array(pdfBuffer);
    const loadingTask = pdfjs.getDocument({ data, verbosity: 0 });
    const pdf = await loadingTask.promise;
    const extractedImages: { pageNumber: number, image: Buffer }[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const ops = await page.getOperatorList();

        for (let j = 0; j < ops.fnArray.length; j++) {
            const fn = ops.fnArray[j];
            const args = ops.argsArray[j];

            // pdfjs.OPS.paintImageXObject
            if (fn === pdfjs.OPS.paintImageXObject) {
                const imgName = args[0];
                try {
                    const img = await page.objs.get(imgName);

                    // Case 1: Raw JPEG Stream (Fastest, best quality)
                    // Unfortunately, pdf.js abstracts the stream access in the high-level 'get' call.
                    // To get the raw stream, we would need lower level access or check if 'img' has a 'raw' prop we can exploit.
                    // But standard pdf.js 'img' object from 'objs.get' is a decoded bitmap (Uint8ClampedArray).

                    if (img && img.data) {
                        // img.data is a Uint8ClampedArray (RGBA)
                        // Width: img.width, Height: img.height

                        // Check if it's RGBA or RGB
                        const width = img.width;
                        const height = img.height;
                        const srcData = img.data;

                        // jpeg-js expects: { width, height, data: Buffer (RGBA) }
                        let rawBuffer: Buffer;

                        // Heuristic: Check size
                        if (srcData.length === width * height * 3) {
                            // RGB -> RGBA
                            const newData = Buffer.alloc(width * height * 4);
                            for (let k = 0, l = 0; k < srcData.length; k += 3, l += 4) {
                                newData[l] = srcData[k];
                                newData[l + 1] = srcData[k + 1];
                                newData[l + 2] = srcData[k + 2];
                                newData[l + 3] = 0xFF; // Alpha
                            }
                            rawBuffer = newData;
                        } else {
                            // Assume RGBA
                            rawBuffer = Buffer.from(srcData);
                        }

                        // Encode to JPEG
                        const jpegData = jpeg.encode({ data: rawBuffer, width, height }, 80); // Quality 80

                        extractedImages.push({
                            pageNumber: i,
                            image: jpegData.data // Buffer
                        });

                        // Stop after finding the big image on the page (usually the scan)
                        // To avoid extracting tiny icons/logos.
                        if (width > 500 && height > 500) break;
                    }
                } catch (e) {
                    console.error('Image extraction failed for page', i, e);
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

// ... rest of AI logic
