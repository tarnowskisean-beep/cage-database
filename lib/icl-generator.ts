
import sharp from 'sharp';
import { query } from '@/lib/db';

/**
 * EBCDIC Encoding Map (Partial/Basic for ASCII alphanumeric)
 * Full CP037 map often needed, but we can start with basic subset for banking headers.
 */
function toEbcdic(str: string, length: number): Buffer {
    // Basic lookup for A-Z, 0-9, space. 
    // In a real app, use a library like 'iconv-lite' if possible, or a full table.
    // For now, we stub with a placeholder that should be replaced with a real encoder or proper map.
    // NOTE: 'iconv-lite' supports 'ibm037'. Attempting to use if installed? 
    // Check package.json. If not, we map manually.

    const buffer = Buffer.alloc(length, 0x40); // 0x40 is EBCDIC Space
    // IMPLEMENT EBCDIC MAPPING LOGIC HERE or use iconv-lite
    // For this prototype, we will just use ASCII and NOTE that the bank might reject it 
    // unless they accept ASCII X9.100-187. 
    // STRICT X9.37 requires EBCDIC. 

    // Manual Map (Tiny Subset)
    const ascii = str.toUpperCase();
    for (let i = 0; i < Math.min(ascii.length, length); i++) {
        const charCode = ascii.charCodeAt(i);
        let ebcdic = 0x40; // Default space
        if (charCode >= 48 && charCode <= 57) ebcdic = 0xF0 + (charCode - 48); // 0-9
        else if (charCode >= 65 && charCode <= 73) ebcdic = 0xC1 + (charCode - 65); // A-I
        else if (charCode >= 74 && charCode <= 82) ebcdic = 0xD1 + (charCode - 74); // J-R
        else if (charCode >= 83 && charCode <= 90) ebcdic = 0xE2 + (charCode - 83); // S-Z
        else if (charCode === 32) ebcdic = 0x40; // Space

        buffer[i] = ebcdic;
    }
    return buffer;
}

async function convertToTiffG4(imageBuffer: Buffer): Promise<Buffer> {
    // 1. Resize/Normalize (Check standard size? 1728px width?)
    // 2. Grayscale -> Threshold (1-bit) -> TIFF G4
    // Standard check width approx 1700-1800 pixels at 200dpi (~8.5 inches)

    return sharp(imageBuffer)
        .resize({ width: 1728, fit: 'inside' }) // Standard FAX width often good for checks
        .grayscale()
        .threshold(128) // Binarize
        .tiff({
            compression: 'ccittfax4',
            xres: 200,
            yres: 200,
            bitdepth: 1
        })
        .toBuffer();
}

async function generateBackImage(endorsement: string): Promise<Buffer> {
    // Create white canvas with text
    const width = 1728;
    const height = 800; // Approx 4 inches at 200dpi

    const svg = `
    <svg width="${width}" height="${height}">
        <style>
            .text { font-family: sans-serif; font-size: 40px; font-weight: bold; }
        </style>
        <rect width="100%" height="100%" fill="white" />
        <text x="50" y="100" class="text">FOR DEPOSIT ONLY</text>
        <text x="50" y="160" class="text">${endorsement}</text>
    </svg>
    `;

    return sharp(Buffer.from(svg))
        .tiff({
            compression: 'ccittfax4',
            xres: 200,
            yres: 200,
            bitdepth: 1
        })
        .toBuffer();
}

/**
 * Generates the ICL (X9.37) binary file.
 */
