
# Google Drive Backup Setup Guide

To enable automated daily backups to your Google Drive, follow these one-time setup steps.

## Step 1: Create Google Credentials
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a **New Project** (e.g., "Compass Backups").
3. Search for **"Google Drive API"** and **Enable** it.
4. Go to **Credentials** > **Create Credentials** > **Service Account**.
   - Name: "Backup Bot"
   - Role: "Editor" (or at least storage access)
   - Click **Done**.
5. Click on the newly created Service Account (email address).
6. Go to the **Keys** tab > **Add Key** > **Create new key** > **JSON**.
7. This will download a JSON file. **Open this file and copy its entire content.**

## Step 2: Create a Backup Folder
1. Go to your Google Drive.
2. Create a new folder named `Compass Backups` (or whatever you prefer).
3. **Share** this folder with the "Service Account Email" (found in the JSON file, usually `...@...iam.gserviceaccount.com`).
   - Give it **Editor** access.
4. Open the folder. Look at the URL bar:
   - `drive.google.com/drive/u/0/folders/1A2B3C4D5E...`
   - The code at the end (`1A2B3C4D5E...`) is your **Folder ID**. Copy it.

## Step 3: Add Secrets to GitHub
1. Go to your GitHub Repository: `https://github.com/tarnowskisean-beep/cage-database`
2. Go to **Settings** > **Secrets and variables** > **Actions** > **New repository secret**.
3. Add the following 3 secrets:

| Name | Value |
|------|-------|
| `GDRIVE_CREDENTIALS` | Paste the *entire content* of the JSON key file you downloaded. |
| `GDRIVE_FOLDER_ID` | Paste the Folder ID (e.g. `1A2B3C...`). |
| `POSTGRES_URL` | Your Database Connection String (from Vercel). |

---

## Testing
Once added, you can test it immediately:
1. Go to the **Actions** tab in GitHub.
2. Click **Daily Database Backup** on the left.
3. Click **Run workflow**.

If successful, check your Google Drive folder. You should see a file named `backup_YYYY-MM-DD.sql`.
