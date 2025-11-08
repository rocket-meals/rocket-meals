#!/bin/sh
set -eu

DEFAULT_PROJECT_DIR="/workspace/rocket-meals"
DEFAULT_COMPOSE_FILE="docker-compose.yaml"

PROJECT_DIR="${MAIN_COMPOSE_PROJECT_DIR:-}"
COMPOSE_FILE="${MAIN_COMPOSE_FILE:-}"

if [ -z "${PROJECT_DIR}" ]; then
  if [ -n "${COMPOSE_FILE}" ]; then
    case "${COMPOSE_FILE}" in
      /*)
        PROJECT_DIR="$(dirname "${COMPOSE_FILE}")"
        COMPOSE_FILE="$(basename "${COMPOSE_FILE}")"
        ;;
      */*)
        PROJECT_DIR="$(dirname "${COMPOSE_FILE}")"
        COMPOSE_FILE="$(basename "${COMPOSE_FILE}")"
        ;;
      *)
        PROJECT_DIR="${DEFAULT_PROJECT_DIR}"
        ;;
    esac
  else
    PROJECT_DIR="${DEFAULT_PROJECT_DIR}"
  fi
fi

if [ -z "${COMPOSE_FILE}" ]; then
  COMPOSE_FILE="${DEFAULT_COMPOSE_FILE}"
fi

if [ ! -d "${PROJECT_DIR}" ]; then
  echo "MAIN_COMPOSE_PROJECT_DIR '${PROJECT_DIR}' does not exist" >&2
  exit 1
fi

cd "${PROJECT_DIR}"

COMPOSE_PROJECT_NAME_ARG=""
if [ "${MAIN_COMPOSE_PROJECT_NAME:-}" != "" ]; then
  COMPOSE_PROJECT_NAME_ARG="-p ${MAIN_COMPOSE_PROJECT_NAME}"
fi

echo "[cron] Restarting docker compose project in ${PROJECT_DIR} using ${COMPOSE_FILE}" >&2

docker compose -f "${COMPOSE_FILE}" ${COMPOSE_PROJECT_NAME_ARG} down --remove-orphans

docker compose -f "${COMPOSE_FILE}" ${COMPOSE_PROJECT_NAME_ARG} up -d --remove-orphans
