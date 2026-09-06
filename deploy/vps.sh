#!/usr/bin/env bash
# Ubuntu 24.04 / Debian 12+. Full Production Zero-Downtime Deployment with Clean TUI for Taji Frontend.
set -Eeuo pipefail
umask 022

ROOT=/opt/taji-web
CONFIG=/etc/taji-web/web.env
SITE=/etc/nginx/sites-available/taji-web
LOCK_FILE=/var/lock/taji-web-deploy.lock

# --- ANSI Colors & Graphical Effects ---
CYAN='\033[0;36m'
BRIGHT_CYAN='\033[1;36m'
MAGENTA='\033[0;35m'
BRIGHT_MAGENTA='\033[1;35m'
YELLOW='\033[1;33m'
BRIGHT_YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BRIGHT_GREEN='\033[1;32m'
RED='\033[0;31m'
WHITE='\033[1;37m'
BRIGHT_WHITE='\033[1;37m'
GRAY='\033[0;90m'
RESET='\033[0m'

animated_banner() {
    clear
    echo -e "${BRIGHT_CYAN}+------------------------------------------------------------------------+${RESET}"
    echo -e "${BRIGHT_CYAN}|   ████████╗ █████╗  ██████╗ ██╗                                        |${RESET}"
    echo -e "${BRIGHT_CYAN}|   ╚══██╔══╝██╔══██╗   ██║   ██║   ${BRIGHT_WHITE}S I S T E M A                        ${BRIGHT_CYAN}|${RESET}"
    echo -e "${YELLOW}|      ██║   ███████║   ██║   ██║   ${BRIGHT_YELLOW}C O N D O M I N I O S                ${YELLOW}|${RESET}"
    echo -e "${MAGENTA}|      ██║   ██║  ██║██   ██║ ██║                                        |${RESET}"
    echo -e "${BRIGHT_MAGENTA}|      ██║   ██║  ██║╚█████╔╝ ██║   ${BRIGHT_GREEN}[*] DEPLOYMENT VPS ENGINE (ANGULAR)  ${BRIGHT_MAGENTA}|${RESET}"
    echo -e "${BRIGHT_MAGENTA}|      ╚═╝   ╚═╝  ╚═╝ ╚════╝  ╚═╝                                        |${RESET}"
    echo -e "${BRIGHT_CYAN}+------------------------------------------------------------------------+${RESET}"
    echo -e "${GRAY}        =========================================================${RESET}\n"
    sleep 0.1
}

