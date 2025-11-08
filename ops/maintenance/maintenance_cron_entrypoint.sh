#!/bin/sh
set -eu

log() {
  printf '[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$1" >&2
}

MINUTES="${CRON_SCHEDULE_MINUTES:-}"
DAYS="${CRON_SCHEDULE_DAYS:-}"

if [ -z "${MINUTES}" ]; then
  MINUTES="1"
fi

if [ -z "${DAYS}" ]; then
  DAYS="0"
fi

case "${MINUTES}" in
  ''|*[!0-9]*)
    echo "Invalid CRON_SCHEDULE_MINUTES '${MINUTES}'" >&2
    exit 1
    ;;
esac

case "${DAYS}" in
  ''|*[!0-9]*)
    echo "Invalid CRON_SCHEDULE_DAYS '${DAYS}'" >&2
    exit 1
    ;;
esac

MINUTES_NUM=$((MINUTES))
DAYS_NUM=$((DAYS))

if [ "${DAYS_NUM}" -eq 0 ] && [ "${MINUTES_NUM}" -le 0 ]; then
  echo "CRON_SCHEDULE_MINUTES must be greater than 0 when CRON_SCHEDULE_DAYS is 0" >&2
  exit 1
fi

if [ "${MINUTES_NUM}" -lt 0 ]; then
  echo "CRON_SCHEDULE_MINUTES must be zero or positive" >&2
  exit 1
fi

TOTAL_MINUTES=$((DAYS_NUM * 1440 + MINUTES_NUM))

if [ "${TOTAL_MINUTES}" -le 0 ]; then
  echo "The combined interval must be greater than 0 minutes" >&2
  exit 1
fi

SLEEP_SECONDS=$((TOTAL_MINUTES * 60))

log "Starting maintenance loop (interval: ${TOTAL_MINUTES} minute(s); days=${DAYS_NUM}, minutes=${MINUTES_NUM})"

terminate=false
trap 'terminate=true' INT TERM

while true; do
  log "Triggering main compose restart"
  if /usr/local/bin/restart_main_compose.sh; then
    log "Restart completed successfully"
  else
    status=$?
    log "Restart failed with exit code ${status}"
  fi

  if ${terminate}; then
    log "Termination requested, exiting"
    exit 0
  fi

  log "Sleeping for ${TOTAL_MINUTES} minute(s)"
  sleep "${SLEEP_SECONDS}" &
  sleep_pid=$!
  wait ${sleep_pid} || true

  if ${terminate}; then
    log "Termination requested, exiting"
    exit 0
  fi

done
