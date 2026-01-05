# Escalation League - Makefile
# Detects docker-compose vs docker compose automatically

# Compose file paths
PROD_COMPOSE := docker/compose/docker-compose.prod.yml
DEV_COMPOSE := docker/compose/docker-compose.dev.yml
EDGE_COMPOSE := docker/compose/docker-compose.edge.yml
CARDS_COMPOSE := docker/compose/docker-compose.cards.yml

# Env file paths (relative to project root)
PROD_ENV := .env.prod
DEV_ENV := .env.dev
CARD_ENV ?= $(PROD_ENV)

# Detect which docker compose command to use
DOCKER_COMPOSE := $(shell which docker-compose 2>/dev/null)
ifeq ($(DOCKER_COMPOSE),)
	DOCKER_COMPOSE := $(shell docker compose version >/dev/null 2>&1 && echo "docker compose")
endif
ifeq ($(DOCKER_COMPOSE),)
	$(error "Neither 'docker-compose' nor 'docker compose' is available. Please install Docker Compose.")
endif

.PHONY: help build-prod build-dev build-edge build-cards prod dev edge cards restart-prod restart-dev restart-edge restart-cards stop-all clean clean-all \
		migrate-prod migrate-dev migrate-test seed-prod seed-dev seed-test \
		setup-prod setup-dev db-prod db-dev db-test backup-prod restore-prod \
		logs-prod logs-dev logs-edge logs-cards status check-compose redeploy-dev rebuild-prod rebuild-dev rebuild-edge rebuild-cards deploy-prod deploy-dev deploy-edge deploy-cards

help:
	@echo "Available commands:"
	@echo ""
	@echo "🚀 Quick Start:"
	@echo "  make build-prod    - Build production images (after code changes)"
	@echo "  make build-dev     - Build development images (after code changes)"
	@echo "  make build-edge    - Build edge proxy (after nginx changes)"
	@echo "  make build-cards   - Build/pull Scryfall card DB image"
	@echo "  make rebuild-dev   - Force clean rebuild dev (no cache)"
	@echo "  make rebuild-prod  - Force clean rebuild prod (no cache)"
	@echo "  make rebuild-cards - Force clean rebuild card DB (no cache)"
	@echo "  make prod          - Start production (no rebuild)"
	@echo "  make dev           - Start development (no rebuild)"
	@echo "  make edge          - Start edge proxy (no rebuild)"
	@echo "  make cards         - Start Scryfall card database"
	@echo ""
	@echo "🔄 Restart & Deploy:"
	@echo "  make deploy-prod   - Rebuild and restart production"
	@echo "  make deploy-dev    - Rebuild and restart development"
	@echo "  make deploy-edge   - Rebuild and restart edge proxy"
	@echo "  make deploy-cards  - Rebuild and restart card database"
	@echo "  make restart-prod  - Restart production (no rebuild)"
	@echo "  make restart-dev   - Restart development (no rebuild)"
	@echo "  make restart-edge  - Restart edge proxy (no rebuild)"
	@echo "  make restart-cards - Restart card database (no rebuild)"
	@echo ""
	@echo "📋 Setup & Migration:"
	@echo "  make setup-prod    - Fresh production setup (migrate + seed)"
	@echo "  make setup-dev     - Fresh development setup (migrate + seed)"
	@echo "  make migrate-prod  - Run production migrations"
	@echo "  make migrate-dev   - Run development migrations"
	@echo "  make seed-prod     - Seed production database"
	@echo "  make seed-dev      - Seed development database (with dummy data)"
	@echo ""
	@echo "🗄️  Database:"
	@echo "  make db-prod       - Connect to production database"
	@echo "  make db-dev        - Connect to development database"
	@echo "  make backup-prod   - Backup production database"
	@echo "  make restore-prod  - Restore production database"
	@echo ""
	@echo "📊 Monitoring:"
	@echo "  make logs-prod     - View production logs"
	@echo "  make logs-dev      - View development logs"
	@echo "  make logs-edge     - View edge proxy logs"
	@echo "  make logs-cards    - View card database logs"
	@echo "  make status        - Show system status"
	@echo ""
	@echo "🧹 Cleanup (SAFE):"
	@echo "  make stop-all      - Stop all containers (keeps data)"
	@echo "  make clean         - Remove containers (keeps data)"
	@echo ""
	@echo "⚠️  DANGEROUS:"
	@echo "  make clean-all     - Delete ALL data (requires confirmation)"

