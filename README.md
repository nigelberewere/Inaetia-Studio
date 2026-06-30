# 🎬 NigelCloud Cinema - Deployment & Setup Guide

Welcome to the **NigelCloud Cinema** deployment manual. This document provides step-by-step instructions to build, transfer, configure, and host your private cinematic streaming server on your dedicated headless Ubuntu Server 23.04.

---

## 📋 Prerequisites Checklist
Before initiating the deployment, ensure the following is true:
* [ ] **Windows 11 PC** is connected to the **NigelCloud** Wi-Fi network.
* [ ] **SSH** credentials for the server laptop are working (`ssh nigel@192.168.4.1`).
* [ ] The 4TB Toshiba external USB drive is mounted to `/mnt/storage` containing `Videos`, `Music`, and `Pictures` folders.
* [ ] You have access to your iPhone hotspot named **nigel** (password: `44444444`) to fetch dependencies temporarily.

---

## 🛠️ Step 1 — Build on Windows PC
Because building assets server-side can be resource-intensive and requires internet access, it is recommended to compile the React client bundle directly on your development machine first.

1. Open PowerShell on your Windows 11 PC and navigate to the project directory:
   ```powershell
   cd C:\path\to\nigelcloud-cinema
   ```
2. Install dependencies and compile the production bundle:
   ```powershell
   npm install
   npm run build
   ```
   *This generates a `dist/` directory with static web assets and bundles the server-side entrypoint into CJS.*

---

## 🚀 Step 2 — Transfer to Server via SCP
Using SSH Copy Protocol (SCP), move the completed build files from your Windows PC to the server over your local connection.

> ⚠️ **CRITICAL WARNING:** **NEVER** copy the `node_modules` directory from your Windows PC to the Ubuntu Linux server! Operating system architectural mismatches will break native compiled binaries (such as `@tailwindcss/oxide`). Always let `setup.sh` handle a clean dependencies install on the destination server.

Run this command in Windows PowerShell to copy the project files (excluding `node_modules`):
```powershell
# Copy the project files (excluding any local node_modules)
scp -r C:\path\to\nigelcloud-cinema nigel@192.168.4.1:/home/nigel/
```
*Alternatively, if you only need to transfer modified static assets:*
```powershell
scp -r .\dist nigel@192.168.4.1:/home/nigel/nigelcloud-cinema/
```

---

## 📶 Step 3 — Get Internet on the Server
To install Node.js and pull server-side npm packages, you must temporarily stop the local host-only hotspot and connect the server to your iPhone's LTE hotspot.

1. **SSH into the server:**
   ```bash
   ssh nigel@192.168.4.1
   ```
2. **Stop current network services:**
   ```bash
   sudo systemctl stop hostapd
   sudo systemctl stop dnsmasq
   ```
3. **Configure netplan to connect to your phone's hotspot:**
   *Using the safe `tee` appending method to avoid indentation errors:*
   ```bash
   echo "network:" | sudo tee /etc/netplan/00-installer-config.yaml
   echo "  version: 2" | sudo tee -a /etc/netplan/00-installer-config.yaml
   echo "  wifis:" | sudo tee -a /etc/netplan/00-installer-config.yaml
   echo "    wlo1:" | sudo tee -a /etc/netplan/00-installer-config.yaml
   echo "      dhcp4: true" | sudo tee -a /etc/netplan/00-installer-config.yaml
   echo "      access-points:" | sudo tee -a /etc/netplan/00-installer-config.yaml
   echo "        nigel:" | sudo tee -a /etc/netplan/00-installer-config.yaml
   echo '          password: "44444444"' | sudo tee -a /etc/netplan/00-installer-config.yaml
   ```
4. **Apply configuration:**
   ```bash
   sudo netplan apply
   ```
5. **Fix temporary DNS resolution:**
   ```bash
   echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
   echo "nameserver 8.8.4.4" | sudo tee -a /etc/resolv.conf
   ```
6. **Verify the connection:**
   *Wait 15 seconds, then run:*
   ```bash
   ping google.com -c 3
   ```

---

## 📦 Step 4 — Install Node.js
If Node.js is not already present on the headless Ubuntu server, fetch and provision the latest Node v20 LTS package.

```bash
# Update local packages database first (Lunar is EOL, updates from old-releases)
sudo apt-get update

# Fetch and configure Nodesource Node v20 script
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -

# Install Nodejs with no-install-recommends to save mobile data
sudo apt-get install -y --no-install-recommends nodejs
```

---

## 🗃️ Step 5 — Install Production Dependencies
Navigate to the transferred project root directory and fetch the required production packages.

```bash
cd /home/nigel/nigelcloud-cinema
npm install --production
```

---

## 📁 Step 6 — Create Profile Storage Directory
The multi-profile streaming catalog stores user configurations and custom watch histories in a localized system database path. This folder must be initialized manually:

```bash
mkdir -p /home/nigel/.nigelcloud
```

---

## ⚙️ Step 7 — Create `.env` Configuration File
Create the runtime environment variables file at `/home/nigel/nigelcloud-cinema/.env`:

