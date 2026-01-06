#!/bin/bash
# Installation script for deck sync job

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CURRENT_USER=$(whoami)

echo "Installing deck sync systemd timer..."
echo "Script directory: $SCRIPT_DIR"
echo "Current user: $CURRENT_USER"

# Make the sync script executable
chmod +x "$SCRIPT_DIR/periodic-deck-sync.sh"

# Create systemd service file with correct paths
sed -e "s|%USER%|$CURRENT_USER|g" \
    -e "s|%INSTALL_PATH%|$SCRIPT_DIR|g" \
    "$SCRIPT_DIR/deck-sync.service" > /tmp/deck-sync.service

# Copy systemd files to system directory
sudo cp /tmp/deck-sync.service /etc/systemd/system/
sudo cp "$SCRIPT_DIR/deck-sync.timer" /etc/systemd/system/
rm /tmp/deck-sync.service

# Reload systemd
sudo systemctl daemon-reload

# Enable and start the timer
sudo systemctl enable deck-sync.timer
sudo systemctl start deck-sync.timer

# Check status
echo ""
echo "Timer status:"
sudo systemctl status deck-sync.timer --no-pager

echo ""
echo "Next scheduled runs:"
sudo systemctl list-timers deck-sync.timer --no-pager

echo ""
echo "Installation complete!"
echo ""
echo "Useful commands:"
echo "  - Check timer status: sudo systemctl status deck-sync.timer"
echo "  - View logs: sudo journalctl -u deck-sync.service"
echo "  - Run manually now: sudo systemctl start deck-sync.service"
echo "  - Disable timer: sudo systemctl stop deck-sync.timer && sudo systemctl disable deck-sync.timer"
