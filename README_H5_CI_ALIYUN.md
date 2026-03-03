# H5 + CI + Aliyun Deployment

## Current status
- H5 build script: `scripts/build-h5.js`
- Build command: `npm run build:h5`
- GitHub Actions workflow: `.github/workflows/h5-deploy-aliyun.yml`
- Server bootstrap script: `deploy/server/bootstrap_nginx.sh`
- Nginx site config template: `deploy/server/nginx.turtle-talents.conf`
- One-time bootstrap with CI key: `deploy/server/first_bootstrap_with_ci_key.sh`

## Local build
```bash
npm run build:h5
```

Build output:
- `dist/index.html`
- `dist/build-meta.json`

## Workflow defaults (already set)
The CI now uses these defaults if Secrets are empty:
- `ALIYUN_HOST=118.178.143.33`
- `ALIYUN_PORT=22`
- `ALIYUN_USER=root`
- `ALIYUN_TARGET_DIR=/var/www/turtle-talents`

## Required GitHub Secret
Only this one is required now:
- `ALIYUN_SSH_KEY`: private key content used by GitHub Actions to SSH into server.

Optional override Secrets:
- `ALIYUN_HOST`
- `ALIYUN_PORT`
- `ALIYUN_USER`
- `ALIYUN_TARGET_DIR`
- `ALIYUN_POST_DEPLOY_CMD` (for example `sudo systemctl reload nginx`)

## One-time server bootstrap
Run on your Aliyun server (Ubuntu):
```bash
bash deploy/server/bootstrap_nginx.sh
```

After bootstrap, website root is:
- `/var/www/turtle-talents/current`

If you want fully zero-config CI auth, run this script once instead:
```bash
bash deploy/server/first_bootstrap_with_ci_key.sh
```
It installs nginx and also injects CI public key into `/root/.ssh/authorized_keys`.

## Permissions you need to provide
1. GitHub repo admin access to set Actions secret `ALIYUN_SSH_KEY`.
2. A server SSH account that accepts the matching public key (default workflow uses `root`).
