#!/bin/bash
# ==============================================================================
# NigelCloud Cinema - Ubuntu Server Setup Script
# Host IP: 192.168.4.1
# ==============================================================================

set -e

echo "===================================================="
echo "🎬 Starting NigelCloud Cinema Installation..."
echo "===================================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: Please run this setup script as root (sudo ./setup.sh)"
  exit 1
fi

# Detect actual repository root directory
INSTALL_DIR=$(pwd)
echo "📂 Project Directory: $INSTALL_DIR"

# Install System Dependencies (ffmpeg, node, npm)
echo "📦 Verifying system packages (ffmpeg, nodejs, npm)..."
if ! command -v ffmpeg &> /dev/null; then
  echo "Installing ffmpeg..."
  apt-get update && apt-get install -y ffmpeg
else
  echo "✔ ffmpeg is already installed"
fi

if ! command -v node &> /dev/null; then
  echo "Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
  apt-get install -y nodejs
else
  echo "✔ Node.js is already installed ($(node -v))"
fi

# Build Project
echo "🏗️ Installing dependencies and building production bundle..."
npm install
npm run build

# Ensure folders exist
echo "📂 Creating storage and thumbnail directories..."
mkdir -p /mnt/storage/Videos
mkdir -p /mnt/storage/Music
mkdir -p /mnt/storage/Pictures
mkdir -p /tmp/nigelcloud/thumbs

# Set permissions for user 'nigel'
echo "👤 Configuring permissions for user 'nigel'..."
if id "nigel" &>/dev/null; then
  chown -R nigel:nigel "$INSTALL_DIR"
  chown -R nigel:nigel /tmp/nigelcloud
else
  echo "⚠️ Warning: User 'nigel' does not exist on this machine. Systemd will run as current user, or please create user 'nigel'."
fi

# Determine service running user
SERVICE_USER="nigel"
if ! id "nigel" &>/dev/null; then
  SERVICE_USER=$(logname || echo "root")
fi

# Create Systemd Service
echo "⚙️ Provisioning systemd service at /etc/systemd/system/nigelcloud-cinema.service..."
cat <<EOF > /etc/systemd/system/nigelcloud-cinema.service
[Unit]
Description=NigelCloud Cinema Media Streaming Server
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
ExecStart=$(which node) dist/server.cjs
Restart=always
Environment=NODE_ENV=production PORT=3000
Environment=VIDEOS_PATH=/mnt/storage/Videos
Environment=MUSIC_PATH=/mnt/storage/Music
Environment=PICTURES_PATH=/mnt/storage/Pictures

[Install]
WantedBy=multi-user.target
EOF

# Reload and Enable Service
echo "📡 Enabling and starting nigelcloud-cinema service..."
systemctl daemon-reload
systemctl enable nigelcloud-cinema.service
systemctl restart nigelcloud-cinema.service

echo "===================================================="
echo "🎉 NigelCloud Cinema Setup Completed Successfully!"
echo "📡 Access the cinema on your local WiFi hotspot at:"
echo "   👉 http://192.168.4.1:3000"
echo "   👉 http://localhost:3000"
echo "===================================================="
