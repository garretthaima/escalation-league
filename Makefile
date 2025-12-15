.PHONY: help all edge prod dev stop-edge stop-prod stop-dev stop-all clean-prod clean-dev clean-all logs-edge logs-prod logs-dev status restart-prod restart-dev build-prod build-dev

# Default target
.DEFAULT_GOAL := help

# Compose file paths
COMPOSE_DIR := docker/compose
EDGE_COMPOSE := $(COMPOSE_DIR)/docker-compose.edge.yml
PROD_COMPOSE := $(COMPOSE_DIR)/docker-compose.prod.yml
DEV_COMPOSE := $(COMPOSE_DIR)/docker-compose.dev.yml

# Env files
PROD_ENV := .env.prod
DEV_ENV := .env.dev

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[0;33m
NC := \033[0m

help: ## Show this help message
	@echo "$(GREEN)Escalation League Deployment$(NC)"
	@echo ""
	@echo "$(YELLOW)Usage:$(NC)"
	@echo "  make <target>"
	@echo ""
	@echo "$(YELLOW)Targets:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

ensure-network:
	@docker network create edge 2>/dev/null || true

all: ensure-network edge prod dev status ## Deploy all stacks

edge: ensure-network ## Deploy edge nginx
	@echo "$(GREEN)[edge]$(NC) Starting edge nginx..."
	@docker compose -f $(EDGE_COMPOSE) up -d

prod: ensure-network ## Deploy production stack
	@echo "$(GREEN)[prod]$(NC) Starting production stack..."
	@docker compose --env-file $(PROD_ENV) -f $(PROD_COMPOSE) up -d

dev: ensure-network ## Deploy dev/QA stack
	@echo "$(GREEN)[dev]$(NC) Starting dev stack..."
	@docker compose --env-file $(DEV_ENV) -f $(DEV_COMPOSE) up -d

build-prod: ensure-network ## Build and deploy production
	@echo "$(GREEN)[prod]$(NC) Building production stack..."
	@docker compose --env-file $(PROD_ENV) -f $(PROD_COMPOSE) up -d --build

build-dev: ensure-network ## Build and deploy dev
	@echo "$(GREEN)[dev]$(NC) Building dev stack..."
	@docker compose --env-file $(DEV_ENV) -f $(DEV_COMPOSE) up -d --build

build-all: ensure-network edge build-prod build-dev status ## Build all stacks

stop-edge: ## Stop edge nginx
	@docker compose -f $(EDGE_COMPOSE) down

stop-prod: ## Stop production stack
	@docker compose -f $(PROD_COMPOSE) down

stop-dev: ## Stop dev stack
	@docker compose -f $(DEV_COMPOSE) down

stop-all: stop-edge stop-prod stop-dev ## Stop all stacks

clean-prod: ## Stop production and remove volumes
	@docker compose -f $(PROD_COMPOSE) down -v

clean-dev: ## Stop dev and remove volumes
	@docker compose -f $(DEV_COMPOSE) down -v

clean-all: stop-edge clean-prod clean-dev ## Stop all and remove volumes

restart-edge: stop-edge edge ## Restart edge nginx

restart-prod: stop-prod prod ## Restart production

restart-dev: stop-dev dev ## Restart dev

logs-edge: ## Tail edge nginx logs
	@docker compose -f $(EDGE_COMPOSE) logs -f

logs-prod: ## Tail production logs
	@docker compose -f $(PROD_COMPOSE) logs -f

logs-dev: ## Tail dev logs
	@docker compose -f $(DEV_COMPOSE) logs -f

status: ## Show running containers
	@echo "$(YELLOW)=== Running Containers ===$(NC)"
	@docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'