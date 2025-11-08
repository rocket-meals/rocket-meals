#!/bin/sh
set -eu

DEFAULT_PROJECT_DIR="/workspace/rocket-meals"
DEFAULT_COMPOSE_FILE="docker-compose.yaml"
DEFAULT_ENV_FILE=".env"

trim() {
  local var="$1"
  var="${var#${var%%[![:space:]]*}}"
  var="${var%${var##*[![:space:]]}}"
  printf '%s\n' "${var}"
}

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

LOCAL_PROJECT_DIR="$(resolve_project_dir "${MAIN_COMPOSE_PROJECT_DIR:-}")"

resolve_host_project_dir() {
  local raw="$1"

  if [ -z "${raw}" ] || [ "${raw}" = "." ]; then
    printf '%s\n' "${LOCAL_PROJECT_DIR}"
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
      if [ -d "${LOCAL_PROJECT_DIR}/${raw}" ]; then
        (cd "${LOCAL_PROJECT_DIR}/${raw}" && pwd)
        return 0
      fi
      ;;
  esac

  echo "MAIN_COMPOSE_HOST_PROJECT_DIR '${raw}' does not exist" >&2
  exit 1
}

HOST_PROJECT_DIR="$(resolve_host_project_dir "${MAIN_COMPOSE_HOST_PROJECT_DIR:-}")"

PROJECT_DIR="${HOST_PROJECT_DIR}"

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

COMPOSE_ENV_ARGS=""

append_env_arg() {
  local path="$1"

  if [ -z "${COMPOSE_ENV_ARGS}" ]; then
    COMPOSE_ENV_ARGS="--env-file ${path}"
  else
    COMPOSE_ENV_ARGS="${COMPOSE_ENV_ARGS} --env-file ${path}"
  fi
}

resolve_env_file_path() {
  local raw="$1"

  case "${raw}" in
    /*)
      if [ -f "${raw}" ]; then
        printf '%s\n' "${raw}"
        return 0
      fi
      ;;
    *)
      if [ -f "${PROJECT_DIR}/${raw}" ]; then
        printf '%s\n' "${PROJECT_DIR}/${raw}"
        return 0
      fi
      ;;
  esac

  echo "Env file '${raw}' could not be found (relative to project dir: ${PROJECT_DIR})" >&2
  exit 1
}

if [ "${MAIN_COMPOSE_ENV_FILE:-}" != "" ]; then
  OLD_IFS="${IFS}"
  IFS=','
  for raw_env in ${MAIN_COMPOSE_ENV_FILE}; do
    IFS="${OLD_IFS}"
    trimmed_env="$(trim "${raw_env}")"
    if [ -z "${trimmed_env}" ]; then
      IFS=','
      continue
    fi
    resolved_env_path="$(resolve_env_file_path "${trimmed_env}")"
    append_env_arg "${resolved_env_path}"
    IFS=','
  done
  IFS="${OLD_IFS}"
else
  if [ -f "${PROJECT_DIR}/${DEFAULT_ENV_FILE}" ]; then
    append_env_arg "${PROJECT_DIR}/${DEFAULT_ENV_FILE}"
  fi
fi

echo "[cron] Restarting docker compose project in ${PROJECT_DIR} using ${COMPOSE_FILE}" >&2

cd "${PROJECT_DIR}"

docker compose -f "${COMPOSE_FILE}" ${COMPOSE_ENV_ARGS} ${COMPOSE_PROJECT_NAME_ARG} down --remove-orphans

docker compose -f "${COMPOSE_FILE}" ${COMPOSE_ENV_ARGS} ${COMPOSE_PROJECT_NAME_ARG} up -d --remove-orphans