animated_progress_bar() {
    local pid=$1
    local msg=$2
    local step=0
    local width=30
    local spin=('|' '/' '-' '\')
    
    while kill -0 "$pid" 2>/dev/null; do
        local frame=${spin[$((step % 4))]}
        local filled_len=$(( (step % width) + 1 ))
        local fill=""
        local empty=""
        
        for ((i=0; i<filled_len; i++)); do fill="${fill}#"; done
        for ((i=filled_len; i<width; i++)); do empty="${empty}-"; done
        
        printf "\r ${BRIGHT_YELLOW}[%s]${RESET} ${CYAN}%-45s${RESET} ${BRIGHT_GREEN}[%s%s]${RESET}" "$frame" "$msg" "$fill" "$empty"
        step=$((step + 1))
        sleep 0.1
    done
    wait "$pid"
    local exit_code=$?
    
    local full_bar=""
    for ((i=0; i<width; i++)); do full_bar="${full_bar}#"; done
    
    if [ $exit_code -eq 0 ]; then
        printf "\r ${BRIGHT_GREEN}[OK] %-45s [%s] 100%% COMPLETADO${RESET}\n" "$msg" "$full_bar"
    else
        printf "\r ${RED}[ERROR] %-45s [FALLO EN EL PROCESO]${RESET}\n" "$msg"
        return $exit_code
    fi
}

fail() { echo -e "${RED}ERROR: $*${RESET}" >&2; exit 1; }
[[ $EUID -eq 0 ]] || fail 'Este script debe ejecutarse con sudo.'

validate() {
  [[ $DOMAIN =~ ^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$ || $DOMAIN =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail 'Dominio o IP invalida.'
  [[ $EMAIL =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+$ ]] || fail 'Email invalido.'
  [[ $BACKEND_ORIGIN =~ ^https?://[a-zA-Z0-9.-]+(:[0-9]+)?(/.*)?$ || $BACKEND_ORIGIN =~ ^http://(127\.0\.0\.1|localhost):[0-9]+(/.*)?$ ]] || fail 'Backend: origen HTTP/HTTPS invalido.'
}

check_web_health() {
    if curl --fail --silent --connect-timeout 3 "http://127.0.0.1/taji/" >/dev/null 2>&1; then
        return 0
    fi
    if curl --fail --silent --connect-timeout 3 "http://localhost/taji/" >/dev/null 2>&1; then
        return 0
    fi
    return 1
}

# --- Menú Interactivo ---
MODE=${1:-""}

if [[ -z "$MODE" ]]; then
    animated_banner
    echo -e "${BRIGHT_YELLOW}+------------------------------------------------------------------------+${RESET}"
    echo -e "${BRIGHT_YELLOW}|                      MENU INTERACTIVO DE OPERACIONES                   |${RESET}"
    echo -e "${BRIGHT_YELLOW}+------------------------------------------------------------------------+${RESET}"
    echo -e "|  ${BRIGHT_CYAN}[1]${RESET}  ${WHITE}[+] Instalacion Completa Inicial (Nginx + SSL + Node + Build)${RESET}    |"
    echo -e "|  ${BRIGHT_CYAN}[2]${RESET}  ${WHITE}[*] Actualizar Version (Zero-Downtime Re-build + Atomic Symlink)${RESET} |"
    echo -e "|  ${BRIGHT_CYAN}[3]${RESET}  ${WHITE}[?] Verificar Estado de Salud Web (Health Check)${RESET}                 |"
    echo -e "|  ${BRIGHT_CYAN}[4]${RESET}  ${WHITE}[!] Reiniciar Servicio Nginx Web${RESET}                                 |"
    echo -e "|  ${BRIGHT_CYAN}[5]${RESET}  ${WHITE}[x] Salir${RESET}                                                         |"
    echo -e "${BRIGHT_YELLOW}+------------------------------------------------------------------------+${RESET}\n"
    
    read -p " Selecciona una opcion [1-5]: " CHOICE
    case "$CHOICE" in
        1) MODE="install" ;;
        2) MODE="update" ;;
        3) MODE="health" ;;
        4) MODE="restart" ;;
        5) echo -e "${YELLOW}Operacion finalizada.${RESET}"; exit 0 ;;
        *) fail "Opcion invalida." ;;
    esac
fi

if [[ $MODE == "restart" ]]; then
    echo -e "${YELLOW}Reiniciando Nginx...${RESET}"
    systemctl restart nginx
    echo -e "${BRIGHT_GREEN}[OK] Nginx reiniciado correctamente.${RESET}"
    MODE="health"
fi

if [[ $MODE == "health" ]]; then
    [[ -f $CONFIG ]] || fail "No existe configuracion previa en $CONFIG. Ejecuta la opcion [1] primero."
    . "$CONFIG"
    echo -e "${YELLOW}Comprobando estado de salud de la aplicacion Web...${RESET}"
    
    if check_web_health; then
        echo -e "${BRIGHT_GREEN}[OK] Frontend Web responde correctamente (HTTP 200 OK)${RESET}"
        exit 0
    else
        echo -e "${RED}[ERROR] La aplicacion Web en http://$DOMAIN/taji/ no responde correctamente.${RESET}"
        echo -e "${YELLOW}--- Ultimos logs de error de Nginx ---${RESET}"
        tail -n 25 /var/log/nginx/error.log || true
        fail "La verificacion Web fallo."
    fi
fi

