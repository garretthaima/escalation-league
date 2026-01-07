# Logging System

## Overview
The application now has comprehensive logging that writes to daily log files in JSON format.

## Log Location
Logs are stored in: `escalation-league-backend/logs/`
- Files are named by date: `YYYY-MM-DD.log`
- Example: `2026-01-06.log`

## Log Levels
- **INFO**: General application events (startup, successful operations)
- **ERROR**: Errors with full stack traces
- **WARN**: Warnings and failed validations
- **DEBUG**: Detailed debugging info (only in development)
- **HTTP**: All HTTP requests with response times

## What Gets Logged

### HTTP Requests
Every request logs:
- Method, URL, status code
- Response time
- User ID (or 'anonymous')
- IP address
- Request body (with sensitive fields redacted)

### User Signup
- Signup initiation with all parameters
- Validation failures with reasons
- Existing request conflicts
- Database transaction steps
- Success/failure with full context

### Authentication
- Registration attempts
- Login attempts
- OAuth authentication
- Role assignments
- Duplicate email attempts

## Viewing Logs

### Docker Production
Logs are mounted as a volume in production, so you can view them from your host machine:
```bash
# View logs from host machine
./escalation-league-backend/scripts/view-logs.sh follow

# Or run inside container
docker exec escalation-league-backend-prod /app/scripts/view-logs.sh follow
```

### Command Line Tool
```bash
# View last 50 lines
./scripts/view-logs.sh tail

# Follow logs in real-time (great for testing)
./scripts/view-logs.sh follow

# Show only errors
./scripts/view-logs.sh errors

# Show signup-related logs
./scripts/view-logs.sh signup

# Show logs for specific user
./scripts/view-logs.sh user 123

# List all available log files
./scripts/view-logs.sh list
```

### Manual Viewing
```bash
# View raw log file
cat logs/2026-01-06.log

# Filter for errors
grep '"level":"ERROR"' logs/2026-01-06.log

# Pretty print with jq
cat logs/2026-01-06.log | jq '.'

# Watch in real-time
tail -f logs/2026-01-06.log
```

## Using Logger in Code

```javascript
const logger = require('../utils/logger');

// Info message with metadata
logger.info('User performed action', {
    userId: user.id,
    action: 'update_profile'
});

// Error with exception
try {
    // ... code
} catch (error) {
    logger.error('Operation failed', error, {
        userId: user.id,
        context: 'additional info'
    });
}

// Warning
logger.warn('Validation failed', {
    field: 'email',
    value: email
});

// Debug (only in development)
logger.debug('Processing data', { data });
```

## Log Retention
- Logs are kept indefinitely (you can manually delete old ones)
- Each day creates a new file
- Consider setting up log rotation for production

## Production Notes
- In production, consider using a log aggregation service
- The `view-logs.sh` script requires `jq` for pretty formatting:
  ```bash
  # Install jq
  sudo apt install jq
  ```
- Sensitive data (passwords, tokens) are automatically redacted
- Set up log rotation to prevent disk space issues

## Troubleshooting with Logs

### User Can't Sign Up
```bash
# Check all signup attempts
./scripts/view-logs.sh signup

# Check specific user's actions
./scripts/view-logs.sh user <userId>
```

### Deck Validation Issues
```bash
# Search for deck-related logs
grep -i "deck" logs/$(date +%Y-%m-%d).log | jq '.'
```

### Authentication Problems
```bash
# Check errors
./scripts/view-logs.sh errors

# Check specific user login
grep "login" logs/$(date +%Y-%m-%d).log | grep "userId.*123"
```

## Example Log Entry
```json
{
  "timestamp": "2026-01-06T20:30:45.123Z",
  "level": "INFO",
  "message": "Signup request initiated",
  "userId": 42,
  "league_id": 1,
  "deck_id": "tRY07r_VBkS_eFrLsV6x7w",
  "current_commander": "uuid-here",
  "commander_partner": null
}
```
