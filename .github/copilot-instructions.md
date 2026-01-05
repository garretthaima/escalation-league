# Escalation League - Development Reference

## Database Schema Reference

### Test Database Connection
**Configured via `.env.test` file:**
- `TEST_DB_HOST` - Database host (default: 10.10.60.5)
- `TEST_DB_PORT` - Database port (default: 3308)
- `TEST_DB_USER` - Database user (default: league_user)
- `TEST_DB_PASSWORD` - Database password
- `TEST_DB_NAME` - Database name (default: escalation_league_test)

**Note:** Never commit `.env.test` with real credentials. Use example below for local setup.

### Core Tables

#### users
- `id` (PK, auto_increment)
- `email` (unique, required)
- `password` (hashed)
- `firstname`, `lastname`
- `wins`, `losses`, `draws` (int, default 0)
- `role_id` (FK to roles.id) - Single role per user
- `is_active`, `is_banned`, `is_deleted` (tinyint boolean)
- `google_id` (unique, for OAuth)
- Various game stats fields

#### roles
- `id` (PK, auto_increment)
- `name` (unique, required)
- `description`
- `created_at`, `updated_at` (auto timestamps)
- **Note:** No `is_system_role` column

#### permissions
- `id` (PK, auto_increment)
- `name` (unique, required)
- `description`
- `created_at`, `updated_at`

#### role_permissions (junction table)
- `id` (PK, auto_increment)
- `role_id` (FK to roles.id)
- `permission_id` (FK to permissions.id)
- `created_at`, `updated_at`

#### leagues
- `id` (PK, auto_increment)
- `name` (required)
- `start_date`, `end_date` (date, required)
- `current_week` (int, default 1)
- `weekly_budget` (decimal, default 0.00)
- `is_active` (tinyint, default 0)
- `league_code` (unique)
- `description` (text)
- `max_players` (int)
- `created_at` (auto timestamp)

#### user_leagues (users enrolled in leagues)
- `id` (PK, auto_increment)
- `user_id` (FK to users.id)
- `league_id` (FK to leagues.id)
- `league_wins`, `league_losses`, `league_draws` (int, default 0)
- `total_points`, `matches_played` (int)
- `rank`, `is_active`, `disqualified`, `finals_qualified`
- `league_role` (varchar, default 'player')
- `deck_id`, `current_commander`, `commander_partner`
- `request_id` (FK to league_signup_requests.id)

#### league_signup_requests
- `id` (PK, auto_increment)
- `user_id` (FK to users.id)
- `league_id` (FK to leagues.id)
- `status` (enum: 'pending', 'approved', 'rejected', default 'pending')
- `created_at` (auto timestamp)

#### game_pods (game sessions)
- `id` (PK, auto_increment)
- `league_id` (FK to leagues.id)
- `creator_id` (FK to users.id)
- `status` (enum: 'active', 'completed', default 'active')
- `confirmation_status` (enum: 'open', 'active', 'pending', 'complete', default 'open')
- `result` (varchar)
- `win_condition_id` (FK to win_conditions.id)
- `created_at`, `deleted_at` (soft delete)

#### game_players (players in a game pod)
- `id` (PK, auto_increment)
- `player_id` (FK to users.id)
- `pod_id` (FK to game_pods.id)
- `confirmed` (tinyint, default 0)
- `turn_order` (int)
- `result` (varchar)
- `confirmation_time` (timestamp)

#### decks
- `id` (varchar PK - external deck ID)
- `decklist_url`, `platform`, `name` (required)
- `commanders`, `cards` (JSON)
- `created_at`, `updated_at`, `last_synced_at`

#### Other Tables
- `awards` - Award definitions
- `user_awards` - Awards given to users
- `win_conditions` - Game win condition types
- `activity_logs` - User activity tracking
- `settings` - Application settings (key/value)
- `user_settings` - User-specific settings
- `role_hierarchy` - Role inheritance (parent/child roles)
- `role_requests` - User role change requests

---

## Testing Guidelines

### Running Tests
```bash
npm test                                    # All tests
npm test tests/routes/auth.test.js         # Auth tests
npm test tests/routes/leagues.test.js      # League tests
```

### Test Database Setup

**One-time setup:**
```bash
# 1. Create .env.test file (see .env.test.example)
cp .env.test.example .env.test
# Edit .env.test with your test database credentials

# 2. Create test database
mysql -h $TEST_DB_HOST -P $TEST_DB_PORT -u root -p -e "
CREATE DATABASE IF NOT EXISTS escalation_league_test;
GRANT ALL PRIVILEGES ON escalation_league_test.* TO '$TEST_DB_USER'@'%';
FLUSH PRIVILEGES;
"

# 3. Run migrations
NODE_ENV=test npx knex migrate:latest --env test
```

