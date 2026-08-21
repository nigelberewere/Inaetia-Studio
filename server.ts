import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import {
  getPathsConfig,
  ensureDirs,
  loadPersistentCache,
} from "./src/server/state";
import { triggerScan } from "./src/server/scanner";

// Modular Route Handlers
import profilesRouter from "./src/server/routes/profiles";
import moviesRouter from "./src/server/routes/movies";
import musicRouter from "./src/server/routes/music";
import livetvRouter from "./src/server/routes/livetv";
import radioRouter from "./src/server/routes/radio";
import hlsRouter from "./src/server/routes/hls";
import setupRouter from "./src/server/routes/setup";
import aiRouter from "./src/server/routes/ai";

const app = express();

app.use(cors());
app.use(express.json());

// Initialize filesystem directories & persistent media cache on startup
ensureDirs();
loadPersistentCache();

// Mount Modular API Routes
app.use(profilesRouter);
app.use(moviesRouter);
app.use(musicRouter);
app.use(livetvRouter);
app.use(radioRouter);
app.use(hlsRouter);
app.use(setupRouter);
app.use(aiRouter);

// Start background rescanning timer
const { RESCAN_INTERVAL_MINUTES, PORT } = getPathsConfig();
setInterval(() => {
  console.log("[Rescan] Periodic background scan running...");
  triggerScan().catch(console.error);
}, Math.max(1, RESCAN_INTERVAL_MINUTES) * 60 * 1000);

// Perform non-blocking initial scan on boot
setTimeout(() => {
  triggerScan().catch(console.error);
}, 200);

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`====================================================`);
    console.log(`Inaetia Studios Cinema backend running on port ${PORT}`);
    console.log(`Local Network Access: http://192.168.4.1:${PORT}`);
    console.log(`System offline capability loaded`);
    console.log(`====================================================`);
  });
}

startServer();

export default app;