check-compose:
	@echo "Docker Compose Detection:"
	@echo "Using: $(DOCKER_COMPOSE)"
	@echo ""
	@$(DOCKER_COMPOSE) version 2>/dev/null || $(DOCKER_COMPOSE) --version

# Ensure edge network exists
network:
	@docker network inspect edge >/dev/null 2>&1 || docker network create edge

# ============================================================================
# BUILD COMMANDS (rebuild images after code changes)
# ============================================================================

build-prod:
	@echo "🔨 Building production images..."
	@$(DOCKER_COMPOSE) --env-file $(PROD_ENV) -f $(PROD_COMPOSE) build
	@echo "✅ Production images built"

build-dev:
	@echo "🔨 Building development images..."
	@$(DOCKER_COMPOSE) --env-file $(DEV_ENV) -f $(DEV_COMPOSE) build
	@echo "✅ Development images built"

build-edge:
	@echo "🔨 Building edge proxy..."
	@$(DOCKER_COMPOSE) -f $(EDGE_COMPOSE) build
	@echo "✅ Edge proxy built"

build-cards:
	@echo "🔨 Building card database image..."
	@$(DOCKER_COMPOSE) --env-file $(CARD_ENV) -f $(CARDS_COMPOSE) build
	@echo "✅ Card database image ready"

rebuild-prod:
	@echo "🔨 Rebuilding production images (no cache)..."
	@$(DOCKER_COMPOSE) --env-file $(PROD_ENV) -f $(PROD_COMPOSE) build --no-cache
	@echo "✅ Production images rebuilt"

rebuild-dev:
	@echo "🔨 Rebuilding development images (no cache)..."
	@$(DOCKER_COMPOSE) --env-file $(DEV_ENV) -f $(DEV_COMPOSE) build --no-cache
	@echo "✅ Development images rebuilt"

rebuild-edge:
	@echo "🔨 Rebuilding edge proxy (no cache)..."
	@$(DOCKER_COMPOSE) -f $(EDGE_COMPOSE) build --no-cache
	@echo "✅ Edge proxy rebuilt"

rebuild-cards:
	@echo "🔨 Rebuilding card database (no cache)..."
	@$(DOCKER_COMPOSE) --env-file $(CARD_ENV) -f $(CARDS_COMPOSE) build --no-cache
	@echo "✅ Card database rebuilt"

# Add to deploy section
redeploy-dev: rebuild-dev
	@echo "🚀 Redeploying development (no cache)..."
	@$(DOCKER_COMPOSE) --env-file $(DEV_ENV) -f $(DEV_COMPOSE) up -d --force-recreate
	@echo "✅ Development redeployed"

# ============================================================================
# START COMMANDS (start without rebuild)
# ============================================================================

prod: network
	@echo "🚀 Starting production environment..."
	@$(DOCKER_COMPOSE) --env-file $(PROD_ENV) -f $(PROD_COMPOSE) up -d
	@echo "✅ Production is running"
	@echo "   Backend: http://localhost:5000"
	@echo "   Database: 10.10.60.5:3306"

dev: network
	@echo "🚀 Starting development environment..."
	@$(DOCKER_COMPOSE) --env-file $(DEV_ENV) -f $(DEV_COMPOSE) up -d
	@echo "✅ Development is running"
	@echo "   Backend: http://localhost:5001"
	@echo "   Database: 10.10.60.5:3308"

edge: network
	@echo "🌐 Starting edge proxy..."
	@$(DOCKER_COMPOSE) -f $(EDGE_COMPOSE) up -d
	@echo "✅ Edge proxy is running"
	@echo "   https://escalationleague.com → frontend-prod"
	@echo "   https://api.escalationleague.com → backend-prod"
	@echo "   https://dev.escalationleague.com → frontend-dev"
	@echo "   https://api.dev.escalationleague.com → backend-dev"