```bash
cat <<EOF > /home/nigel/nigelcloud-cinema/.env
PORT=3000
VIDEOS_PATH="/mnt/storage/Videos"
MUSIC_PATH="/mnt/storage/Music"
PICTURES_PATH="/mnt/storage/Pictures"
EOF
```

---

## 🚀 Step 8 — Run the Setup Script
Execute the custom installation script to register and pre-start the background services.

```bash
cd /home/nigel/nigelcloud-cinema
chmod +x setup.sh
sudo ./setup.sh
```

---

## ⛓️ Step 9 — Update the NigelCloud Hotspot Chain
To ensure that NigelCloud Cinema automatically starts on boot alongside your Samba, MiniDLNA, and Hotspot controllers, append its startup hook to your master systemd orchestrator.

1. Open the primary orchestrator service configuration:
   ```bash
   sudo nano /etc/systemd/system/nigelcloud.service
   ```
2. Locate the `ExecStart` parameter.
3. Append `; /bin/systemctl start nigelcloud-cinema` to the very end of the line before the closing quotation marks.

*For reference, your updated `ExecStart` line should look exactly like this:*
```ini
ExecStart=/bin/bash -c '/sbin/ip addr add 192.168.4.1/24 dev wlo1; /bin/systemctl start hostapd; /bin/systemctl start dnsmasq; sleep 5; /bin/mount -o uid=1000,gid=1000,umask=000 /dev/sdb2 /mnt/storage; /bin/systemctl restart smbd; /bin/systemctl restart minidlna; /bin/systemctl start nigelcloud-cinema'
```
4. Save the file (`Ctrl+O`, `Enter`) and exit (`Ctrl+X`).
5. Reload the systemd daemon:
   ```bash
   sudo systemctl daemon-reload
   ```

---

## 📶 Step 10 — Restore NigelCloud Hotspot & Test
With packages installed and services configured, restore your local isolated environment.

1. **Restore local IP routing and bring up the access point:**
   ```bash
   sudo ip addr add 192.168.4.1/24 dev wlo1
   sudo systemctl start dnsmasq
   sudo systemctl start hostapd
   ```
2. **Reconnect your Windows PC and devices** to the **NigelCloud** Wi-Fi hotspot (Password: `demalion`).
3. Open your browser and navigate to the application dashboard:
   * **URL:** [http://192.168.4.1:3000](http://192.168.4.1:3000)

---

## 🔍 Troubleshooting Guide

### ❌ App is not starting or returning error pages
Check the active daemon status logs:
```bash
sudo systemctl status nigelcloud-cinema.service
```
Or check real-time runtime standard error channels:
```bash
journalctl -u nigelcloud-cinema.service -f -n 100
```

### ❌ External media drive is not mounted
If files are missing or `/mnt/storage` is empty, execute the safe mount instruction manually:
```bash
sudo mount -o uid=1000,gid=1000,umask=000 /dev/sdb2 /mnt/storage
```

### ❌ Cannot reach http://cloud
Typing `cloud` should redirect to the server's home page (Samba / File Browser). If name resolution fails, ensure `dnsmasq` is running correctly:
```bash
sudo systemctl restart dnsmasq
```

### ❌ Videos or track catalogs are blank
Verify that your media directory mounts are populated:
```bash
ls -l /mnt/storage/Videos
```
Check the scan directories set in `/home/nigel/nigelcloud-cinema/.env`.

### ❌ Port Conflict with File Browser
Filebrowser runs on port `80` (accessible via `http://cloud`). The Cinema Server is bound separately to port `3000` (accessible via `http://cloud:3000` or `http://192.168.4.1:3000`), avoiding port-mapping conflicts.

### ❌ Node.js is not recognized after installation
If bash prompts `node: command not found` but the installation was completed successfully, reload your profile variables:
```bash
source ~/.bashrc
```

---

## 📱 Accessing the Application

Ensure you are connected to the **NigelCloud** Wi-Fi hotspot (`demalion`):

| Device | Connection URL |
| :--- | :--- |
| **Windows PC** | [http://192.168.4.1:3000](http://192.168.4.1:3000) or [http://cloud:3000](http://cloud:3000) |
| **iPhone Safari** | [http://192.168.4.1:3000](http://192.168.4.1:3000) |
| **Samsung Smart TV** | [http://192.168.4.1:3000](http://192.168.4.1:3000) |

> 💡 **Future Enhancement:** Configure your `dnsmasq.conf` to add a redirect record for `cinema.cloud` mapping straight to `192.168.4.1` for clean subdomain redirection!

---

## 🔄 Updating the Application
When updating code or implementing visual enhancements:

1. Compile the newer static code on your development PC:
   ```powershell
   npm run build
   ```
2. Copy over the newly output compilation bundles:
   ```powershell
   scp -r .\dist nigel@192.168.4.1:/home/nigel/nigelcloud-cinema/
   ```
3. Restart the background systemd daemon:
   ```bash
   sudo systemctl restart nigelcloud-cinema
   ```
