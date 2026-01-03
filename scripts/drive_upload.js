
/**
 * scripts/drive_upload.js
 * Uploads a file to Google Drive using a Service Account.
 * 
 * Usage: node drive_upload.js <path_to_file> <dest_filename>
 * Env Vars required:
 * - GDRIVE_CREDENTIALS (JSON string of service account key)
 * - GDRIVE_FOLDER_ID (ID of the folder to upload to)
 */

const fs = require('fs');
const { google } = require('googleapis');

async function uploadFile() {
    const filePath = process.argv[2];
    const fileName = process.argv[3];

    if (!filePath || !fileName) {
        console.error('Usage: node drive_upload.js <path_to_file> <dest_filename>');
        process.exit(1);
    }

    if (!process.env.GDRIVE_CREDENTIALS || !process.env.GDRIVE_FOLDER_ID) {
        console.error('Error: GDRIVE_CREDENTIALS and GDRIVE_FOLDER_ID env vars are required.');
        process.exit(1);
    }

    try {
        // Parse Credentials
        const credentials = JSON.parse(process.env.GDRIVE_CREDENTIALS);

        // Auth
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        });

        const drive = google.drive({ version: 'v3', auth });

        // Upload
        console.log(`Uploading ${fileName} to Drive Folder ${process.env.GDRIVE_FOLDER_ID}...`);

        const fileMetadata = {
            name: fileName,
            parents: [process.env.GDRIVE_FOLDER_ID],
        };

        const media = {
            mimeType: 'application/octet-stream',
            body: fs.createReadStream(filePath),
        };

        const res = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id',
        });

        console.log('✅ Upload Successful! File ID:', res.data.id);

    } catch (error) {
        console.error('❌ Upload Failed:', error.message);
        process.exit(1);
    }
}

uploadFile();