cards: network
	@echo "🃏 Starting card database..."
	@$(DOCKER_COMPOSE) --env-file $(CARD_ENV) -f $(CARDS_COMPOSE) up -d
	@echo "✅ Card database is running"
	@echo "   Port: 3307 (host) → 3306 (container)"

# ============================================================================
# DEPLOY COMMANDS (rebuild + restart)
# ============================================================================

deploy-prod: build-prod
	@echo "� Deploying production..."
	@$(DOCKER_COMPOSE) --env-file $(PROD_ENV) -f $(PROD_COMPOSE) up -d --force-recreate
	@echo "✅ Production deployed"

deploy-dev: build-dev
	@echo "🚀 Deploying development..."
	@$(DOCKER_COMPOSE) --env-file $(DEV_ENV) -f $(DEV_COMPOSE) up -d --force-recreate
	@echo "✅ Development deployed"

deploy-edge: build-edge
	@echo "� Deploying edge proxy..."
	@$(DOCKER_COMPOSE) -f $(EDGE_COMPOSE) up -d --force-recreate
	@$(DOCKER_COMPOSE) -f $(EDGE_COMPOSE) exec nginx-edge nginx -t
	@echo "✅ Edge proxy deployed"

deploy-cards: build-cards
	@echo "🃏 Deploying card database..."
	@$(DOCKER_COMPOSE) --env-file $(CARD_ENV) -f $(CARDS_COMPOSE) up -d --force-recreate
	@echo "✅ Card database deployed"

# ============================================================================
# RESTART COMMANDS (restart without rebuild)
# ============================================================================

restart-prod:
	@echo "� Restarting production..."
	@$(DOCKER_COMPOSE) --env-file $(PROD_ENV) -f $(PROD_COMPOSE) restart
	@echo "✅ Production restarted"

restart-dev:
	@echo "� Restarting development..."
	@$(DOCKER_COMPOSE) --env-file $(DEV_ENV) -f $(DEV_COMPOSE) restart
	@echo "✅ Development restarted"

restart-edge:
	@echo "🔄 Restarting edge proxy..."
	@$(DOCKER_COMPOSE) -f $(EDGE_COMPOSE) restart
	@echo "✅ Edge proxy restarted"

restart-cards:
	@echo "🔄 Restarting card database..."
	@$(DOCKER_COMPOSE) --env-file $(CARD_ENV) -f $(CARDS_COMPOSE) restart
	@echo "✅ Card database restarted"

# ============================================================================
# STOP & CLEAN COMMANDS
# ============================================================================

stop-all:
	@echo "⏹️  Stopping all containers (data preserved)..."
	-@$(DOCKER_COMPOSE) -f $(EDGE_COMPOSE) stop 2>/dev/null
	-@$(DOCKER_COMPOSE) --env-file $(CARD_ENV) -f $(CARDS_COMPOSE) stop 2>/dev/null
	-@$(DOCKER_COMPOSE) --env-file $(PROD_ENV) -f $(PROD_COMPOSE) stop 2>/dev/null
	-@$(DOCKER_COMPOSE) --env-file $(DEV_ENV) -f $(DEV_COMPOSE) stop 2>/dev/null
	@echo "✅ All containers stopped"

clean: stop-all
	@echo "🧹 Removing containers (KEEPING DATA)..."
	-@$(DOCKER_COMPOSE) -f $(EDGE_COMPOSE) down 2>/dev/null
	-@$(DOCKER_COMPOSE) --env-file $(CARD_ENV) -f $(CARDS_COMPOSE) down 2>/dev/null
	-@$(DOCKER_COMPOSE) --env-file $(PROD_ENV) -f $(PROD_COMPOSE) down 2>/dev/null
	-@$(DOCKER_COMPOSE) --env-file $(DEV_ENV) -f $(DEV_COMPOSE) down 2>/dev/null
	@echo "✅ Containers removed, data volumes preserved"

