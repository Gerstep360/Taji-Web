#!/usr/bin/env bash
# Ubuntu 24.04 / Debian 12+. Versioned static releases, same-origin API proxy.
set -Eeuo pipefail
umask 022
ROOT=/opt/taji-web
CONFIG=/etc/taji-web/web.env
SITE=/etc/nginx/sites-available/taji-web
MODE=${1:-help}
fail() { echo "ERROR: $*" >&2; exit 1; }
[[ $EUID == 0 ]] || fail 'Ejecutar con sudo.'
[[ $MODE == install || $MODE == update ]] || {
  echo 'sudo bash deploy/vps.sh install web.ejemplo.com correo@ejemplo.com https://api.ejemplo.com'
  echo 'sudo taji-web-deploy update'
  exit 2
}
exec 9>/var/lock/taji-web-deploy.lock
flock -n 9 || fail 'Hay otro despliegue web en curso.'

validate() {
  [[ $DOMAIN =~ ^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$ && $DOMAIN == *.* ]] || fail 'Dominio inválido.'
  [[ $EMAIL =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+$ ]] || fail 'Email inválido.'
  [[ $BACKEND_ORIGIN =~ ^https://[a-zA-Z0-9.-]+(:[0-9]+)?$ || $BACKEND_ORIGIN =~ ^http://(127\.0\.0\.1|localhost):[0-9]+$ ]] || fail 'Backend: origen HTTPS sin ruta, o HTTP local con puerto.'
  [[ $BACKEND_ORIGIN != "https://$DOMAIN" ]] || fail 'El proxy no puede apuntar al mismo dominio web.'
}

if [[ $MODE == install ]]; then
  DOMAIN=${2:?Falta dominio}; EMAIL=${3:?Falta email}; BACKEND_ORIGIN=${4:?Falta origen del backend}
  validate
  . /etc/os-release
  [[ $ID == ubuntu || $ID == debian ]] || fail 'Se necesita Ubuntu o Debian.'
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y nginx git curl ca-certificates xz-utils certbot build-essential python3
  id taji-web &>/dev/null || useradd --system --create-home --home-dir /var/lib/taji-web --shell /usr/sbin/nologin taji-web
  install -d -m 0755 "$ROOT" "$ROOT/releases" "$ROOT/runtimes" /etc/taji-web /var/www/taji-web-acme
  if [[ ! -f $CONFIG ]]; then
    printf 'DOMAIN=%s\nEMAIL=%s\nBACKEND_ORIGIN=%s\n' "$DOMAIN" "$EMAIL" "$BACKEND_ORIGIN" >"$CONFIG"
    chmod 0600 "$CONFIG"
  fi
  [[ -d $ROOT/repository.git ]] || git clone --bare https://github.com/Gerstep360/Taji-Web.git "$ROOT/repository.git"
  systemctl enable --now nginx
fi
[[ -f $CONFIG ]] || fail 'Primero ejecutar install.'
# Root-owned configuration; do not put credentials in the public Angular config.
[[ $(stat -c %u "$CONFIG") == 0 ]] || fail 'web.env debe pertenecer a root.'
[[ -z $(find "$CONFIG" -perm /022 -print) ]] || fail 'web.env no debe permitir escritura a grupo/otros.'
. "$CONFIG"
validate

if [[ ! -f $SITE ]]; then
  cat >"$SITE" <<NGINX
server {
    listen 80;
    server_name $DOMAIN;
    location /.well-known/acme-challenge/ { root /var/www/taji-web-acme; }
    location / { return 503; }
}
NGINX
  ln -s "$SITE" /etc/nginx/sites-enabled/taji-web
  nginx -t
  systemctl reload nginx
fi
if [[ ! -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]]; then
  certbot certonly --non-interactive --agree-tos --email "$EMAIL" --webroot -w /var/www/taji-web-acme -d "$DOMAIN"
fi
install -d /etc/letsencrypt/renewal-hooks/deploy
printf '#!/bin/sh\nnginx -t && systemctl reload nginx\n' >/etc/letsencrypt/renewal-hooks/deploy/taji-web-nginx
chmod 0755 /etc/letsencrypt/renewal-hooks/deploy/taji-web-nginx

health() {
  curl --fail --silent --show-error --max-time 20 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/iniciar-sesion" >/dev/null &&
  curl --fail --silent --show-error --max-time 20 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/api/v1/health/" >/dev/null &&
  curl --fail --silent --show-error --max-time 20 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/config/app-config.json" |
    python3 -c 'import json,sys; assert json.load(sys.stdin)["apiBaseUrl"] == sys.argv[1]' "https://$DOMAIN/api/v1"
}

git --git-dir="$ROOT/repository.git" fetch origin main
SHA=$(git --git-dir="$ROOT/repository.git" rev-parse FETCH_HEAD)
CONFIG_SHA=$(sha256sum "$CONFIG" | cut -d' ' -f1)
if [[ -f $ROOT/current/.release-sha && $(cat "$ROOT/current/.release-sha") == "$SHA:$CONFIG_SHA" ]] && health; then
  echo 'Sin cambios; web y API saludables.'
  exit 0
fi
RELEASE=$(mktemp -d "$ROOT/releases/${SHA:0:12}-XXXXXX")
chmod 0755 "$RELEASE"
git --git-dir="$ROOT/repository.git" archive "$SHA" | tar -x -C "$RELEASE"
VERSION=$(tr -d '\r\n' <"$RELEASE/.node-version")
[[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail 'Versión Node inválida.'
case $(uname -m) in x86_64) ARCH=x64;; aarch64) ARCH=arm64;; *) fail 'Arquitectura no soportada.';; esac
NODE_DIR="$ROOT/runtimes/node-v$VERSION-linux-$ARCH"
if [[ ! -x $NODE_DIR/bin/node ]]; then
  DOWNLOAD=$(mktemp -d)
  ARCHIVE="node-v$VERSION-linux-$ARCH.tar.xz"
  curl -fSL --retry 3 "https://nodejs.org/dist/v$VERSION/$ARCHIVE" -o "$DOWNLOAD/$ARCHIVE"
  curl -fSL --retry 3 "https://nodejs.org/dist/v$VERSION/SHASUMS256.txt" -o "$DOWNLOAD/SHASUMS256.txt"
  (cd "$DOWNLOAD"; grep "  $ARCHIVE\$" SHASUMS256.txt | sha256sum --check --strict -)
  tar -xJf "$DOWNLOAD/$ARCHIVE" -C "$ROOT/runtimes"
fi
chown -R taji-web:taji-web "$RELEASE"
runuser -u taji-web -- env PATH="$NODE_DIR/bin:/usr/bin:/bin" HOME=/var/lib/taji-web \
  TAJI_API_BASE_URL="https://$DOMAIN/api/v1" TAJI_API_TIMEOUT_MS=12000 \
  bash -c 'cd "$1"; npm ci --include=dev --no-audit --no-fund && npm run build' _ "$RELEASE"
[[ -s $RELEASE/dist/taji-web/browser/index.html ]] || fail 'No se generó el sitio Angular.'
bash -n "$RELEASE/deploy/vps.sh"
printf '%s:%s\n' "$SHA" "$CONFIG_SHA" >"$RELEASE/.release-sha"
# Nginx serves only the build. Source, npm dependencies and scripts stay outside its root.
chown -R root:root "$RELEASE"
chmod -R a+rX "$RELEASE/dist"
PREVIOUS=''
if [[ -L $ROOT/current ]]; then PREVIOUS=$(readlink -f "$ROOT/current"); fi
cp -a "$SITE" "$RELEASE/.previous-nginx"
SWITCHED=0
rollback() {
  status=$?
  trap - ERR
  if [[ $SWITCHED == 1 ]]; then
    cp -a "$RELEASE/.previous-nginx" "$SITE"
    if [[ -n $PREVIOUS ]]; then
      ln -sfn "$PREVIOUS" "$ROOT/current.next"
      mv -Tf "$ROOT/current.next" "$ROOT/current"
    else
      # Only this installer-owned symlink, never a release directory.
      [[ -L $ROOT/current ]] && unlink "$ROOT/current"
    fi
    nginx -t && systemctl reload nginx
    echo 'Despliegue rechazado; se restauró la configuración anterior.' >&2
  fi
  exit "$status"
}
trap rollback ERR
UPSTREAM=${BACKEND_ORIGIN#*://}
UPSTREAM_HOST=${UPSTREAM%%:*}
SWITCHED=1
cat >"$SITE" <<NGINX
server {
    listen 80;
    server_name $DOMAIN;
    location /.well-known/acme-challenge/ { root /var/www/taji-web-acme; }
    location / { return 301 https://\$host\$request_uri; }
}
server {
    listen 443 ssl;
    server_name $DOMAIN;
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    root $ROOT/current/dist/taji-web/browser;
    index index.html;
    client_max_body_size 10m;
    add_header X-Content-Type-Options nosniff always;
    location ^~ /api/ {
        proxy_pass $BACKEND_ORIGIN;
        proxy_set_header Host $UPSTREAM;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_ssl_server_name on;
        proxy_ssl_name $UPSTREAM_HOST;
        proxy_ssl_verify on;
        proxy_ssl_trusted_certificate /etc/ssl/certs/ca-certificates.crt;
        proxy_connect_timeout 10s;
        proxy_read_timeout 60s;
    }
    location = /config/app-config.json { add_header Cache-Control "no-store"; try_files \$uri =404; }
    location = /index.html { add_header Cache-Control "no-store"; }
    location ~ /\. { deny all; }
    location ~* \.(js|css|woff2?|png|jpg|jpeg|svg|ico|webp)$ {
        try_files \$uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    location / { try_files \$uri \$uri/ /index.html; }
}
NGINX
ln -sfn "$RELEASE" "$ROOT/current.next"
mv -Tf "$ROOT/current.next" "$ROOT/current"
nginx -t
systemctl reload nginx
health
install -m 0755 "$RELEASE/deploy/vps.sh" /usr/local/sbin/taji-web-deploy
trap - ERR
echo "Web publicada: https://$DOMAIN — commit $SHA"
