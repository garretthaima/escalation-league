# Monitoring and Alerting

## Overview

Health monitoring system that checks Docker container health and alerts on issues.

## Components

### 1. Health Monitor Script (`scripts/monitor-health.sh`)

Checks health of all containers and logs/alerts on issues.

**Features:**
- Container health status checking
- State tracking (detects transitions from healthy to unhealthy)
- Multiple alert methods: log, webhook, email
- Color-coded output

**Usage:**
```bash
# Check production
./scripts/monitor-health.sh prod

# Check development
./scripts/monitor-health.sh dev
```

### 2. Systemd Timer (Optional)

Run health checks automatically every 5 minutes.

**Installation:**
```bash
# Install for production
sudo ./scripts/install-monitor.sh prod

# Check status
systemctl status escalation-league-monitor.timer
journalctl -u escalation-league-monitor.service -f
```

**Uninstall:**
```bash
sudo systemctl stop escalation-league-monitor.timer
sudo systemctl disable escalation-league-monitor.timer
sudo rm /etc/systemd/system/escalation-league-monitor.{service,timer}
sudo systemctl daemon-reload
```

## Alert Methods

### 1. Log File (Default)

Alerts are logged to `/tmp/escalation-league-{env}-alerts.log`

```bash
# View alerts
tail -f /tmp/escalation-league-prod-alerts.log
```

### 2. Webhook (Discord, Slack, etc.)

Set environment variable:
```bash
export MONITORING_WEBHOOK_URL="https://discord.com/api/webhooks/..."
export ALERT_METHOD="webhook"
./scripts/monitor-health.sh prod
```

**Discord Webhook Setup:**
1. Go to Server Settings → Integrations → Webhooks
2. Create webhook, copy URL
3. Add to `.env.prod` or export before running

### 3. Email

Set environment variables:
```bash
export ALERT_EMAIL="admin@example.com"
export ALERT_METHOD="email"
./scripts/monitor-health.sh prod
```

Requires `mail` command configured (postfix, sendmail, etc.)

## Integration with Deployments

Deployment scripts automatically log to alert file:
- **Success**: INFO level log entry
- **Failure**: ERROR level log + webhook alert (if configured)

## Alert Severity Levels

- **INFO**: Successful operations
- **WARNING**: System transitioned to unhealthy state
- **ERROR**: Container unhealthy or smoke tests failed
- **CRITICAL**: Container stopped or missing

## Monitoring Best Practices

1. **Run periodic checks**: Use systemd timer or cron (every 5-10 minutes)
2. **Configure webhooks**: Get instant alerts in Slack/Discord
3. **Review logs regularly**: Check `/tmp/escalation-league-*-alerts.log`
4. **Test alerts**: Manually stop a container to verify alerting works

## Manual Testing

```bash
# Stop a container to trigger alert
docker stop escalation-league-backend-prod

# Run health check (should alert)
./scripts/monitor-health.sh prod

# Restart container
docker start escalation-league-backend-prod

# Run health check again (should show recovery)
./scripts/monitor-health.sh prod
```

## Webhook Payload Format

```json
{
  "content": "[prod] [ERROR] Container escalation-league-backend-prod is stopped"
}
```

This format works with Discord and Slack webhooks. For other services, modify `send_webhook_alert()` function in `monitor-health.sh`.

## Troubleshooting

**Timer not running:**
```bash
systemctl status escalation-league-monitor.timer
journalctl -u escalation-league-monitor.timer
```

**Service failing:**
```bash
journalctl -u escalation-league-monitor.service -n 50
```

**Webhook not sending:**
- Check MONITORING_WEBHOOK_URL is set
- Test webhook URL with curl manually
- Check firewall/network rules

## Future Enhancements

- Metrics collection (Prometheus/Grafana)
- Database connection health checks
- API endpoint response time monitoring
- Disk space/memory usage alerts
- Integration with external monitoring services (Datadog, New Relic, etc.)