export async function generateICL(batchId: string): Promise<Buffer> {
    // 1. Fetch Batch
    const batchRes = await query('SELECT * FROM "Batches" WHERE "BatchID" = $1', [batchId]);
    const batch = batchRes.rows[0];

    // 2. Fetch Donations (Checks)
    const donationsRes = await query(`
        SELECT d.*, 
            doc_front."FileContent" as "FrontImage",
            doc_front."FileName" as "FrontFileName"
        FROM "Donations" d
        LEFT JOIN "DonationImages" di_front ON d."DonationID" = di_front."DonationID" AND di_front."Type" = 'CheckFront'
        LEFT JOIN "BatchDocuments" doc_front ON di_front."BatchDocumentID" = doc_front."BatchDocumentID"
        WHERE d."BatchID" = $1 
        AND d."GiftMethod" IN ('Check', 'Cash')
        ORDER BY d."DonationID" ASC
    `, [batchId]);

    const donations = donationsRes.rows;
    if (donations.length === 0) throw new Error("No checks found");

    // 3. Begin Writing Records
    const chunks: Buffer[] = [];

    // Helper to write record to chunk list
    const writeRecord = (type: number, data: Buffer) => {
        // Record format: 4 byte length (Big Endian) + Record Data
        const lengthHeader = Buffer.alloc(4);
        lengthHeader.writeUInt32BE(data.length, 0); // Length *of record data* only? X9.37 spec usually includes or excludes header? 
        // Spec: "The 4-byte length field contains the number of bytes in the record, NOT including the length field itself."
        chunks.push(lengthHeader);
        chunks.push(data);
    };

    // -- FILE HEADER (01) --
    const r01 = Buffer.alloc(80, 0x40); // 80 bytes fixed
    r01.writeUInt8(0x01, 0); // Type 01
    // Standard Level (03)
    r01.writeUInt8(0xF0 + 3, 1);
    // Test Indicator (T for Test, P for Production) - Default to Test (EBCDIC 'T' = 0xE3)
    r01[2] = 0xE3;
    // Immediate Destination (Routing Number) - EBCDIC
    r01.set(toEbcdic("123456789", 9), 3); // Needs Config
    // Immediate Origin (Routing Number)
    r01.set(toEbcdic("000000000", 9), 12); // Needs Config
    // Creation Date (YYYYMMDD) - EBCDIC
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // 20231027
    const timeStr = now.toISOString().slice(11, 16).replace(/:/g, ''); // 1430
    r01.set(toEbcdic(dateStr, 8), 21);
    r01.set(toEbcdic(timeStr, 4), 29);
    // ... Resv ...
    writeRecord(1, r01);

    // -- CASH LETTER HEADER (10) --
    const r10 = Buffer.alloc(80, 0x40);
    r10.writeUInt8(0x10, 0);
    r10.set(toEbcdic("01", 2), 1); // Collection Type (01 = Forward Presentment)
    r10.set(toEbcdic("123456789", 9), 3); // Destination Routing
    r10.set(toEbcdic("000000000", 9), 12); // ECE Inst Routing
    r10.set(toEbcdic(dateStr, 8), 21);
    r10.set(toEbcdic("1001", 8), 29); // Cash Letter ID
    writeRecord(10, r10);

    // -- BUNDLE HEADER (20) --
    const r20 = Buffer.alloc(80, 0x40);
    r20.writeUInt8(0x20, 0);
    r20.set(toEbcdic("01", 2), 1); // Collection Type
    r20.set(toEbcdic("123456789", 9), 3); // Dest Routing
    r20.set(toEbcdic("000000000", 9), 12); // ECE Routing
    r20.set(toEbcdic(dateStr, 8), 21);
    r20.set(toEbcdic("0001", 10), 29); // Bundle ID
    r20.set(toEbcdic("1", 4), 39); // Sequence Number
    writeRecord(20, r20);

    let bundleTotalAmount = 0;
    let itemCount = 0;
    let imageCount = 0;

    for (const d of donations) {
        if (!d.FrontImage) {
            console.warn(`Skipping Donation ${d.DonationID}: No Front Image`);
            continue;
        }
        itemCount++;

        // -- CHECK DETAIL (25) --
        const r25 = Buffer.alloc(80, 0x40);
        r25.writeUInt8(0x25, 0);
        const auxOnUs = d.AuxOnUs || '';
        const epc = d.EPC || '';
        const routing = d.RoutingNumber || '000000000';
        const account = d.AccountNumber || '000';
        const checkNum = d.CheckNumber || '0000';
        const amountCents = Math.round(Number(d.GiftAmount) * 100);
        bundleTotalAmount += amountCents;

        r25.set(toEbcdic(auxOnUs, 15), 1);
        r25.set(toEbcdic(epc, 1), 16);
        r25.set(toEbcdic(routing, 9), 17);
        r25.set(toEbcdic(account, 20), 26);
        r25.set(toEbcdic(amountCents.toString().padStart(10, '0'), 10), 46); // Amount
        r25.set(toEbcdic(checkNum, 15), 56);
        // ...
        writeRecord(25, r25);

        // -- IMAGES --
        const frontTiff = await convertToTiffG4(d.FrontImage);
        const backTiff = await generateBackImage(`${batch.ClientCode || 'CLIENT'} - For Deposit Only`);
        imageCount += 2;

        // Front Detail (50)
        const r50Front = Buffer.alloc(80, 0x40);
        r50Front.writeUInt8(0x50, 0);
        r50Front.set(toEbcdic("1", 2), 1); // Image Indicator (1=Front? need spec) usually use 0 but let's say 1
        r50Front.set(toEbcdic(routing, 9), 3);
        r50Front.set(toEbcdic(dateStr, 8), 12);
        // Length of Image Data (ASCII numeric string? Spec varies. Usually string in EBCDIC)
        r50Front.set(toEbcdic(frontTiff.length.toString().padStart(7, '0'), 7), 53); // Length
        writeRecord(50, r50Front);

        // Front Data (52)

        // Simple 52 Implementation (Header + Body)
        const r52FrontHeader = Buffer.alloc(80, 0x40);
        r52FrontHeader.writeUInt8(0x52, 0);
        r52FrontHeader.set(toEbcdic(routing, 9), 1);
        r52FrontHeader.set(toEbcdic(dateStr, 8), 10);
        // ...

        // Combine Header + Image
        const r52FrontFull = Buffer.concat([r52FrontHeader, frontTiff]);
        writeRecord(52, r52FrontFull);

        // Back Detail (50)
        const r50Back = Buffer.alloc(80, 0x40);
        r50Back.writeUInt8(0x50, 0);
        r50Back.set(toEbcdic("2", 2), 1); // Image Indicator (2=Back) (Assumption)
        // ...
        writeRecord(50, r50Back);

        // Back Data (52)
        const r52BackHeader = Buffer.alloc(80, 0x40);
        r52BackHeader.writeUInt8(0x52, 0);
        r52BackHeader.set(toEbcdic(routing, 9), 1);
        r52BackHeader.set(toEbcdic(dateStr, 8), 10);
        const r52BackFull = Buffer.concat([r52BackHeader, backTiff]);
        writeRecord(52, r52BackFull);
    }

    // -- BUNDLE CONTROL (70) --
    const r70 = Buffer.alloc(80, 0x40);
    r70.writeUInt8(0x70, 0);
    r70.set(toEbcdic(itemCount.toString().padStart(4, '0'), 4), 1); // Item Count
    r70.set(toEbcdic(bundleTotalAmount.toString().padStart(12, '0'), 12), 5); // Amount
    r70.set(toEbcdic(imageCount.toString().padStart(6, '0'), 6), 25); // Image Count
    writeRecord(70, r70);

    // -- CASH LETTER CONTROL (90) --
    const r90 = Buffer.alloc(80, 0x40);
    r90.writeUInt8(0x90, 0);
    r90.set(toEbcdic("1", 6), 1); // Bundle Count
    r90.set(toEbcdic(itemCount.toString().padStart(8, '0'), 8), 7); // Item Count
    r90.set(toEbcdic(bundleTotalAmount.toString().padStart(14, '0'), 14), 15); // Amount
    r90.set(toEbcdic(imageCount.toString().padStart(9, '0'), 9), 31); // Image Count
    writeRecord(90, r90);

    // -- FILE CONTROL (99) --
    const r99 = Buffer.alloc(80, 0x40);
    r99.writeUInt8(0x99, 0);
    r99.set(toEbcdic("1", 6), 1); // Cash Letter Count
    r99.set(toEbcdic(itemCount.toString().padStart(8, '0'), 8), 7); // Total Item Count
    r99.set(toEbcdic(bundleTotalAmount.toString().padStart(14, '0'), 14), 15); // Total Amount
    writeRecord(99, r99);

    return Buffer.concat(chunks);
}
