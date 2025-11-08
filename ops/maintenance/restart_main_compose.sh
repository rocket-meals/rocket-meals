#!/bin/sh
set -eu

DEFAULT_PROJECT_DIR="/workspace/rocket-meals"
DEFAULT_COMPOSE_FILE="docker-compose.yaml"

resolve_project_dir() {
  local raw="$1"

  if [ -z "${raw}" ] || [ "${raw}" = "." ]; then
    printf '%s\n' "${DEFAULT_PROJECT_DIR}"
    return 0
  fi

  case "${raw}" in
    /*)
      if [ -d "${raw}" ]; then
        (cd "${raw}" && pwd)
        return 0
      fi
      ;;
    *)
      if [ -d "${DEFAULT_PROJECT_DIR}/${raw}" ]; then
        (cd "${DEFAULT_PROJECT_DIR}/${raw}" && pwd)
        return 0
      fi
      ;;
  esac

  echo "MAIN_COMPOSE_PROJECT_DIR '${raw}' does not exist" >&2
  exit 1
}

PROJECT_DIR="$(resolve_project_dir "${MAIN_COMPOSE_PROJECT_DIR:-}")"

COMPOSE_FILE_INPUT="${MAIN_COMPOSE_FILE:-${DEFAULT_COMPOSE_FILE}}"

case "${COMPOSE_FILE_INPUT}" in
  /*)
    COMPOSE_FILE="${COMPOSE_FILE_INPUT}"
    ;;
  *)
    COMPOSE_FILE="${PROJECT_DIR}/${COMPOSE_FILE_INPUT}"
    ;;
esac

if [ ! -f "${COMPOSE_FILE}" ]; then
  echo "Compose file '${COMPOSE_FILE}' does not exist" >&2
  exit 1
fi

COMPOSE_PROJECT_NAME_ARG=""
if [ "${MAIN_COMPOSE_PROJECT_NAME:-}" != "" ]; then
  COMPOSE_PROJECT_NAME_ARG="-p ${MAIN_COMPOSE_PROJECT_NAME}"
fi

echo "[cron] Restarting docker compose project in ${PROJECT_DIR} using ${COMPOSE_FILE}" >&2

cd "${PROJECT_DIR}"

docker compose -f "${COMPOSE_FILE}" ${COMPOSE_PROJECT_NAME_ARG} down --remove-orphans

docker compose -f "${COMPOSE_FILE}" ${COMPOSE_PROJECT_NAME_ARG} up -d --remove-orphans
