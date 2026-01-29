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

## Pull Request Guidelines

- Use GitHub keywords in PR descriptions to auto-close issues:
  - `Closes #123` or `Fixes #123` - closes the issue when PR is merged
  - Place the keyword in the PR body, not the title
- PR title should be descriptive: `Add frontend test coverage (#135)`
- Include a summary of changes and test plan in the PR body

## Testing Requirements

### Coverage Standards
- **Target: 80%+ coverage** for all new and modified code
- Run `npm test -- --coverage --watchAll=false` to check coverage
- Focus on statements and branches coverage

### Frontend Testing (Jest + React Testing Library)
- Test files go in `__tests__` folders (e.g., `src/components/Shared/__tests__/`)
- Name test files `ComponentName.test.js`
- Test patterns:
  - Rendering: component mounts without errors
  - Props: different prop combinations work correctly
  - User interactions: clicks, inputs, form submissions
  - Edge cases: empty states, loading states, error states
  - Conditional rendering: permission-based UI, logged in/out states

### Backend Testing (Jest)
- Test files go in the top-level `tests/` folder, mirroring source structure
  - Example: `controllers/userController.js` → `tests/controllers/userController.test.js`
- Run with: `TEST_DB_HOST=10.10.60.5 TEST_DB_PORT=3308 npm test -- --coverage --watchAll=false`
- Mock external dependencies (database, APIs)
- Test patterns:
  - Happy path: expected inputs produce expected outputs
  - Error handling: invalid inputs return appropriate errors
  - Edge cases: boundary conditions, null/undefined handling

### When Writing New Code
1. Write the component/function
2. Create corresponding test file in `__tests__` folder
3. Write tests covering main functionality
4. Run coverage to verify 80%+ on new code

### When Modifying Existing Code
1. Check if tests exist for the file
2. If no tests exist, create them before modifying
3. Update tests to cover your changes
4. Ensure coverage doesn't decrease
