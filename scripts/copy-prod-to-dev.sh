#!/bin/bash

# Script to copy production database to dev and update dev-specific settings
# Usage: ./scripts/copy-prod-to-dev.sh [--dry-run]

set -e  # Exit on error

# Check for dry-run flag
DRY_RUN=false
if [ "$1" == "--dry-run" ]; then
    DRY_RUN=true
    echo "DRY RUN MODE - No changes will be made"
    echo ""
fi

# Get the project root directory (parent of scripts/)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Function to safely load env file
load_env() {
    local env_file=$1
    if [ ! -f "$env_file" ]; then
        echo "Error: $env_file not found"
        return 1
    fi
    
    # Read file line by line and export valid KEY=VALUE pairs
    while IFS= read -r line || [ -n "$line" ]; do
        # Remove leading/trailing whitespace
        line=$(echo "$line" | sed -e 's/^[[:space]]*//' -e 's/[[:space:]]*$//')
        
        # Skip empty lines and comments
        [[ -z "$line" || "$line" =~ ^# ]] && continue
        
        # Only process lines with = sign
        if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
            # Export the variable
            export "$line"
        fi
    done < "$env_file"
}

# Load environment variables from .env.prod (source)
if [ -f "$PROJECT_ROOT/.env.prod" ]; then
    echo "Loading production environment variables..."
    load_env "$PROJECT_ROOT/.env.prod"
    PROD_DB_NAME="${DB_NAME}"
    PROD_DB_ROOT_PASSWORD="${DB_ROOT_PASSWORD}"
else
    echo "Error: .env.prod file not found at $PROJECT_ROOT/.env.prod"
    exit 1
fi

# Load environment variables from .env.dev (destination)
if [ -f "$PROJECT_ROOT/.env.dev" ]; then
    echo "Loading development environment variables..."
    load_env "$PROJECT_ROOT/.env.dev"
    DEV_DB_NAME="${DB_NAME}"
    DEV_DB_USER="${DB_USER}"
    DEV_DB_PASSWORD="${DB_PASSWORD}"
    DEV_DB_ROOT_PASSWORD="${DB_ROOT_PASSWORD}"
else
    echo "Error: .env.dev file not found at $PROJECT_ROOT/.env.dev"
    exit 1
fi

echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}======================================${NC}"
echo -e "${YELLOW}Copy Production DB to Development${NC}"
echo -e "${YELLOW}======================================${NC}"
echo ""

# Containers
PROD_CONTAINER="escalation-league-db-prod"
DEV_CONTAINER="escalation-league-db-dev"

# Temporary files
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DUMP_FILE="/tmp/prod_db_dump_${TIMESTAMP}.sql"
BACKUP_FILE="/tmp/dev_db_backup_${TIMESTAMP}.sql"

# Function to execute or print command
run_command() {
    local description=$1
    local command=$2
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${BLUE}[DRY RUN] ${description}${NC}"
        echo -e "${BLUE}  Would run: ${command}${NC}"
        echo ""
    else
        echo -e "${GREEN}${description}${NC}"
        eval "$command"
        echo -e "${GREEN}Done${NC}"
        echo ""
    fi
}

# Verify containers are running
echo -e "${YELLOW}Checking containers...${NC}"
if ! docker ps | grep -q $PROD_CONTAINER; then
    echo -e "${RED}Error: $PROD_CONTAINER is not running${NC}"
    exit 1
fi
if ! docker ps | grep -q $DEV_CONTAINER; then
    echo -e "${RED}Error: $DEV_CONTAINER is not running${NC}"
    exit 1
fi
echo -e "${GREEN}Both containers are running${NC}"
echo ""

# Show database info
echo -e "${YELLOW}Source: ${PROD_CONTAINER} - Database: ${PROD_DB_NAME}${NC}"
echo -e "${YELLOW}Target: ${DEV_CONTAINER} - Database: ${DEV_DB_NAME}${NC}"
echo ""

# Show current dev database size
echo -e "${YELLOW}Current dev database info:${NC}"
docker exec $DEV_CONTAINER mysql \
    -u root \
    -p${DEV_DB_ROOT_PASSWORD} \
    -e "SELECT 
        table_schema AS 'Database',
        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)',
        COUNT(*) AS 'Tables'
    FROM information_schema.tables 
    WHERE table_schema = '${DEV_DB_NAME}'
    GROUP BY table_schema;"
echo ""

if [ "$DRY_RUN" = false ]; then
    # Confirmation
    echo -e "${RED}WARNING: This will overwrite the development database!${NC}"
    echo -e "${YELLOW}A backup will be created at: ${BACKUP_FILE}${NC}"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Aborted."
        exit 0
    fi
    echo ""
fi

