# Claude Code Guidelines

## Branch Requirements

Before making any code changes, verify you are on an appropriate branch:

### Allowed Branch Patterns

1. **Feature branches**: `feature/<description>-issue-<number>`
   - For new features linked to a GitHub issue
   - Example: `feature/discord-integration-issue-45`

2. **Bugfix branches**: `bugfix/<description>-issue-<number>`
   - For bug fixes linked to a GitHub issue
   - Example: `bugfix/websocket-mobile-issue-52`

3. **Hotfix branches**: `hotfix/<description>`
   - For urgent one-off fixes that don't have an associated issue
   - Example: `hotfix/websocket-early-league-fetch`

### Validation

Before making changes, check the current branch:
```bash
git rev-parse --abbrev-ref HEAD
```

If on `main` or an unrelated branch, either:
1. Create a new branch following the patterns above
2. Ask the user which branch to use

### Branch Creation Examples

```bash
# For a GitHub issue
git checkout -b feature/user-auth-issue-49

# For a hotfix without an issue
git checkout -b hotfix/fix-mobile-websocket
```

## Deployment Rules

- **Production deployments** (`make deploy-prod`) must be from the `main` branch
- **Development deployments** (`make deploy-dev`) can be from any branch
- Always merge feature/bugfix branches to `main` via PR before deploying to production

## Commit Guidelines

- Reference the GitHub issue number in commits when applicable: `(#45)`
- Use conventional commit style: `Add`, `Fix`, `Update`, `Remove`, etc.
- Include `Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>` in commits