clean-all:
	@echo "⚠️  WARNING: This will DELETE ALL DATA!"
	@echo ""
	@echo "This will permanently delete:"
	@echo "  - Production database (compose_db_prod_data)"
	@echo "  - Development database (compose_db_dev_data)"
	@echo "  - Card database (compose_card_db_data)"
	@echo "  - Redis data"
	@echo "  - ALL user data, games, leagues, etc."
	@echo ""
	@read -p "Type 'DELETE-EVERYTHING' to confirm: " confirm; \
	if [ "$$confirm" = "DELETE-EVERYTHING" ]; then \
		echo "💾 Creating backup first..."; \
		$(MAKE) backup-prod || true; \
		echo "🗑️  Deleting all volumes..."; \
		$(DOCKER_COMPOSE) -f $(EDGE_COMPOSE) down; \
		$(DOCKER_COMPOSE) --env-file $(CARD_ENV) -f $(CARDS_COMPOSE) down -v; \
		$(DOCKER_COMPOSE) --env-file $(PROD_ENV) -f $(PROD_COMPOSE) down -v; \
		$(DOCKER_COMPOSE) --env-file $(DEV_ENV) -f $(DEV_COMPOSE) down -v; \
		echo "✅ All data deleted"; \
	else \
		echo "❌ Aborted - no data deleted"; \
	fi

# ============================================================================
# DATABASE MIGRATIONS
# ============================================================================

migrate-prod:
	@echo "🔄 Running production migrations..."
	@cd escalation-league-backend && NODE_ENV=production npx knex migrate:latest --env production
	@echo "✅ Migrations complete"

migrate-dev:
	@echo "🔄 Running development migrations..."
	@cd escalation-league-backend && NODE_ENV=development npx knex migrate:latest --env development
	@echo "✅ Migrations complete"

migrate-test:
	@echo "🔄 Running test migrations..."
	@cd escalation-league-backend && NODE_ENV=test npx knex migrate:latest --env test
	@echo "✅ Migrations complete"

# ============================================================================
# DATABASE SEEDING
# ============================================================================

seed-prod:
	@echo "🌱 Seeding production database..."
	@cd escalation-league-backend && NODE_ENV=production npx knex seed:run --env production --specific seed_rbac.js
	@cd escalation-league-backend && NODE_ENV=production npx knex seed:run --env production --specific seed_settings.js
	@cd escalation-league-backend && NODE_ENV=production npx knex seed:run --env production --specific seed_win_conditions.js
	@echo "✅ Production database seeded"

seed-required-dev:
	@echo "🔧 Seeding required data (RBAC, settings, win conditions)..."
	@$(DOCKER_COMPOSE) --env-file $(DEV_ENV) -f $(DEV_COMPOSE) exec backend-dev npx knex seed:run --env development --specific required/seed_rbac.js
	@$(DOCKER_COMPOSE) --env-file $(DEV_ENV) -f $(DEV_COMPOSE) exec backend-dev npx knex seed:run --env development --specific required/seed_settings.js
	@$(DOCKER_COMPOSE) --env-file $(DEV_ENV) -f $(DEV_COMPOSE) exec backend-dev npx knex seed:run --env development --specific required/seed_win_conditions.js
	@echo "✅ Required data seeded"

seed-dev-data:
	@echo "🎮 Seeding development test data..."
	@$(DOCKER_COMPOSE) --env-file $(DEV_ENV) -f $(DEV_COMPOSE) exec backend-dev npx knex seed:run --env development --specific development/01_clear_dev_data.js
	@$(DOCKER_COMPOSE) --env-file $(DEV_ENV) -f $(DEV_COMPOSE) exec backend-dev npx knex seed:run --env development --specific development/02_users.js
	@$(DOCKER_COMPOSE) --env-file $(DEV_ENV) -f $(DEV_COMPOSE) exec backend-dev npx knex seed:run --env development --specific development/03_leagues.js
	@$(DOCKER_COMPOSE) --env-file $(DEV_ENV) -f $(DEV_COMPOSE) exec backend-dev npx knex seed:run --env development --specific development/04_user_leagues.js
	@$(DOCKER_COMPOSE) --env-file $(DEV_ENV) -f $(DEV_COMPOSE) exec backend-dev npx knex seed:run --env development --specific development/05_pods_and_games.js
	@echo "✅ Development test data seeded"

seed-dev: seed-required-dev seed-dev-data

reseed-dev: seed-dev-data

