#!/usr/bin/env bash
set -euo pipefail

SITE_ROOT="${1:-/var/www/turtle-talents}"
NGINX_SITE="/etc/nginx/sites-available/turtle-talents.conf"
NGINX_LINK="/etc/nginx/sites-enabled/turtle-talents.conf"

echo "[1/6] Install nginx + rsync"
sudo apt-get update -y
sudo apt-get install -y nginx rsync

echo "[2/6] Create site directories"
sudo mkdir -p "${SITE_ROOT}/current"
sudo chown -R "$USER":"$USER" "${SITE_ROOT}"

echo "[3/6] Install nginx site config"
TMP_CONF="$(mktemp)"
cat > "${TMP_CONF}" <<'EOF'
server {
    listen 80;
    server_name _;

    root /var/www/turtle-talents/current;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
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

# Replace default root path if caller passed a custom SITE_ROOT.
sed -i "s#/var/www/turtle-talents#${SITE_ROOT}#g" "${TMP_CONF}"
sudo mv "${TMP_CONF}" "${NGINX_SITE}"
sudo ln -sf "${NGINX_SITE}" "${NGINX_LINK}"
sudo rm -f /etc/nginx/sites-enabled/default

echo "[4/6] Validate nginx config"
sudo nginx -t

echo "[5/6] Restart nginx"
sudo systemctl enable nginx
sudo systemctl restart nginx

echo "[6/6] Done"
echo "Site root: ${SITE_ROOT}/current"
echo "Now set GitHub secret ALIYUN_TARGET_DIR=${SITE_ROOT}"
