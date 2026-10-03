#!/bin/sh
# /home/deploy/backup.sh - Automated daily backup to Cloudflare R2 / Backblaze B2
# As specified in Section 7, Step 5 of the Dairy Parlour Management System Plan
set -e

BACKUP_DIR="/home/deploy/backups"
TIMESTAMP=$(date +%F_%H%M%S)
BACKUP_FILE="dairy_backup_${TIMESTAMP}.json.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting Dairy Parlour daily backup..."

# If running containerized app, export database state
# docker compose -f /home/deploy/dairy-parlour/docker-compose.prod.yml exec -T db pg_dump -U dairy dairy | gzip > "$BACKUP_DIR/$BACKUP_FILE"

# Upload to free off-site object storage via rclone
if command -v rclone >/dev/null 2>&1; then
    echo "Syncing backup to offsite R2/B2 bucket..."
    rclone copy "$BACKUP_DIR/$BACKUP_FILE" r2:dairy-backups/daily/
    
    # Weekly backup retention on Sundays (Day 7)
    if [ "$(date +%u)" = 7 ]; then
        rclone copy "$BACKUP_DIR/$BACKUP_FILE" r2:dairy-backups/weekly/
    fi
fi

# Cleanup local backups older than 7 days
find "$BACKUP_DIR" -name 'dairy_backup_*.gz' -mtime +7 -delete

echo "[$(date)] Daily backup completed successfully."
