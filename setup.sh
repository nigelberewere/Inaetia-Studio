#!/bin/bash
# ==============================================================================
# Inaetia Studios - Self-Hosted Home Media Server Setup Script
# ==============================================================================

set -e

echo "===================================================="
echo "🎬 Starting Inaetia Studios Installation..."
echo "===================================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: Please run this setup script as root (sudo ./setup.sh)"
  exit 1
fi

# Detect actual repository root directory
INSTALL_DIR=$(pwd)
echo "📂 Project Directory: $INSTALL_DIR"

# Wait for dpkg/apt lock frontends to be released
echo "⏳ Checking for lock on dpkg/apt frontend..."
while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 || fuser /var/lib/apt/lists/lock >/dev/null 2>&1 || fuser /var/lib/dpkg/lock >/dev/null 2>&1; do
  echo "Waiting for other apt or unattended-upgrades process to release package locks..."
  sleep 5
done

# Install System Dependencies (ffmpeg, node, npm)
echo "📦 Verifying system packages (ffmpeg, nodejs, npm)..."
if ! command -v ffmpeg &> /dev/null; then
  echo "Installing ffmpeg..."
  apt-get update && apt-get install -y ffmpeg
else
  echo "✔ ffmpeg is already installed"
fi

NODE_UPGRADED=false
if command -v node &> /dev/null; then
  NODE_MAJOR=$(node -v | cut -d'.' -f1 | tr -d 'v')
else
  NODE_MAJOR=0
fi

if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "⚠️ Current Node.js version is v$(node -v 2>/dev/null || echo "0"), which is less than 20. Node.js >= 20 is required."
  echo "Installing Node.js 22 (LTS) via NodeSource..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
  NODE_UPGRADED=true
else
  echo "✔ Node.js is already installed and compatible ($(node -v))"
fi

# Build Project
echo "🏗️ Installing dependencies and building production bundle..."

if [ "$NODE_UPGRADED" = "true" ]; then
  echo "Cleaning old node_modules to avoid native binary issues with Node 22..."
  rm -rf node_modules package-lock.json
fi

if [ -d "node_modules" ]; then
  echo "✔ Existing node_modules found. Building project..."
  if npm run build &>/dev/null; then
    echo "🚀 Build succeeded!"
  else
    echo "⚠️ Build failed. Repairing dependencies..."
    rm -rf node_modules package-lock.json
    npm install
    npm run build
  fi
else
  echo "📦 Installing dependencies..."
  npm install
  npm run build
fi

# Determine service running user
SERVICE_USER=$(logname || echo "root")
echo "👤 Configuring permissions for user '$SERVICE_USER'..."
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
echo "⚙️ Provisioning systemd service at /etc/systemd/system/inaetia-studios.service..."
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
echo "📡 Enabling and starting inaetia-studios service..."
systemctl daemon-reload
systemctl enable inaetia-studios.service
systemctl restart inaetia-studios.service

# Get dynamic Server IP
SERVER_IP=$(hostname -I | awk '{print $1}' || echo "localhost")

echo "===================================================="
echo "🎉 Inaetia Studios Setup Completed Successfully!"
echo "📡 Access your media server on your local network at:"
echo "   👉 http://$SERVER_IP:3000"
echo "   👉 http://localhost:3000"
echo "===================================================="