if [[ $MODE == "install" && $# -lt 2 ]]; then
    animated_banner
    DETECTED_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
    [[ -z "$DETECTED_IP" ]] && DETECTED_IP="127.0.0.1"

    echo -e " ${GRAY}+----------------------------------------------------------------+${RESET}"
    echo -e " ${GRAY}|${RESET} Detector de Red: IP Publica / Servidor = ${BRIGHT_CYAN}$DETECTED_IP${RESET}"
    echo -e " ${GRAY}+----------------------------------------------------------------+${RESET}\n"
    
    read -p " Dominio o IP publica del VPS [$DETECTED_IP]: " DOMAIN
    DOMAIN=${DOMAIN:-$DETECTED_IP}

    read -p " Correo para administracion/SSL [admin@$DOMAIN]: " EMAIL
    EMAIL=${EMAIL:-"admin@$DOMAIN"}

    read -p " URL Origen Backend API [http://$DOMAIN:8000/api/v1]: " BACKEND_ORIGIN
    BACKEND_ORIGIN=${BACKEND_ORIGIN:-"http://$DOMAIN:8000/api/v1"}
    
    SUBPATH="/taji"
else
    if [[ $MODE == "install" ]]; then
        DOMAIN=${2:?Falta dominio}
        EMAIL=${3:?Falta email}
        BACKEND_ORIGIN=${4:?Falta origen backend}
        SUBPATH="/taji"
    fi
fi

exec 9>"$LOCK_FILE"
flock -n 9 || fail 'Hay otro despliegue web en curso.'

if [[ $MODE == "install" ]]; then
    validate
    . /etc/os-release
    [[ $ID == ubuntu || $ID == debian ]] || fail 'Se necesita Ubuntu o Debian.'
    export DEBIAN_FRONTEND=noninteractive

    (apt-get update -qq && apt-get install -y -qq nginx git curl ca-certificates xz-utils certbot build-essential python3 >/dev/null 2>&1) &
    animated_progress_bar $! "Instalando dependencias de sistema (Nginx, Git, Node, Certbot)"

    id taji-web &>/dev/null || useradd --system --create-home --home-dir /var/lib/taji-web --shell /usr/sbin/nologin taji-web
    install -d -m 0755 "$ROOT" "$ROOT/releases" "$ROOT/runtimes" /etc/taji-web /var/www/taji-web-acme
    chmod 0755 "$ROOT" "$ROOT/releases"

    if [[ ! -f $CONFIG ]]; then
        printf 'DOMAIN=%s\nEMAIL=%s\nBACKEND_ORIGIN=%s\nSUBPATH=%s\n' "$DOMAIN" "$EMAIL" "$BACKEND_ORIGIN" "$SUBPATH" >"$CONFIG"
        chmod 0600 "$CONFIG"
    fi

    [[ -d $ROOT/repository.git ]] || (git clone --bare https://github.com/Gerstep360/Taji-Web.git "$ROOT/repository.git" >/dev/null 2>&1) &
    animated_progress_bar $! "Clonando repositorio bare Git Frontend"
    
    systemctl enable --now nginx >/dev/null 2>&1
fi

[[ -f $CONFIG ]] || fail 'Primero ejecutar opción [1] install.'
. "$CONFIG"
validate

if [[ $DOMAIN =~ [a-zA-Z] && $DOMAIN == *.* && ! $DOMAIN =~ ^[0-9.]+$ ]]; then
    if [[ ! -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]]; then
        cat >"$SITE" <<NGINX
server {
    listen 80;
    server_name $DOMAIN;
    location /.well-known/acme-challenge/ { root /var/www/taji-web-acme; }
    location / { return 503; }
}
NGINX
        ln -sf "$SITE" /etc/nginx/sites-enabled/taji-web
        nginx -t >/dev/null 2>&1 && systemctl reload nginx
        (certbot certonly --non-interactive --agree-tos --email "$EMAIL" --webroot -w /var/www/taji-web-acme -d "$DOMAIN" >/dev/null 2>&1 || true) &
        animated_progress_bar $! "Generando certificado SSL LetsEncrypt de produccion"
    fi
fi

(git --git-dir="$ROOT/repository.git" fetch origin main >/dev/null 2>&1) &
animated_progress_bar $! "Sincronizando ultima version de Git (fetch origin main)"
SHA=$(git --git-dir="$ROOT/repository.git" rev-parse FETCH_HEAD)

RELEASE=$(mktemp -d "$ROOT/releases/${SHA:0:12}-XXXXXX")
chmod 0755 "$RELEASE"
git --git-dir="$ROOT/repository.git" archive "$SHA" | tar -x -C "$RELEASE"

VERSION=$(tr -d '\r\n' <"$RELEASE/.node-version" 2>/dev/null || echo "24.19.0")
case $(uname -m) in x86_64) ARCH=x64;; aarch64) ARCH=arm64;; *) fail 'Arquitectura no soportada.';; esac
NODE_DIR="$ROOT/runtimes/node-v$VERSION-linux-$ARCH"

