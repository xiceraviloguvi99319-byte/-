#!/usr/bin/env bash
set -euo pipefail

# One-time bootstrap script for Aliyun Ubuntu server.
# 1) Install CI public key to root authorized_keys
# 2) Install and configure nginx
# 3) Prepare H5 deploy target directory

SITE_ROOT="${1:-/var/www/turtle-talents}"
CI_PUBKEY='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBxQmSEg0o86ri0dg4Q0xbji/7d0L9GBMQ94hSGaybld xicer@ci-deploy'

echo "[1/6] Install CI public key for root"
mkdir -p /root/.ssh
touch /root/.ssh/authorized_keys
chmod 700 /root/.ssh
chmod 600 /root/.ssh/authorized_keys
if ! grep -Fq "$CI_PUBKEY" /root/.ssh/authorized_keys; then
  echo "$CI_PUBKEY" >> /root/.ssh/authorized_keys
fi

echo "[2/6] Install nginx + rsync"
apt-get update -y
apt-get install -y nginx rsync

echo "[3/6] Create site directories"
mkdir -p "${SITE_ROOT}/current"

echo "[4/6] Install nginx site config"
cat >/etc/nginx/sites-available/turtle-talents.conf <<EOF
server {
    listen 80;
    server_name _;

    root ${SITE_ROOT}/current;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /icons/ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
    }

    location = /build-meta.json {
        expires -1;
        add_header Cache-Control "no-cache";
    }
}
EOF

ln -sf /etc/nginx/sites-available/turtle-talents.conf /etc/nginx/sites-enabled/turtle-talents.conf
rm -f /etc/nginx/sites-enabled/default

echo "[5/6] Validate and restart nginx"
nginx -t
systemctl enable nginx
systemctl restart nginx

echo "[6/6] Bootstrap done"
echo "Site root: ${SITE_ROOT}/current"
