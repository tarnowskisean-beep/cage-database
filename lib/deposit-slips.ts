
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function generateDepositSlip(batch: any, donations: any[]) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const fontSize = 10;
    const headerSize = 18;

    // --- HEADER ---
    page.drawText('DEPOSIT SLIP', {
        x: 50,
        y: height - 50,
        size: headerSize,
        font: fontBold,
        color: rgb(0, 0, 0),
    });

    page.drawText(`Date: ${new Date().toLocaleDateString()}`, {
        x: width - 150,
        y: height - 50,
        size: fontSize,
        font: font,
    });

    // Client / Account Info
    let y = height - 80;
    page.drawText(`Client: ${batch.ClientCode || 'Unknown Client'}`, { x: 50, y, size: fontSize, font: fontBold });
    y -= 15;
    page.drawText(`Account: ${batch.AccountName || 'Main Operating Account'}`, { x: 50, y, size: fontSize, font: font });
    y -= 15;
    page.drawText(`Batch: ${batch.BatchCode || batch.BatchID}`, { x: 50, y, size: fontSize, font: font });

    // --- TABLE HEADER ---
    y -= 40;
    const col1 = 50;  // Seq
    const col2 = 100; // Check Number
    const col3 = 250; // Name
    const col4 = 500; // Amount (Right aligned-ish)

    page.drawText('#', { x: col1, y, size: fontSize, font: fontBold });
    page.drawText('Check Number', { x: col2, y, size: fontSize, font: fontBold });
    page.drawText('Donor Name', { x: col3, y, size: fontSize, font: fontBold });
    page.drawText('Amount', { x: col4, y, size: fontSize, font: fontBold });

    y -= 10;
    page.drawLine({
        start: { x: 50, y },
        end: { x: width - 50, y },
        thickness: 1,
        color: rgb(0, 0, 0),
    });

    // --- TABLE ROWS ---
    y -= 20;
    let totalAmount = 0;
    let count = 0;

    for (const d of donations) {
        // Validation: Only Checks?
        // if (d.GiftMethod !== 'Check') continue; 

        if (y < 50) {
            page = pdfDoc.addPage([612, 792]);
            y = height - 50;
        }

        const amount = Number(d.GiftAmount) || 0;
        totalAmount += amount;
        count++;

        const donorName = d.OrganizationName || `${d.DonorFirstName || ''} ${d.DonorLastName || ''}`.trim();

        page.drawText(count.toString(), { x: col1, y, size: fontSize, font });
        page.drawText(d.CheckNumber || d.SecondaryID || '-', { x: col2, y, size: fontSize, font });
        page.drawText(donorName.substring(0, 30), { x: col3, y, size: fontSize, font });
        page.drawText(`$${amount.toFixed(2)}`, { x: col4, y, size: fontSize, font });

        y -= 15;
    }

    // --- TOTALS ---
    y -= 10;
    page.drawLine({
        start: { x: 50, y },
        end: { x: width - 50, y },
        thickness: 1,
        color: rgb(0, 0, 0),
    });
    y -= 20;

    page.drawText(`Total Items: ${count}`, { x: 50, y, size: fontSize, font: fontBold });
    page.drawText(`Total Deposit: $${totalAmount.toFixed(2)}`, { x: col4, y, size: fontSize, font: fontBold });

    // Serialize
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}
