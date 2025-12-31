#!/usr/bin/env bash
# filepath: /home/ghaima/code/escalation-league/scripts/docker-deploy.sh
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

usage() {
  cat << EOF
Usage: $0 <command> [options]

Commands:
  edge     Deploy edge nginx (80/443 router)
  prod     Deploy production stack
  dev      Deploy dev/QA stack
  all      Deploy everything (edge + prod + dev)
  stop     Stop specific stack (edge|prod|dev|all)
  logs     Tail logs (edge|prod|dev)

Options:
  --build  Force rebuild images

Examples:
  $0 all
  $0 prod --build
  $0 logs dev
  $0 stop prod
EOF
  exit 1
}

ensure_network() {
  docker network create edge 2>/dev/null || true
}

deploy_edge() {
  echo "[edge] Starting edge nginx..."
  docker compose -f docker-compose.edge.yml up -d "$@"
}

deploy_prod() {
  echo "[prod] Starting production stack..."
  docker compose --env-file .env.prod -f docker-compose.prod.yml up -d "$@"
}

deploy_dev() {
  echo "[dev] Starting dev stack..."
  docker compose --env-file .env.dev -f docker-compose.dev.yml up -d "$@"
}

stop_stack() {
  case "$1" in
    edge) docker compose -f docker-compose.edge.yml down ;;
    prod) docker compose -f docker-compose.prod.yml down ;;
    dev) docker compose -f docker-compose.dev.yml down ;;
    all)
      docker compose -f docker-compose.edge.yml down
      docker compose -f docker-compose.prod.yml down
      docker compose -f docker-compose.dev.yml down
      ;;
    *) echo "Unknown stack: $1"; usage ;;
  esac
}

show_logs() {
  case "$1" in
    edge) docker compose -f docker-compose.edge.yml logs -f ;;
    prod) docker compose -f docker-compose.prod.yml logs -f ;;
    dev) docker compose -f docker-compose.dev.yml logs -f ;;
    *) echo "Unknown stack: $1"; usage ;;
  esac
}

[ $# -eq 0 ] && usage

COMMAND=$1
shift

case "$COMMAND" in
  edge)
    ensure_network
    deploy_edge "$@"
    ;;
  prod)
    ensure_network
    deploy_prod "$@"
    ;;
  dev)
    ensure_network
    deploy_dev "$@"
    ;;
  all)
    ensure_network
    deploy_edge "$@"
    deploy_prod "$@"
    deploy_dev "$@"
    echo ""
    echo "[deploy] All stacks running:"
    docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
    ;;
  stop)
    [ $# -eq 0 ] && usage
    stop_stack "$1"
    ;;
  logs)
    [ $# -eq 0 ] && usage
    show_logs "$1"
    ;;
  *)
    usage
    ;;
esac