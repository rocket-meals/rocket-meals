#!/bin/bash
# Uploads the newest database dump and all new images to the shared drive "Backup Eingang".
#
# Layout on the shared drive (OFFSITE_BACKUP_NAME is e.g. "swosy"):
#   <name>/db/<dump>.sql.gz
#   <name>/uploads/<file>
#   <name>/manifest.txt        list of all image files that currently exist on the server
#
# Only uploads, never deletes: "rclone copy" with --ignore-existing, never "sync" or "delete".

set -euo pipefail

DUMP_DIR=${DUMP_DIR:-/dump}
UPLOADS_DIR=${UPLOADS_DIR:-/uploads}
STATE_DIR=${STATE_DIR:-/state}
SERVICE_ACCOUNT_FILE=${SERVICE_ACCOUNT_FILE:-/state/service-account.json}
# A dump must be at least this old, so we never pick one that is still being written.
DUMP_MIN_AGE_MINUTES=${DUMP_MIN_AGE_MINUTES:-10}

export RCLONE_CONFIG_GDRIVE_TYPE=drive
export RCLONE_CONFIG_GDRIVE_SCOPE=drive
export RCLONE_CONFIG_GDRIVE_SERVICE_ACCOUNT_FILE="$SERVICE_ACCOUNT_FILE"
export RCLONE_CONFIG_GDRIVE_TEAM_DRIVE="$OFFSITE_BACKUP_SHARED_DRIVE_ID"

TARGET="gdrive:$OFFSITE_BACKUP_NAME"
RCLONE_FLAGS=(--ignore-existing --retries 5 --low-level-retries 20 --drive-chunk-size 64M --stats-one-line --stats 60s -v)

UPLOADED_IMAGES_FILE="$STATE_DIR/uploaded_images.txt"
LAST_DUMP_FILE="$STATE_DIR/last_uploaded_dump.txt"
WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "Offsite backup started: $(date)"

# 1. Newest finished database dump, once.
newest_dump=$(find "$DUMP_DIR" -maxdepth 1 -type f -name "*.sql.gz" -mmin "+$DUMP_MIN_AGE_MINUTES" -printf "%T@ %f\n" | sort -n | tail -1 | cut -d' ' -f2-)
if [[ -z "$newest_dump" ]]; then
    echo "No finished dump found in $DUMP_DIR."
elif [[ -f "$LAST_DUMP_FILE" && "$(cat "$LAST_DUMP_FILE")" == "$newest_dump" ]]; then
    echo "Dump $newest_dump was already uploaded."
else
    echo "Uploading dump $newest_dump"
    rclone copyto "$DUMP_DIR/$newest_dump" "$TARGET/db/$newest_dump" "${RCLONE_FLAGS[@]}"
    echo "$newest_dump" > "$LAST_DUMP_FILE"
fi

# 2. Images. Only originals: Directus stores generated thumbnails as "<id>__<hash>.<ext>",
#    those are recreated on demand and are left out.
find "$UPLOADS_DIR" -maxdepth 1 -type f ! -name "*__*" ! -name ".*" -printf "%f\n" | sort > "$WORK_DIR/current.txt"
touch "$UPLOADED_IMAGES_FILE"
sort -u "$UPLOADED_IMAGES_FILE" > "$WORK_DIR/uploaded.txt"
comm -23 "$WORK_DIR/current.txt" "$WORK_DIR/uploaded.txt" > "$WORK_DIR/new.txt"

new_count=$(wc -l < "$WORK_DIR/new.txt")
echo "Images on server: $(wc -l < "$WORK_DIR/current.txt"), new since last run: $new_count"
if (( new_count > 0 )); then
    rclone copy "$UPLOADS_DIR" "$TARGET/uploads" --files-from "$WORK_DIR/new.txt" --no-traverse --transfers 8 "${RCLONE_FLAGS[@]}"
    cat "$WORK_DIR/new.txt" >> "$UPLOADED_IMAGES_FILE"
fi

# 3. Manifest last, so the Apps Script only sees it once the images it lists are uploaded.
#    The first line marks the file, so an empty upload can not be mistaken for "no images".
{
    echo "# rocket-meals-offsite-manifest $(date -Iseconds)"
    cat "$WORK_DIR/current.txt"
} > "$WORK_DIR/manifest.txt"
rclone copyto "$WORK_DIR/manifest.txt" "$TARGET/manifest.txt" --retries 5 --low-level-retries 20 -v

date -Iseconds > "$STATE_DIR/last_success.txt"
echo "Offsite backup finished: $(date)"
