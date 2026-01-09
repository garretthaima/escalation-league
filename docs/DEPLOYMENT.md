# Deployment Guide

## Build Versioning

Every deployment automatically generates a build number visible in the footer:
- **Build Number**: `YYYYMMDD-HHMMSS` format
- **Git Commit**: Short hash of current commit
- **Branch**: Current git branch
- **Build Time**: UTC timestamp

## Current Deployment Flow

```bash
# Deploy to production
make deploy-prod

# Deploy to development
make deploy-dev
```

## Safer Deployment Workflow (Recommended)

### 1. Test in Development First
```bash
# Deploy to dev and test
make deploy-dev

# Visit https://dev.escalation-league.com
# Test all features, check build number in footer
```

### 2. Tag the Release
```bash
# Once dev looks good, tag it
git tag -a v1.0.X -m "Description of changes"
git push origin v1.0.X
```

### 3. Deploy to Production
```bash
# Deploy to prod
make deploy-prod

# Visit https://escalation-league.com
# Verify build number matches your expectation
```

### 4. Rollback if Needed
```bash
# If production breaks, rollback to previous commit
git checkout v1.0.PREVIOUS
make deploy-prod

# Or manually restart old containers:
docker ps -a  # Find old container ID
docker start <container-id>
```

## Build Info Location

- **File**: `escalation-league-frontend/public/build-info.json`
- **Visible**: Footer of every page
- **API**: Accessible at `https://your-domain.com/build-info.json`

## Future Improvements

Deployment improvements are now tracked in GitHub Issues:
- #24 - Add Docker health checks to production services
- #25 - Implement blue-green deployment strategy
- #26 - Add automated smoke tests post-deployment
- #27 - Set up monitoring and alerting for deployments
- #28 - Create staging environment separate from dev

See parent issue: #23
