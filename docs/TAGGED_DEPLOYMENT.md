# Tagged Deployment & Rollback

## Overview

This deployment system automatically tags Docker images before each deployment, enabling quick rollbacks to any previous version.

## How It Works

1. **Build & Tag**: Each deployment builds new images and tags them with timestamp (e.g., `20260109-143022`)
2. **Deploy**: Deploys the newly built images to the target environment
3. **Verify**: Runs health checks and smoke tests
4. **Track**: Saves the current tag for easy rollback reference

## Usage

### Deploy

```bash
# Deploy to production (auto-generates timestamp tag)
make deploy-prod

# Deploy to development
make deploy-dev

# Deploy with custom tag
./scripts/deploy-tagged.sh prod my-feature-v1
```

### Rollback

```bash
# List available tags
make rollback-prod    # Shows last 10 tags

# Rollback to specific tag
./scripts/rollback.sh prod 20260109-143022

# Same for dev
make rollback-dev
./scripts/rollback.sh dev 20260109-143022
```

## What Gets Tagged

- Backend image: `compose-backend-{env}:{tag}`
- Frontend image: `compose-frontend-{env}:{tag}`
- Both images also get `:latest` tag for current version

## Benefits

- **Fast Rollback**: Restart containers with previous images in ~30 seconds
- **No Rebuild**: Rollback uses existing images, no rebuild needed
- **Version History**: Keep last N deployments for quick recovery
- **Automatic Verification**: Smoke tests run after deploy and rollback

## Deployment Process

```
generate-build-info.sh
    ↓
Build images
    ↓
Tag with timestamp
    ↓
Deploy containers
    ↓
Wait 20s for health
    ↓
Run smoke tests
    ↓
Save current tag
```

## Rollback Process

```
List available tags
    ↓
Select tag to rollback to
    ↓
Tag rollback images as :latest
    ↓
Restart containers
    ↓
Wait 15s for health
    ↓
Run smoke tests
    ↓
Update current tag
```

## Image Cleanup

To prevent unlimited image growth:

```bash
# Keep only last 5 tags for each environment
docker images compose-backend-prod --format "{{.Tag}} {{.ID}}" | \
    grep -v latest | tail -n +6 | awk '{print $2}' | \
    xargs -r docker rmi

docker images compose-frontend-prod --format "{{.Tag}} {{.ID}}" | \
    grep -v latest | tail -n +6 | awk '{print $2}' | \
    xargs -r docker rmi
```

## Current Tag Tracking

The active tag for each environment is stored in:
- Production: `/tmp/escalation-league-prod-current-tag`
- Development: `/tmp/escalation-league-dev-current-tag`

## Related Issue

See [Issue #25](https://github.com/garretthaima/escalation-league/issues/25) for implementation details.
