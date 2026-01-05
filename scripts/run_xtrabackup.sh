#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <env> [full|incr] [incremental-base-dir]" >&2
  exit 1
fi

ENV=$1                 # prod | dev
MODE=${2:-full}        # full | incr
BASE_DIR=${3:-}
STAMP=$(date +%F-%H%M)
TARGET="/backup/${MODE}-${STAMP}"

# locate running xtrabackup container without relying on docker-compose file
CONTAINER=$(docker ps --filter "name=xtrabackup-${ENV}" --format '{{.Names}}' | head -n 1)
if [[ -z "$CONTAINER" ]]; then
  echo "xtrabackup-${ENV} container is not running" >&2
  exit 1
fi

CMD="xtrabackup --backup \
      --host=\"\$DB_HOST\" --user=\"\$DB_BACKUP_USER\" --password=\"\$DB_BACKUP_PASSWORD\" \
      --datadir=/var/lib/mysql --target-dir=${TARGET}"

if [[ "$MODE" == "incr" ]]; then
  if [[ -z "$BASE_DIR" ]]; then
    echo "Incremental backups require base dir" >&2
    exit 1
  fi
  CMD+=" --incremental-basedir=${BASE_DIR}"
fi

docker exec "$CONTAINER" sh -c "mkdir -p ${TARGET} && $CMD"
