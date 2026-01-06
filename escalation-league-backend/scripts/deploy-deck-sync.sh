#!/bin/bash
# Deploy deck sync job to remote server

# Configuration
REMOTE_USER="${REMOTE_USER:-garrett}"
REMOTE_HOST="${REMOTE_HOST:-10.10.60.5}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/github}"
REMOTE_PATH="${REMOTE_PATH:-/usr/local/bin}"

echo "Deploying deck sync job to $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH"

# Copy scripts to remote server
scp -i "$SSH_KEY" \
    syncDecks.js \
    periodic-deck-sync.sh \
    deck-sync.service \
    deck-sync.timer \
    install-deck-sync.sh \
    "$REMOTE_USER@$REMOTE_HOST:/tmp/"

echo ""
echo "Files copied to server. Now connect and run the installation:"
echo ""
echo "  ssh $REMOTE_USER@$REMOTE_HOST -i $SSH_KEY"
echo "  cd /tmp"
echo "  sudo mv syncDecks.js periodic-deck-sync.sh deck-sync.service deck-sync.timer install-deck-sync.sh $REMOTE_PATH/"
echo "  cd $REMOTE_PATH"
echo "  sudo bash install-deck-sync.sh"
echo ""
