#!/usr/bin/env bash
# Install health monitoring as a systemd service
set -euo pipefail

if [ "$EUID" -ne 0 ]; then 
    echo "Please run with sudo"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVIRONMENT="${1:-prod}"

echo "Installing health monitor for $ENVIRONMENT environment..."

# Copy service files
cp "$SCRIPT_DIR/monitor-health.service" /etc/systemd/system/escalation-league-monitor.service
cp "$SCRIPT_DIR/monitor-health.timer" /etc/systemd/system/escalation-league-monitor.timer

# Update service file to use correct environment
sed -i "s/prod/$ENVIRONMENT/g" /etc/systemd/system/escalation-league-monitor.service

# Reload systemd
systemctl daemon-reload

# Enable and start timer
systemctl enable escalation-league-monitor.timer
systemctl start escalation-league-monitor.timer

echo ""
echo "Health monitor installed successfully!"
echo ""
echo "Commands:"
echo "  systemctl status escalation-league-monitor.timer  # Check timer status"
echo "  systemctl status escalation-league-monitor.service # Check last run"
echo "  journalctl -u escalation-league-monitor.service   # View logs"
echo ""
echo "Alert log: /tmp/escalation-league-${ENVIRONMENT}-alerts.log"
echo ""
echo "To configure webhook alerts:"
echo "  1. Set MONITORING_WEBHOOK_URL environment variable in .env.$ENVIRONMENT"
echo "  2. Restart the timer: systemctl restart escalation-league-monitor.timer"
