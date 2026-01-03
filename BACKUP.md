# Disaster Recovery & Backup Guide

## 1. Codebase Safety
Your code is **Safe**.
- **Location**: GitHub (Remote Repository)
- **URL**: `https://github.com/tarnowskisean-beep/cage-database`
- **History**: Every change we make is "committed" and "pushed". You can verify this by visiting the URL above. If your computer crashes, you can simply download the code again on a new machine.

## 2. Data Safety (The Database)
Your database contains the critical client info and logs. Since it is hosted on Vercel/Neon, they provide *some* automated backups, but for **SOC 2** and peace of mind, you should maintain your own backups.

### How to Backup Locally
I have created a script to help you download a snapshot of your data.

**Prerequisites:**
- You need `pg_dump` installed. On Mac: `brew install libpq`.

**Running a Backup:**
1. Open Terminal.
2. Run: `./scripts/backup_db.sh`
3. If it asks for a URL, provide your `POSTGRES_URL` (found in Vercel Dashboard > Storage > .env).

This will create a `.sql` file in the `backups/` folder. You can save this file to Google Drive, Dropbox, or an external hard drive.

### Recommended Schedule
- **Weekly**: Run the backup script manually.
- **Before Major Changes**: Run it before doing a large Import or Revert.

## 3. Restoration (Disaster Recovery)
If you fundamentally break the database or lose data:
1. Locate your latest `db_backup_YYYY-MM-DD.sql` file.
2. Use a database tool (like TablePlus or `psql`) to run that SQL file against a *fresh* database.
3. This will restore all tables and data to that exact moment in time.
