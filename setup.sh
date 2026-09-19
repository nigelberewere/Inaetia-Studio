#!/bin/bash
# ==============================================================================
# Inaetia Studios - Self-Hosted Home Media Server Setup Script
# ==============================================================================

set -e

if [ -t 1 ]; then
  RESET='\033[0m'
  BOLD='\033[1m'
  DIM='\033[2m'
  CYAN='\033[38;5;81m'
  BLUE='\033[38;5;45m'
  GREEN='\033[38;5;82m'
  YELLOW='\033[38;5;221m'
  RED='\033[38;5;203m'
  WHITE='\033[97m'
else
  RESET=''
  BOLD=''
  DIM=''
  CYAN=''
  BLUE=''
  GREEN=''
  YELLOW=''
  RED=''
  WHITE=''
fi

banner() {
  printf '\n%b\n' "${CYAN}${BOLD}  ██╗███╗   ██╗ █████╗ ███████╗████████╗██╗ █████╗\n  ██║████╗  ██║██╔══██╗██╔════╝╚══██╔══╝██║██╔══██╗\n  ██║██╔██╗ ██║███████║█████╗     ██║   ██║███████║\n  ██║██║╚██╗██║██╔══██║██╔══╝     ██║   ██║██╔══██║\n  ██║██║ ╚████║██║  ██║███████║   ██║   ██║██║  ██║\n  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝╚═╝  ╚═╝${RESET}"
  printf '%b\n' "${BLUE}  ─────────────────────────────────────────────────────────${RESET}"
  printf '%b\n\n' "${WHITE}${BOLD}  SELF-HOSTED MEDIA SERVER INSTALLATION${RESET}"
}

section() {
  printf '\n%b\n' "${CYAN}${BOLD}  >>> $1${RESET}"
}

info() {
  printf '%b\n' "${DIM}  |${RESET} $1"
}

success() {
  printf '%b\n' "${GREEN}${BOLD}  [ OK ]${RESET} $1"
}

warning() {
  printf '%b\n' "${YELLOW}${BOLD}  [ !! ]${RESET} $1"
}

banner
section "INITIALIZING INAETIA STUDIOS"
info "Preparing your home media server..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  printf '%b\n' "${RED}${BOLD}  [FAIL]${RESET} Run this installer as root: sudo ./setup.sh"
  exit 1
fi

# Detect actual repository root directory
INSTALL_DIR=$(pwd)
info "Project directory: $INSTALL_DIR"

# Wait for dpkg/apt lock frontends to be released
section "CHECKING SYSTEM LOCKS"
info "Waiting for apt and dpkg to become available..."
while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 || fuser /var/lib/apt/lists/lock >/dev/null 2>&1 || fuser /var/lib/dpkg/lock >/dev/null 2>&1; do
  info "Another package process is active. Checking again in 5 seconds..."
  sleep 5
done
success "Package manager is ready"

# Install System Dependencies (ffmpeg, node, npm)
section "VERIFYING SYSTEM DEPENDENCIES"
if ! command -v ffmpeg &> /dev/null; then
  info "Installing ffmpeg..."
  apt-get update && apt-get install -y ffmpeg
else
  success "ffmpeg is already installed"
fi

NODE_UPGRADED=false
if command -v node &> /dev/null; then
  NODE_MAJOR=$(node -v | cut -d'.' -f1 | tr -d 'v')
else
  NODE_MAJOR=0
fi

if [ "$NODE_MAJOR" -lt 20 ]; then
  warning "Node.js v$(node -v 2>/dev/null || echo "0") is below the required version 20"
  info "Installing Node.js 22 LTS via NodeSource..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
  NODE_UPGRADED=true
else
  success "Node.js is ready ($(node -v))"
fi

# Build Project
section "BUILDING PRODUCTION BUNDLE"
info "Installing dependencies and compiling the application..."

# npm should not run as root when setup was invoked through sudo.
SERVICE_USER="${SUDO_USER:-$(logname 2>/dev/null || echo root)}"
if ! id "$SERVICE_USER" >/dev/null 2>&1; then
  SERVICE_USER=root
fi

if [ "$SERVICE_USER" != "root" ]; then
  chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
fi

run_npm() {
  if [ "$SERVICE_USER" = "root" ]; then
    npm "$@"
  else
    runuser -u "$SERVICE_USER" -- env HOME="$(getent passwd "$SERVICE_USER" | cut -d: -f6)" npm "$@"
  fi
}

if [ "$NODE_UPGRADED" = "true" ]; then
  info "Refreshing dependencies for Node.js 22..."
  rm -rf node_modules
fi

