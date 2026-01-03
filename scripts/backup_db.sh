#!/bin/bash

# Simple Database Backup Script for Compass Usage
# Usage: ./scripts/backup_db.sh [connection_string]

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_DIR="./backups"
FILENAME="db_backup_${TIMESTAMP}.sql"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Get Connection String
# 1. Try argument
DB_URL="$1"

# 2. Try .env.local if no argument
if [ -z "$DB_URL" ]; then
  if [ -f .env.local ]; then
    DB_URL=$(grep POSTGRES_URL_NON_POOLING .env.local | cut -d '=' -f2 | tr -d '"')
    if [ -z "$DB_URL" ]; then
        DB_URL=$(grep POSTGRES_URL .env.local | cut -d '=' -f2 | tr -d '"')
    fi
  fi
fi

if [ -z "$DB_URL" ]; then
  echo "Error: Could not find POSTGRES_URL in .env.local and no argument provided."
  echo "Usage: ./scripts/backup_db.sh \"postgres://user:pass@host:5432/db\""
  exit 1
fi

echo "Starting Backup..."
echo "Target: $BACKUP_DIR/$FILENAME"

# Run pg_dump
# Note: Requires pg_dump to be installed on your machine (brew install libpq)
pg_dump "$DB_URL" --format=plain --no-owner --no-acl > "$BACKUP_DIR/$FILENAME"

if [ $? -eq 0 ]; then
  echo "✅ Backup Successful!"
  echo "File size: $(du -h "$BACKUP_DIR/$FILENAME" | cut -f1)"
else
  echo "❌ Backup Failed. Please check your connection string and internet connection."
fi
