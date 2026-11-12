#!/bin/bash
# Runs backup.sh once a day at OFFSITE_BACKUP_TIME (HH:MM, local time from TZ).
# Commands: "daily" (default, loop forever) or "once" (single run, for testing).

set -e

COMMAND=${1:-daily}
OFFSITE_BACKUP_TIME=${OFFSITE_BACKUP_TIME:-03:30}
SERVICE_ACCOUNT_FILE=${SERVICE_ACCOUNT_FILE:-/state/service-account.json}

is_configured() {
    if [[ -z "$OFFSITE_BACKUP_SHARED_DRIVE_ID" ]]; then
        echo "Offsite backup disabled: OFFSITE_BACKUP_SHARED_DRIVE_ID is not set."
        return 1
    fi
    if [[ -z "$OFFSITE_BACKUP_NAME" ]]; then
        echo "Offsite backup disabled: OFFSITE_BACKUP_NAME is not set."
        return 1
    fi
    if [[ ! -s "$SERVICE_ACCOUNT_FILE" ]]; then
        echo "Offsite backup disabled: service account key $SERVICE_ACCOUNT_FILE not found."
        return 1
    fi
    return 0
}

seconds_until_next_run() {
    local now target
    now=$(date +%s)
    target=$(date -d "today $OFFSITE_BACKUP_TIME" +%s)
    if (( target <= now )); then
        target=$(date -d "tomorrow $OFFSITE_BACKUP_TIME" +%s)
    fi
    echo $(( target - now ))
}

if ! is_configured; then
    # Stay idle instead of exiting, so a restart policy does not loop. See apps/backend/OFFSITE_BACKUP.md.
    exec sleep infinity
fi

if [[ "$COMMAND" == "once" ]]; then
    exec /backup.sh
elif [[ "$COMMAND" == "daily" ]]; then
    echo "Offsite backup for '$OFFSITE_BACKUP_NAME' runs daily at $OFFSITE_BACKUP_TIME ($TZ)."
    while true; do
        wait_seconds=$(seconds_until_next_run)
        echo "Next run in $wait_seconds seconds."
        sleep "$wait_seconds"
        /backup.sh || echo "Offsite backup failed: $(date). Will retry at the next scheduled time."
    done
else
    echo "Unknown command $COMMAND"
    echo "Available commands: daily, once"
    exit 1
fi