if [[ ! -x $NODE_DIR/bin/node ]]; then
    DOWNLOAD=$(mktemp -d)
    ARCHIVE="node-v$VERSION-linux-$ARCH.tar.xz"
    (curl -fSL --retry 3 "https://nodejs.org/dist/v$VERSION/$ARCHIVE" -o "$DOWNLOAD/$ARCHIVE" >/dev/null 2>&1 && \
     tar -xJf "$DOWNLOAD/$ARCHIVE" -C "$ROOT/runtimes" >/dev/null 2>&1) &
    animated_progress_bar $! "Descargando e instalando entorno de ejecucion Node.js v$VERSION"
fi

chown -R taji-web:taji-web "$RELEASE"

(runuser -u taji-web -- env PATH="$NODE_DIR/bin:/usr/bin:/bin" HOME=/var/lib/taji-web \
  TAJI_API_BASE_URL="$BACKEND_ORIGIN" TAJI_API_TIMEOUT_MS=12000 \
  bash -c 'cd "$1"; npm ci --include=dev --no-audit --no-fund >/dev/null 2>&1 && npm run build -- --base-href /taji/ >/dev/null 2>&1' _ "$RELEASE") &
animated_progress_bar $! "Compilando aplicacion Angular produccion (sub-ruta /taji/)"

# Determinar ruta exacta del bundle compilado
if [[ -d "$RELEASE/dist/taji-web/browser" ]]; then
    TARGET_DIR="$RELEASE/dist/taji-web/browser"
elif [[ -d "$RELEASE/dist/taji-web" ]]; then
    TARGET_DIR="$RELEASE/dist/taji-web"
else
    TARGET_DIR="$RELEASE/dist"
fi

[[ -s "$TARGET_DIR/index.html" ]] || fail 'No se genero el archivo index.html del sitio Angular.'

# Crear enlace simbolico interno para mapear /taji/ con el root de Nginx (evita fallo 404 de alias)
ln -snf . "$TARGET_DIR/taji"

# Permisos globales para Nginx (www-data)
chmod -R 0755 "$RELEASE"
chown -R root:root "$RELEASE"
chmod -R a+rX "$RELEASE"

# Configuracion Nginx para servir Angular en /taji/ y redirigir /api/ al Backend
cat >"$SITE" <<NGINX
server {
    listen 80;
    server_name $DOMAIN;

    root $TARGET_DIR;

    location /taji/ {
        try_files \$uri \$uri/ /taji/index.html;
        add_header Cache-Control "no-store";
    }

    location = /taji {
        return 301 http://\$host/taji/;
    }

    location /api/ {
        proxy_pass $BACKEND_ORIGIN;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        return 301 http://\$host/taji/;
    }
}
NGINX

ln -sf "$SITE" /etc/nginx/sites-enabled/taji-web
ln -sfn "$RELEASE" "$ROOT/current.next"
mv -Tf "$ROOT/current.next" "$ROOT/current"

nginx -t >/dev/null 2>&1 && systemctl reload nginx

# Verificación de salud de Nginx tras el despliegue
echo -e "${YELLOW}Verificando servicio Web Nginx...${RESET}"
healthy=0
for i in {1..10}; do
    if check_web_health; then
        healthy=1
        break
    fi
    sleep 1
done

if [[ $healthy -eq 1 ]]; then
    echo -e "\n${BRIGHT_GREEN}+------------------------------------------------------------------------+${RESET}"
    echo -e "${BRIGHT_GREEN}|   INSTALACION Y DESPLIEGUE WEB COMPLETADO CON ZERO-DOWNTIME!           |${RESET}"
    echo -e "${BRIGHT_GREEN}+------------------------------------------------------------------------+${RESET}"
    echo -e " URL Web publicada: ${BRIGHT_CYAN}http://$DOMAIN/taji/${RESET}"
    echo -e " Commit SHA:        ${BRIGHT_MAGENTA}$SHA${RESET}\n"
else
    echo -e "${RED}[ERROR] La aplicacion Web Nginx no respondio correctamente.${RESET}"
    echo -e "${YELLOW}--- Ultimos logs de error de Nginx ---${RESET}"
    tail -n 25 /var/log/nginx/error.log || true
    fail "Fallo la verificacion del servicio Frontend Web."
fi
