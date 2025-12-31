# Escalation League - Makefile
# Detects docker-compose vs docker compose automatically

# Compose file paths
PROD_COMPOSE := docker/compose/docker-compose.prod.yml
DEV_COMPOSE := docker/compose/docker-compose.dev.yml
EDGE_COMPOSE := docker/compose/docker-compose.edge.yml

# Env file paths (relative to project root)
PROD_ENV := .env.prod
DEV_ENV := .env.dev

# Detect which docker compose command to use
DOCKER_COMPOSE := $(shell which docker-compose 2>/dev/null)
ifeq ($(DOCKER_COMPOSE),)
	DOCKER_COMPOSE := $(shell docker compose version >/dev/null 2>&1 && echo "docker compose")
endif
ifeq ($(DOCKER_COMPOSE),)
	$(error "Neither 'docker-compose' nor 'docker compose' is available. Please install Docker Compose.")
endif

.PHONY: help build-prod build-dev build-edge prod dev edge restart-prod restart-dev stop-all clean clean-all \
		migrate-prod migrate-dev migrate-test seed-prod seed-dev seed-test \
		setup-prod setup-dev db-prod db-dev db-test backup-prod restore-prod \
		logs-prod logs-dev logs-edge status check-compose

help:
	@echo "Available commands:"
	@echo ""
	@echo "🚀 Quick Start:"
	@echo "  make build-prod    - Build production images (after code changes)"
	@echo "  make build-dev     - Build development images (after code changes)"
	@echo "  make build-edge    - Build edge proxy (after nginx changes)"
	@echo "  make rebuild-dev   - Force clean rebuild dev (no cache)"
	@echo "  make rebuild-prod  - Force clean rebuild prod (no cache)"
	@echo "  make prod          - Start production (no rebuild)"
	@echo "  make dev           - Start development (no rebuild)"
	@echo "  make edge          - Start edge proxy (no rebuild)"
	@echo ""
	@echo "🔄 Restart & Deploy:"
	@echo "  make deploy-prod   - Rebuild and restart production"
	@echo "  make deploy-dev    - Rebuild and restart development"
	@echo "  make deploy-edge   - Rebuild and restart edge proxy"
	@echo "  make restart-prod  - Restart production (no rebuild)"
	@echo "  make restart-dev   - Restart development (no rebuild)"
	@echo "  make restart-edge  - Restart edge proxy (no rebuild)"
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

# ============================================================================
# STOP & CLEAN COMMANDS
# ============================================================================

stop-all:
	@echo "⏹️  Stopping all containers (data preserved)..."
	-@$(DOCKER_COMPOSE) -f $(EDGE_COMPOSE) stop 2>/dev/null
	-@$(DOCKER_COMPOSE) --env-file $(PROD_ENV) -f $(PROD_COMPOSE) stop 2>/dev/null
	-@$(DOCKER_COMPOSE) --env-file $(DEV_ENV) -f $(DEV_COMPOSE) stop 2>/dev/null
	@echo "✅ All containers stopped"

clean: stop-all
	@echo "🧹 Removing containers (KEEPING DATA)..."
	-@$(DOCKER_COMPOSE) -f $(EDGE_COMPOSE) down 2>/dev/null
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
	@cd escalation-league-backend && NODE_ENV=production node seeds/seed_rbac.js
	@cd escalation-league-backend && NODE_ENV=production node seeds/seed_settings.js
	@cd escalation-league-backend && NODE_ENV=production node seeds/seed_win_conditions.js
	@echo "✅ Production database seeded"

seed-dev:
	@echo "🌱 Seeding development database (with dummy data)..."
	@cd escalation-league-backend && NODE_ENV=development node seeds/seed_rbac.js
	@cd escalation-league-backend && NODE_ENV=development node seeds/seed_settings.js
	@cd escalation-league-backend && NODE_ENV=development node seeds/seed_win_conditions.js
	@cd escalation-league-backend && NODE_ENV=development node seeds/populate_dummy_data.js
	@echo "✅ Development database seeded"

