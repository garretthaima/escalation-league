#!/bin/bash
# Periodic Deck Sync Script
# Syncs all decks from Moxfield/Archidekt

# Configuration
DOCKER_CONTAINER="${DECK_SYNC_CONTAINER:-escalation-league-backend-prod}"
LOG_DIR="${DECK_SYNC_LOG_DIR:-/var/log/escalation-league}"

# Create log directory
sudo mkdir -p "$LOG_DIR"
sudo chown $(whoami):$(whoami) "$LOG_DIR"

# Log file
LOG_FILE="$LOG_DIR/deck-sync-$(date +%Y-%m-%d-%H%M).log"

# Start logging
echo "========================================" >> "$LOG_FILE"
echo "Deck Sync Started: $(date)" >> "$LOG_FILE"
echo "Docker Container: $DOCKER_CONTAINER" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# Run sync script inside Docker container
docker exec "$DOCKER_CONTAINER" node /app/scripts/syncDecks.js >> "$LOG_FILE" 2>&1

# Check exit status
if [ $? -eq 0 ]; then
    echo "Deck sync completed successfully at $(date)" >> "$LOG_FILE"
    exit 0
else
    echo "Deck sync failed at $(date)" >> "$LOG_FILE"
    exit 1
fi
