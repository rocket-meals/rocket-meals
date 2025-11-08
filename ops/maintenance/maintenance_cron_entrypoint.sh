#!/bin/sh
set -eu

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
  0)
    echo "CRON_SCHEDULE_MINUTES must be greater than 0" >&2
    exit 1
    ;;
esac

case "${DAYS}" in
  ''|*[!0-9]*)
    echo "Invalid CRON_SCHEDULE_DAYS '${DAYS}'" >&2
    exit 1
    ;;
esac

if [ "${DAYS}" -gt 0 ]; then
  HOURS=$((${MINUTES} / 60))
  MINUTE_OF_HOUR=$((${MINUTES} % 60))

  if [ "${HOURS}" -ge 24 ]; then
    echo "CRON_SCHEDULE_MINUTES must be less than 1440 when CRON_SCHEDULE_DAYS is greater than 0" >&2
    exit 1
  fi

  CRON_SCHEDULE="${MINUTE_OF_HOUR} ${HOURS} */${DAYS} * *"
else
  CRON_SCHEDULE="*/${MINUTES} * * * *"
fi

echo "Using cron schedule '${CRON_SCHEDULE}'" >&2

echo "${CRON_SCHEDULE} /usr/local/bin/restart_main_compose.sh" > /etc/crontabs/root
exec crond -f -L /var/log/cron.log