if [ -d "node_modules" ]; then
  info "Existing dependencies found. Verifying the build..."
  if run_npm run build &>/dev/null; then
    success "Production bundle is ready"
  else
    warning "Build verification failed. Repairing dependencies..."
    rm -rf node_modules
    run_npm ci --no-audit --no-fund
    run_npm run build
    success "Dependencies repaired and production bundle is ready"
  fi
else
  info "Installing dependencies from the lockfile..."
  if [ -f "package-lock.json" ]; then
    run_npm ci --no-audit --no-fund
  else
    run_npm install --no-audit --no-fund
  fi
  run_npm run build
  success "Dependencies installed and production bundle is ready"
fi

# Determine service running user
section "CONFIGURING MEDIA SERVER"
info "Assigning project permissions to '$SERVICE_USER'..."
chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"

# Load current environment variables if .env exists
VIDEOS_PATH_VAL=""
MUSIC_PATH_VAL=""
PICTURES_PATH_VAL=""
if [ -f "$INSTALL_DIR/.env" ]; then
  # Source .env if formatted cleanly, or parse
  VIDEOS_PATH_VAL=$(grep -E "^VIDEOS_PATH=" "$INSTALL_DIR/.env" | cut -d'=' -f2 | tr -d '"' | tr -d "'")
  MUSIC_PATH_VAL=$(grep -E "^MUSIC_PATH=" "$INSTALL_DIR/.env" | cut -d'=' -f2 | tr -d '"' | tr -d "'")
  PICTURES_PATH_VAL=$(grep -E "^PICTURES_PATH=" "$INSTALL_DIR/.env" | cut -d'=' -f2 | tr -d '"' | tr -d "'")
fi

# Set defaults if not configured
if [ -z "$VIDEOS_PATH_VAL" ]; then VIDEOS_PATH_VAL="$INSTALL_DIR/media/Videos"; fi
if [ -z "$MUSIC_PATH_VAL" ]; then MUSIC_PATH_VAL="$INSTALL_DIR/media/Music"; fi
if [ -z "$PICTURES_PATH_VAL" ]; then PICTURES_PATH_VAL="$INSTALL_DIR/media/Pictures"; fi

mkdir -p "$VIDEOS_PATH_VAL"
mkdir -p "$MUSIC_PATH_VAL"
mkdir -p "$PICTURES_PATH_VAL"
mkdir -p "/tmp/inaetia/thumbs"
chown -R "$SERVICE_USER:$SERVICE_USER" "/tmp/inaetia"

# Create Systemd Service
info "Provisioning systemd service..."
cat <<EOF > /etc/systemd/system/inaetia-studios.service
[Unit]
Description=Inaetia Studios Self-Hosted Media Streaming Server
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
ExecStart=$(which node) dist/server.cjs
Restart=always
Environment=NODE_ENV=production PORT=3000

[Install]
WantedBy=multi-user.target
EOF

# Reload and Enable Service
info "Enabling and starting inaetia-studios.service..."
systemctl daemon-reload
systemctl enable inaetia-studios.service
systemctl restart inaetia-studios.service
success "Systemd service is running"

# Get dynamic Server IP
SERVER_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '
  /src/ {
    for (i = 1; i <= NF; i++) {
      if ($i == "src") {
        print $(i + 1)
        exit
      }
    }
  }
')
if [ -z "$SERVER_IP" ]; then
  SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
fi
if [ -z "$SERVER_IP" ]; then
  SERVER_IP="localhost"
fi

printf '\n%b\n' "${GREEN}${BOLD}  ██████╗  ██████╗ ███╗   ██╗███████╗${RESET}"
printf '%b\n' "${GREEN}${BOLD}  ██╔══██╗██╔═══██╗████╗  ██║██╔════╝${RESET}"
printf '%b\n' "${GREEN}${BOLD}  ██║  ██║██║   ██║██╔██╗ ██║█████╗  ${RESET}"
printf '%b\n' "${GREEN}${BOLD}  ██║  ██║██║   ██║██║╚██╗██║██╔══╝  ${RESET}"
printf '%b\n' "${GREEN}${BOLD}  ██████╔╝╚██████╔╝██║ ╚████║███████╗${RESET}"
printf '%b\n\n' "${GREEN}${BOLD}  ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝╚══════╝${RESET}"
printf '%b\n' "${GREEN}${BOLD}  INSTALLATION COMPLETE${RESET}"
printf '%b\n' "${WHITE}  Your media server is online at:${RESET}"
printf '%b\n' "${CYAN}${BOLD}  http://$SERVER_IP:3000${RESET}"
printf '%b\n\n' "${CYAN}  http://localhost:3000${RESET}"
