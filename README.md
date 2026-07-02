# 🎬 Inaetia Studios - Open-Source Self-Hosted Home Media Server

Inaetia Studios is a modern, lightweight, generic self-hosted home media streaming platform designed to run beautifully on any hardware, operating system, and local network setup. Built with React, Vite, Node.js, Express, and ffmpeg, Inaetia Studios turns any computer (be it a dedicated server, a Raspberry Pi, an old laptop, or a desktop machine) into an elegant personal streaming center.

This project is published as open-source under the **MIT License**.

---

## ✨ Features

- **🚀 Interactive Setup Wizard**: Configure your media server directly from your browser on your first visit. Detects system specs, validates paths, and tests ffmpeg compatibility automatically.
- **📱 Dynamic Responsive UI**: Optimized for any screen size—whether browse-casting from your PC, playing on an iPad, or watching on a smartphone.
- **🔄 Live Safari Remuxing**: iPad/iPhone Safari do not support the MKV video container. When a WebKit/Safari client connects, the server performs on-the-fly, lossless container remuxing from MKV to MP4 without CPU-intensive transcoding.
- **📺 Authentic Live TV Channels**: Custom local broadcasting channels scheduled dynamically based on your media folders. Users watch simulated live television and cannot pause or seek, maintaining an authentic linear TV experience.
- **📻 Streaming Radio**: Simulates personal radio networks with randomized music playlist loops.
- **🎭 Multi-Profile System**: Easily configure multiple user profiles with independent viewing histories and customizations.
- **🎨 Dynamic Theming**: Personalize the server layout with custom UI accent colors configurable during first-run setup or via settings.

---

## 📋 System Requirements

- **Operating System**: Linux (Ubuntu, Debian, Fedora, Arch), macOS, or Windows 10/11
- **Node.js**: Version 20.x or higher
- **Multimedia Engine**: `ffmpeg` and `ffprobe` installed and accessible in the system path

---

## 🛠️ Step-by-Step Installation

### 1. Clone & Navigate
```bash
git clone https://github.com/inaetia/studios.git
cd studios
```

### 2. Run the Automated Linux Installer
On Linux distributions utilizing systemd, you can configure, build, register, and daemonize the application with a single command:
```bash
chmod +x setup.sh
sudo ./setup.sh
```
*This installs system prerequisites, builds the static front-end assets, sets up the background server, and registers an automatic `inaetia-studios.service` daemon.*

---

## ⚙️ Configuration Variables

The application can be fully customized using environment variables declared inside a `.env` file at the project root. If this file does not exist, the browser-based Setup Wizard will help you generate it on your first visit!

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | The port the server binds to | `3000` |
| `HOST` | The server host address | `0.0.0.0` |
| `VIDEOS_PATH` | Path to your Movies/Episodes directory | *Dynamic Setup Wizard value* |
| `MUSIC_PATH` | Path to your Music directory | *Dynamic Setup Wizard value* |
| `MUSIC_VIDEOS_PATH` | (Optional) Path to Music Videos | *Blank* |
| `THUMBNAILS_CACHE_PATH` | Path to compile smart thumbnail images | `/tmp/inaetia/thumbs` |
| `PROFILES_PATH` | Path where profile configurations are saved | `~/.inaetia/profiles` |
| `MAX_CONCURRENT_FFPROBE` | Maximum concurrent metadata probe workers | `3` |
| `RESCAN_INTERVAL_MINUTES`| Scheduled interval to check for new media files | `30` |
| `THEME_COLOR` | Highlight color in HEX format | `#F5A623` |
| `APP_NAME` | Personalized branding name | `Inaetia Studios` |

---

## 🔒 Security & Offline Mode

Inaetia Studios runs entirely offline on your local area network (LAN). No user data, files, metadata, or metrics leave your router.
- Make sure to allow incoming traffic on port `3000` in your operating system's firewall (e.g. `ufw allow 3000/tcp`).

---

## 📂 Project Structure

- `/server.ts` - Back-end Express API. Operates media scanning, Safari client detection, live remuxing, thumbnail extraction, and simulated broadcasting networks.
- `/src/` - React application, using Tailwind CSS, dynamic colors, stateful playback, and responsive media views.
- `/setup.sh` - Standard automated installation and deployment daemon script for Linux servers.

---

## 📄 License

This project is licensed under the **MIT License** - see the LICENSE file for details.