seed-test:
	@echo "🌱 Seeding test database..."
	@cd escalation-league-backend && NODE_ENV=test node seeds/seed_rbac.js
	@cd escalation-league-backend && NODE_ENV=test node seeds/seed_settings.js
	@cd escalation-league-backend && NODE_ENV=test node seeds/seed_win_conditions.js
	@echo "✅ Test database seeded"

# ============================================================================
# FULL SETUP
# ============================================================================

setup-prod: prod
	@echo "⏳ Waiting for containers to be ready..."
	@sleep 10
	@$(MAKE) migrate-prod
	@$(MAKE) seed-prod
	@echo "🎉 Production environment ready!"

setup-dev: dev
	@echo "⏳ Waiting for containers to be ready..."
	@sleep 10
	@$(MAKE) migrate-dev
	@$(MAKE) seed-dev
	@echo "🎉 Development environment ready!"

# ============================================================================
# DATABASE ACCESS
# ============================================================================

db-prod:
	@echo "🔌 Connecting to production database..."
	@bash -c 'source .env.prod && mysql -h 10.10.60.5 -P 3306 -u $$DB_USER -p$$DB_PASSWORD $$DB_NAME'

db-dev:
	@echo "🔌 Connecting to development database..."
	@bash -c 'source .env.dev && mysql -h 10.10.60.5 -P 3308 -u $$DB_USER -p$$DB_PASSWORD $$DB_NAME'

db-test:
	@echo "🔌 Connecting to test database..."
	@bash -c 'source .env.dev && mysql -h 10.10.60.5 -P 3308 -u $$TEST_DB_USER -p$$TEST_DB_PASSWORD $$TEST_DB_NAME'
	
# ============================================================================
# BACKUP & RESTORE
# ============================================================================

backup-prod:
	@echo "💾 Backing up production database..."
	@mkdir -p backups
	@mysqldump -h 10.10.60.5 -P 3306 -u league_user -p escalation_league_prod > backups/prod_backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup saved to backups/"
	@ls -lh backups/ | tail -1

restore-prod:
	@echo "📥 Available backups:"
	@ls -1t backups/*.sql 2>/dev/null | head -10 || echo "No backups found"
	@echo ""
	@read -p "Enter backup filename (from backups/): " backup; \
	if [ -f "backups/$$backup" ]; then \
		read -p "This will OVERWRITE production data. Type 'RESTORE' to confirm: " confirm; \
		if [ "$$confirm" = "RESTORE" ]; then \
			mysql -h 10.10.60.5 -P 3306 -u league_user -p escalation_league_prod < "backups/$$backup"; \
			echo "✅ Database restored from $$backup"; \
		else \
			echo "❌ Restore aborted"; \
		fi \
	else \
		echo "❌ Backup file not found: backups/$$backup"; \
	fi

# ============================================================================
# LOGS & MONITORING
# ============================================================================

logs-prod:
	@$(DOCKER_COMPOSE) --env-file $(PROD_ENV) -f $(PROD_COMPOSE) logs -f

logs-dev:
	@$(DOCKER_COMPOSE) --env-file $(DEV_ENV) -f $(DEV_COMPOSE) logs -f

logs-edge:
	@$(DOCKER_COMPOSE) -f $(EDGE_COMPOSE) logs -f

status:
	@echo "📊 System Status"
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "🐳 Docker Containers:"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@docker ps -a --filter "name=escalation-league" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || echo "No containers found"
	@docker ps -a --filter "name=nginx-edge" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || echo "No edge proxy found"
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "💾 Docker Volumes:"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@docker volume ls --filter "name=compose" --format "table {{.Name}}\t{{.Driver}}"
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "🗄️  Volume Sizes:"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@docker run --rm -v compose_db_prod_data:/data alpine du -sh /data 2>/dev/null | awk '{print "compose_db_prod_data: " $$1}' || echo "compose_db_prod_data: not accessible"
	@docker run --rm -v compose_db_dev_data:/data alpine du -sh /data 2>/dev/null | awk '{print "compose_db_dev_data: " $$1}' || echo "compose_db_dev_data: not accessible"
	@docker run --rm -v compose_card_db_data:/data alpine du -sh /data 2>/dev/null | awk '{print "compose_card_db_data: " $$1}' || echo "compose_card_db_data: not accessible"