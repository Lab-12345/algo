#!/bin/bash
# MongoDB automated backup script with 7-day retention
set -e

BACKUP_DIR="./backups/mongodb_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

source .env 2>/dev/null || true
MONGO_URI=${MONGODB_URI:-"mongodb://localhost:27017/tradepilot"}

echo "Backing up MongoDB database to $BACKUP_DIR..."
mongodump --uri="$MONGO_URI" --out="$BACKUP_DIR" --gzip

echo "Backup completed successfully."

# Retain only last 7 days of backups
find ./backups -type d -name "mongodb_*" -mtime +7 -exec rm -rf {} +