# Step 0: Backup current dev database
run_command \
    "Step 0: Backing up current dev database..." \
    "docker exec $DEV_CONTAINER mysqldump -u root -p${DEV_DB_ROOT_PASSWORD} --single-transaction --routines --triggers --events ${DEV_DB_NAME} > '${BACKUP_FILE}'"

# Step 1: Dump production database
run_command \
    "Step 1: Dumping production database..." \
    "docker exec $PROD_CONTAINER mysqldump -u root -p${PROD_DB_ROOT_PASSWORD} --single-transaction --routines --triggers --events ${PROD_DB_NAME} > '${DUMP_FILE}'"

if [ "$DRY_RUN" = false ]; then
    echo -e "${YELLOW}Dump file size: $(du -h ${DUMP_FILE} | cut -f1)${NC}"
    echo ""
fi

# Step 2: Drop and recreate dev database
run_command \
    "Step 2: Dropping and recreating dev database..." \
    "docker exec $DEV_CONTAINER mysql -u root -p${DEV_DB_ROOT_PASSWORD} -e 'DROP DATABASE IF EXISTS ${DEV_DB_NAME}; CREATE DATABASE ${DEV_DB_NAME};'"

# Step 3: Re-grant permissions
run_command \
    "Step 3: Re-granting permissions to ${DEV_DB_USER}..." \
    "docker exec $DEV_CONTAINER mysql -u root -p${DEV_DB_ROOT_PASSWORD} -e \"GRANT ALL PRIVILEGES ON ${DEV_DB_NAME}.* TO '${DEV_DB_USER}'@'%'; FLUSH PRIVILEGES;\""

# Step 4: Import production data
run_command \
    "Step 4: Importing production data to dev..." \
    "docker exec -i $DEV_CONTAINER mysql -u root -p${DEV_DB_ROOT_PASSWORD} ${DEV_DB_NAME} < '${DUMP_FILE}'"

# Step 5: Update dev-specific settings
if [ "$DRY_RUN" = true ]; then
    echo -e "${BLUE}[DRY RUN] Step 5: Would update dev-specific settings:${NC}"
    echo -e "${BLUE}  - frontend_url -> https://dev.escalationleague.com${NC}"
    echo -e "${BLUE}  - max_token_expiration -> 876000h${NC}"
    echo -e "${BLUE}  - port -> 3000${NC}"
    echo ""
else
    echo -e "${GREEN}Step 5: Updating dev-specific settings...${NC}"
    docker exec $DEV_CONTAINER mysql \
        -u root \
        -p${DEV_DB_ROOT_PASSWORD} \
        ${DEV_DB_NAME} << 'SQLEOF'

-- Update frontend_url to dev domain
UPDATE settings 
SET value = 'https://dev.escalationleague.com' 
WHERE key_name = 'frontend_url';

-- Set max_token_expiration to infinite (99 years)
UPDATE settings 
SET value = '876000h' 
WHERE key_name = 'max_token_expiration';

-- Update port if needed
UPDATE settings 
SET value = '3000' 
WHERE key_name = 'port';

-- Show updated settings
SELECT key_name, value, description 
FROM settings 
WHERE key_name IN ('frontend_url', 'max_token_expiration', 'port', 'google_client_id', 'secret_key')
ORDER BY key_name;

SQLEOF
    echo -e "${GREEN}Settings updated${NC}"
    echo ""
fi

# Step 6: Cleanup
if [ "$DRY_RUN" = false ]; then
    echo -e "${GREEN}Step 6: Cleaning up...${NC}"
    echo -e "${YELLOW}Keeping backup file: ${BACKUP_FILE}${NC}"
    echo -e "${YELLOW}  To restore: docker exec -i $DEV_CONTAINER mysql -u root -p${DEV_DB_ROOT_PASSWORD} ${DEV_DB_NAME} < ${BACKUP_FILE}${NC}"
    rm "${DUMP_FILE}"
    echo -e "${GREEN}Cleanup complete${NC}"
    echo ""
fi

echo -e "${GREEN}======================================${NC}"
if [ "$DRY_RUN" = true ]; then
    echo -e "${BLUE}DRY RUN COMPLETE - No changes made${NC}"
else
    echo -e "${GREEN}Database copy completed successfully!${NC}"
fi
echo -e "${GREEN}======================================${NC}"
echo ""

if [ "$DRY_RUN" = false ]; then
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Verify the dev environment: https://dev.escalationleague.com"
    echo "2. Check that settings are correct in the dev database"
    echo "3. Restart backend-dev: docker restart escalation-league-backend-dev"
    echo ""
    echo -e "${YELLOW}If something went wrong, restore from backup:${NC}"
    echo "docker exec -i $DEV_CONTAINER mysql -u root -p${DEV_DB_ROOT_PASSWORD} ${DEV_DB_NAME} < ${BACKUP_FILE}"
fi
echo ""