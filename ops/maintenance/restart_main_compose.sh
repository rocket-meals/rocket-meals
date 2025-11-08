#!/bin/sh
set -eu

if [ "${MAIN_COMPOSE_FILE:-}" = "" ]; then
  echo "MAIN_COMPOSE_FILE environment variable must be set" >&2
  exit 1
fi

COMPOSE_PROJECT_NAME_ARG=""
if [ "${MAIN_COMPOSE_PROJECT_NAME:-}" != "" ]; then
  COMPOSE_PROJECT_NAME_ARG="-p ${MAIN_COMPOSE_PROJECT_NAME}"
fi

echo "[cron] Restarting docker compose project defined in ${MAIN_COMPOSE_FILE}" >&2

docker compose -f "${MAIN_COMPOSE_FILE}" ${COMPOSE_PROJECT_NAME_ARG} down --remove-orphans

docker compose -f "${MAIN_COMPOSE_FILE}" ${COMPOSE_PROJECT_NAME_ARG} up -d --remove-orphans
