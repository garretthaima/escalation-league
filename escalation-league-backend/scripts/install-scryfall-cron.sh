#!/bin/bash
# Installation script for Scryfall nightly update job
# Run this script on the remote server

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CURRENT_USER=$(whoami)

echo "Installing Scryfall nightly update systemd timer..."
echo "Script directory: $SCRIPT_DIR"
echo "Current user: $CURRENT_USER"

# Make the update script executable
chmod +x "$SCRIPT_DIR/nightly-scryfall-update.sh"

# Create systemd service file with correct paths
sed -e "s|%USER%|$CURRENT_USER|g" \
    -e "s|%INSTALL_PATH%|$SCRIPT_DIR|g" \
    "$SCRIPT_DIR/scryfall-update.service" > /tmp/scryfall-update.service

# Copy systemd files to the system directory
sudo cp /tmp/scryfall-update.service /etc/systemd/system/
sudo cp "$SCRIPT_DIR/scryfall-update.timer" /etc/systemd/system/
rm /tmp/scryfall-update.service

# Reload systemd to recognize new files
sudo systemctl daemon-reload

# Enable the timer (so it starts on boot)
sudo systemctl enable scryfall-update.timer

# Start the timer
sudo systemctl start scryfall-update.timer

# Check status
echo ""
echo "Timer status:"
sudo systemctl status scryfall-update.timer --no-pager

echo ""
echo "Next scheduled run:"
sudo systemctl list-timers scryfall-update.timer --no-pager

echo ""
echo "Installation complete!"
echo ""
echo "Useful commands:"
echo "  - Check timer status: sudo systemctl status scryfall-update.timer"
echo "  - View logs: sudo journalctl -u scryfall-update.service"
echo "  - Run manually now: sudo systemctl start scryfall-update.service"
echo "  - Disable timer: sudo systemctl stop scryfall-update.timer && sudo systemctl disable scryfall-update.timer"