**Reset test database:**
```bash
# Load environment variables
source .env.test

# Clear migrations and re-run
mysql -h $TEST_DB_HOST -P $TEST_DB_PORT -u $TEST_DB_USER -p$TEST_DB_PASSWORD $TEST_DB_NAME -e "
DELETE FROM knex_migrations;
DELETE FROM knex_migrations_lock;
"
NODE_ENV=test npx knex migrate:latest --env test
```

### Test Helper Functions

**Location:** `tests/helpers/`

#### db-helper.js
- `clearDatabase()` - Clears all test data (respects FK constraints)
- `createTestUser(overrides)` - Creates test user with bcrypt password

#### auth-helper.js
- `getAuthToken(userOverrides)` - Creates user and returns JWT token
- `getAuthTokenWithRole(roleName, permissions)` - Creates user with role/permissions
  - Default roles: 'admin', 'member', 'moderator'
  - Admin permissions: league_create, league_update, league_manage_requests, etc.

#### league-helper.js
- `createTestLeague(overrides)` - Creates test league
- `addUserToLeague(userId, leagueId, overrides)` - Enrolls user in league
- `createSignupRequest(userId, leagueId, status)` - Creates signup request

#### rbac-helper.js
- `createPermission(name, description)` - Creates permission if not exists
- `assignPermissionToRole(roleId, permissionName)` - Links permission to role
- `createRoleWithPermissions(roleName, permissions)` - Creates role with all permissions

### Common Test Patterns

**Authenticated request:**
```javascript
const { token } = await getAuthToken();
const res = await request(app)
    .get('/api/endpoint')
    .set('Authorization', `Bearer ${token}`);
```

**Admin request with permissions:**
```javascript
const { token } = await getAuthTokenWithRole('admin');
const res = await request(app)
    .post('/api/leagues')
    .set('Authorization', `Bearer ${token}`)
    .send({ /* data */ });
```

**Test data setup:**
```javascript
const leagueId = await createTestLeague({ name: 'Test League' });
const { userId } = await getAuthToken();
await addUserToLeague(userId, leagueId);
```

---

## API Authentication

**All API routes require JWT authentication** via `Authorization: Bearer <token>` header.

**JWT Token Generation:**
```javascript
const jwt = require('jsonwebtoken');
const token = jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'test-secret-key',
    { expiresIn: '24h' }
);
```

**RBAC:** Routes check permissions via middleware using `role_permissions` table.

---

## Common Permissions

- `league_create` - Create new leagues
- `league_update` - Update league details
- `league_delete` - Delete leagues
- `league_manage_requests` - Approve/reject signup requests
- `league_view` - View league details
- `game_create` - Create game pods
- `game_update` - Update game results
- `game_delete` - Delete games
- `user_manage` - Manage users

---

## MySQL Tinyint Booleans

MySQL returns `tinyint(1)` as `0` or `1` (not true/false).

**In tests, expect:**
```javascript
expect(res.body.is_active).toBe(1);  // Not true
expect(res.body.is_deleted).toBe(0); // Not false
```

---

## TODO: Future Test Coverage

- [ ] Test password validation (complexity, length)
- [ ] Test email format validation
- [ ] Test SQL injection attempts
- [ ] Test rate limiting on failed logins
- [ ] Test banned/inactive user authentication
- [ ] Test token expiration
- [ ] Mock OAuth2Client for Google auth tests
- [ ] Test RBAC permission inheritance (role_hierarchy)
- [ ] Test pagination for list endpoints
- [ ] Test league filtering/search
- [ ] Add game pod tests
- [ ] Add deck management tests
- [ ] Add user profile tests
---

## Game Pod Workflow & Rules

### Pod Player Requirements
- **Minimum Players:** 3 unique users
- **Maximum Players:** 4 unique users
- **Creator Limitation:** Creator is automatically added as a player when creating the pod

### Pod Status Flow
```
open → active → pending → complete
```

#### Open Status
- Pod has 1-3 players
- **With 3 players:** Requires manual override button in frontend to move to active
- **With 4th player join:** Automatically moves to active
- Players can join/leave freely

#### Active Status
- Game is in progress
- No new players can join
- Winner must declare their result

#### Pending Status
- Winner has declared their result
- Other players must confirm the results
- Each player confirms individually
- Pod moves to complete when all players have confirmed

#### Complete Status
- All players have confirmed results
- Game is finalized
- Stats are updated in `users` and `user_leagues` tables

### Frontend Override
- Frontend has override button to force 3-player pods from open → active
- This bypasses the "wait for 4th player" rule when needed

### Backend Logic
- Pod creation: Creates pod in 'open' status
- Join pod: Adds player, auto-activates if 4 players
- Log result: Winner declares, moves to 'pending'
- Confirm result: Players confirm, moves to 'complete' when all done

