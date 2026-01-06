#!/bin/bash
# Nightly Scryfall Database Update Script
# This script updates the Scryfall card database

# Configuration - adjust these for your server
DOCKER_CONTAINER="${SCRYFALL_CONTAINER:-escalation-league-backend-prod}"
LOG_DIR="${SCRYFALL_LOG_DIR:-/var/log/escalation-league}"

# Create log directory if it doesn't exist
sudo mkdir -p "$LOG_DIR"
sudo chown $(whoami):$(whoami) "$LOG_DIR"

# Log file with timestamp
LOG_FILE="$LOG_DIR/scryfall-update-$(date +%Y-%m-%d).log"

# Start logging
echo "========================================" >> "$LOG_FILE"
echo "Scryfall Update Started: $(date)" >> "$LOG_FILE"
echo "Docker Container: $DOCKER_CONTAINER" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# Run the update script inside the Docker container
docker exec "$DOCKER_CONTAINER" node /app/scripts/updateScryfallData.js >> "$LOG_FILE" 2>&1

# Check exit status
if [ $? -eq 0 ]; then
    echo "Scryfall update completed successfully at $(date)" >> "$LOG_FILE"
    exit 0
else
    echo "Scryfall update failed at $(date)" >> "$LOG_FILE"
    exit 1
fi
