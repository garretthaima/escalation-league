#!/bin/bash

# Script to view and filter logs

LOGS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/logs"
TODAY=$(date +%Y-%m-%d)
LOG_FILE="$LOGS_DIR/$TODAY.log"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

show_usage() {
    echo "Usage: $0 [option]"
    echo ""
    echo "Options:"
    echo "  tail          - Show last 50 lines of today's log (default)"
    echo "  follow        - Follow today's log in real-time"
    echo "  errors        - Show only ERROR level logs"
    echo "  warnings      - Show only WARN level logs"
    echo "  user <id>     - Show logs for specific user ID"
    echo "  signup        - Show signup-related logs"
    echo "  all           - Show entire today's log"
    echo "  yesterday     - Show yesterday's log"
    echo "  list          - List all log files"
    echo ""
}

if [ ! -d "$LOGS_DIR" ]; then
    echo -e "${RED}Logs directory not found: $LOGS_DIR${NC}"
    exit 1
fi

case "${1:-tail}" in
    tail)
        echo -e "${GREEN}Last 50 lines of today's log:${NC}"
        if [ -f "$LOG_FILE" ]; then
            tail -n 50 "$LOG_FILE" | jq -r '. | "\(.timestamp) [\(.level)] \(.message)"' 2>/dev/null || tail -n 50 "$LOG_FILE"
        else
            echo -e "${YELLOW}No log file for today yet${NC}"
        fi
        ;;
    follow)
        echo -e "${GREEN}Following today's log (Ctrl+C to stop):${NC}"
        touch "$LOG_FILE" # Create if doesn't exist
        tail -f "$LOG_FILE" | while read line; do
            echo "$line" | jq -r '. | "\(.timestamp) [\(.level)] \(.message)"' 2>/dev/null || echo "$line"
        done
        ;;
    errors)
        echo -e "${RED}ERROR level logs:${NC}"
        if [ -f "$LOG_FILE" ]; then
            grep '"level":"ERROR"' "$LOG_FILE" | jq -r '. | "\(.timestamp) \(.message) - \(.error // "")"'
        else
            echo -e "${YELLOW}No log file for today${NC}"
        fi
        ;;
    warnings)
        echo -e "${YELLOW}WARN level logs:${NC}"
        if [ -f "$LOG_FILE" ]; then
            grep '"level":"WARN"' "$LOG_FILE" | jq -r '. | "\(.timestamp) \(.message)"'
        else
            echo -e "${YELLOW}No log file for today${NC}"
        fi
        ;;
    user)
        if [ -z "$2" ]; then
            echo -e "${RED}Please provide user ID${NC}"
            exit 1
        fi
        echo -e "${GREEN}Logs for user ID $2:${NC}"
        if [ -f "$LOG_FILE" ]; then
            grep "\"userId\":$2" "$LOG_FILE" | jq -r '. | "\(.timestamp) [\(.level)] \(.message)"'
        else
            echo -e "${YELLOW}No log file for today${NC}"
        fi
        ;;
    signup)
        echo -e "${GREEN}Signup-related logs:${NC}"
        if [ -f "$LOG_FILE" ]; then
            grep -i "signup" "$LOG_FILE" | jq -r '. | "\(.timestamp) [\(.level)] \(.message) - User:\(.userId // "N/A")"'
        else
            echo -e "${YELLOW}No log file for today${NC}"
        fi
        ;;
    all)
        echo -e "${GREEN}Full today's log:${NC}"
        if [ -f "$LOG_FILE" ]; then
            cat "$LOG_FILE" | jq -r '. | "\(.timestamp) [\(.level)] \(.message)"' 2>/dev/null || cat "$LOG_FILE"
        else
            echo -e "${YELLOW}No log file for today${NC}"
        fi
        ;;
    yesterday)
        YESTERDAY=$(date -d "yesterday" +%Y-%m-%d 2>/dev/null || date -v-1d +%Y-%m-%d)
        YESTERDAY_FILE="$LOGS_DIR/$YESTERDAY.log"
        echo -e "${GREEN}Yesterday's log:${NC}"
        if [ -f "$YESTERDAY_FILE" ]; then
            cat "$YESTERDAY_FILE" | jq -r '. | "\(.timestamp) [\(.level)] \(.message)"' 2>/dev/null || cat "$YESTERDAY_FILE"
        else
            echo -e "${YELLOW}No log file for yesterday${NC}"
        fi
        ;;
    list)
        echo -e "${GREEN}Available log files:${NC}"
        ls -lh "$LOGS_DIR"/*.log 2>/dev/null || echo -e "${YELLOW}No log files found${NC}"
        ;;
    *)
        show_usage
        ;;
esac
