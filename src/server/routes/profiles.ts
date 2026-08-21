import express from "express";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { getPathsConfig, moviesCache } from "../state";
import {
  hashPin,
  createSession,
  getSessionFromReq,
  sanitizeProfile,
  sanitizeMovieForClient,
} from "../auth";
import {
  generateRecommendationsForProfile,
  recomputeTasteProfile,
} from "../../recommendationEngine";

const router = express.Router();

export function loadProfiles() {
  const { PROFILES_PATH } = getPathsConfig();
  try {
    if (fs.existsSync(PROFILES_PATH)) {
      const data = fs.readFileSync(PROFILES_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Failed to load profiles:", err);
  }
  return { profiles: [] };
}

export function saveProfiles(data: any) {
  const { PROFILES_PATH } = getPathsConfig();
  try {
    const dir = path.dirname(PROFILES_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PROFILES_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save profiles:", err);
  }
}

// GET /api/profiles
router.get("/api/profiles", (req, res) => {
  const data = loadProfiles();
  const safeProfiles = (data.profiles || []).map(sanitizeProfile);
  res.json(safeProfiles);
});

// POST /api/profiles
router.post("/api/profiles", (req, res) => {
  const { name, color, avatar, pin, isAdmin } = req.body;
  if (!name || !color) {
    return res.status(400).json({ error: "Name and color are required" });
  }
  const data = loadProfiles();
  if (!data.profiles) data.profiles = [];

  const profileAvatar = avatar || (name.trim().charAt(0).toUpperCase() || "?");
  const isFirstProfile = data.profiles.length === 0;

  let pinHash: string | undefined = undefined;
  if (pin && typeof pin === "string" && pin.trim().length > 0) {
    if (!/^\d{4,6}$/.test(pin.trim())) {
      return res.status(400).json({ error: "PIN must be 4 to 6 numeric digits" });
    }
    pinHash = hashPin(pin.trim());
  }

  const newProfile = {
    id: crypto.randomUUID(),
    name: name.trim(),
    avatar: profileAvatar,
    color,
    pinHash,
    isAdmin: isFirstProfile ? true : Boolean(isAdmin),
    createdAt: new Date().toISOString(),
    watchHistory: {},
    preferences: {
      defaultSort: "recently_added",
      defaultView: "movies",
    },
  };

  data.profiles.push(newProfile);
  saveProfiles(data);

  const token = createSession(newProfile.id, Boolean(newProfile.isAdmin));
  res.json({ ...sanitizeProfile(newProfile), token });
});

// POST /api/profiles/:id/verify-pin
router.post("/api/profiles/:id/verify-pin", (req, res) => {
  const { id } = req.params;
  const { pin } = req.body || {};
  const data = loadProfiles();
  const profile = (data.profiles || []).find((p: any) => p.id === id);

  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const storedHash = profile.pinHash || (profile.pin ? hashPin(profile.pin) : "");
  if (!storedHash) {
    const token = createSession(profile.id, Boolean(profile.isAdmin));
    return res.json({ success: true, token, profile: sanitizeProfile(profile) });
  }

  if (!pin || typeof pin !== "string") {
    return res.status(400).json({ error: "PIN is required" });
  }

  if (hashPin(pin) !== storedHash) {
    return res.status(401).json({ error: "Incorrect PIN" });
  }

  const token = createSession(profile.id, Boolean(profile.isAdmin));
  return res.json({ success: true, token, profile: sanitizeProfile(profile) });
});

// POST /api/profiles/:id/session
router.post("/api/profiles/:id/session", (req, res) => {
  const { id } = req.params;
  const data = loadProfiles();
  const profile = (data.profiles || []).find((p: any) => p.id === id);

  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const hasPin = Boolean(profile.pin || profile.pinHash);
  if (hasPin) {
    return res.status(401).json({ error: "PIN required for this profile", hasPin: true });
  }

  const token = createSession(profile.id, Boolean(profile.isAdmin));
  return res.json({ success: true, token, profile: sanitizeProfile(profile) });
});

// PUT /api/profiles/:id/pin
router.put("/api/profiles/:id/pin", (req, res) => {
  const { id } = req.params;
  const { currentPin, newPin } = req.body || {};
  const data = loadProfiles();
  const profile = (data.profiles || []).find((p: any) => p.id === id);

  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const storedHash = profile.pinHash || (profile.pin ? hashPin(profile.pin) : "");
  const session = getSessionFromReq(req);
  const isAuthorizedBySession = session && (session.profileId === id || session.isAdmin);

  if (storedHash && !isAuthorizedBySession) {
    if (!currentPin || hashPin(currentPin) !== storedHash) {
      return res.status(401).json({ error: "Current PIN is incorrect" });
    }
  }

  if (newPin && typeof newPin === "string" && newPin.trim().length > 0) {
    if (!/^\d{4,6}$/.test(newPin.trim())) {
      return res.status(400).json({ error: "PIN must be 4 to 6 numeric digits" });
    }
    profile.pinHash = hashPin(newPin.trim());
    delete profile.pin;
  } else {
    delete profile.pin;
    delete profile.pinHash;
  }

  saveProfiles(data);
  const token = createSession(profile.id, Boolean(profile.isAdmin));
  return res.json({ success: true, token, profile: sanitizeProfile(profile) });
});

// DELETE /api/profiles/:id
router.delete("/api/profiles/:id", (req, res) => {
  const id = req.params.id;
  const { pin } = req.body || {};
  const data = loadProfiles();
  if (!data.profiles) data.profiles = [];

  const targetProfile = data.profiles.find((p: any) => p.id === id);
  if (!targetProfile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const session = getSessionFromReq(req);
  const isAuthorized = session && (session.profileId === id || session.isAdmin);
  const storedHash = targetProfile.pinHash || (targetProfile.pin ? hashPin(targetProfile.pin) : "");

  if (storedHash && !isAuthorized) {
    if (!pin || hashPin(pin) !== storedHash) {
      return res.status(401).json({ error: "PIN verification required to delete this profile" });
    }
  }

  data.profiles = data.profiles.filter((p: any) => p.id !== id);
  saveProfiles(data);
  res.json({ success: true, message: "Profile deleted successfully" });
});

// GET /api/profiles/:id/history
router.get("/api/profiles/:id/history", (req, res) => {
  const id = req.params.id;
  const data = loadProfiles();
  const profile = (data.profiles || []).find((p: any) => p.id === id);

  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const historyItems = Object.entries(profile.watchHistory || {}).map(([movieId, record]: [string, any]) => {
    const movie = moviesCache.find((m) => m.id === movieId);
    const safeMovie = movie ? sanitizeMovieForClient(movie) : null;
    return {
      ...record,
      movieId,
      movie: safeMovie,
      ...(safeMovie || {}),
    };
  });

  historyItems.sort((a, b) => new Date(b.lastWatched).getTime() - new Date(a.lastWatched).getTime());
  res.json(historyItems);
});

// POST /api/profiles/:id/history
router.post("/api/profiles/:id/history", (req, res) => {
  const id = req.params.id;
  const { movieId, position, duration } = req.body;

  if (!movieId || position === undefined || duration === undefined) {
    return res.status(400).json({ error: "movieId, position, and duration are required" });
  }

  const data = loadProfiles();
  const profile = (data.profiles || []).find((p: any) => p.id === id);

  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const session = getSessionFromReq(req);
  if (data.profiles.length > 0 && session && session.profileId !== id && !session.isAdmin) {
    return res.status(403).json({ error: "Unauthorized to update another profile's history" });
  }

  if (!profile.watchHistory) {
    profile.watchHistory = {};
  }

  const completed = position > 0.9 * duration || duration - position < 120;
  profile.watchHistory[movieId] = {
    position: Math.round(position),
    duration: Math.round(duration),
    lastWatched: new Date().toISOString(),
    completed,
  };

  saveProfiles(data);
  res.json(profile.watchHistory[movieId]);

  setTimeout(() => {
    try {
      const freshData = loadProfiles();
      const allP = freshData.profiles || [];
      const targetP = allP.find((p: any) => p.id === id);
      if (targetP) {
        targetP.tasteProfile = recomputeTasteProfile(targetP, moviesCache);
        const recs = generateRecommendationsForProfile(targetP, allP, moviesCache);
        targetP.cachedRecommendations = recs;
        saveProfiles(freshData);
      }
    } catch (e) {
      console.error("Error incrementally updating recommendations:", e);
    }
  }, 50);
});

// DELETE /api/profiles/:id/history
router.delete("/api/profiles/:id/history", (req, res) => {
  const { id } = req.params;
  const data = loadProfiles();
  const profile = (data.profiles || []).find((p: any) => p.id === id);

  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const session = getSessionFromReq(req);
  const storedHash = profile.pinHash || (profile.pin ? hashPin(profile.pin) : "");
  if (storedHash && (!session || (session.profileId !== id && !session.isAdmin))) {
    const { pin } = req.body || {};
    if (!pin || hashPin(pin) !== storedHash) {
      return res.status(401).json({ error: "Authentication or PIN verification required to clear history" });
    }
  }

  profile.watchHistory = {};
  saveProfiles(data);
  return res.json({ success: true, message: "Entire watch history cleared" });
});

// DELETE /api/profiles/:id/history/:movieId
router.delete("/api/profiles/:id/history/:movieId", (req, res) => {
  const { id, movieId } = req.params;
  const data = loadProfiles();
  const profile = (data.profiles || []).find((p: any) => p.id === id);

  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const session = getSessionFromReq(req);
  const storedHash = profile.pinHash || (profile.pin ? hashPin(profile.pin) : "");
  if (storedHash && (!session || (session.profileId !== id && !session.isAdmin))) {
    const { pin } = req.body || {};
    if (!pin || hashPin(pin) !== storedHash) {
      return res.status(401).json({ error: "Authentication or PIN verification required" });
    }
  }

  if (profile.watchHistory && profile.watchHistory[movieId]) {
    delete profile.watchHistory[movieId];
    saveProfiles(data);
    return res.json({ success: true, message: "Movie history cleared" });
  }

  res.status(404).json({ error: "Movie history not found for this profile" });
});

// GET /api/profiles/:id/continue
router.get("/api/profiles/:id/continue", (req, res) => {
  const id = req.params.id;
  const data = loadProfiles();
  const profile = (data.profiles || []).find((p: any) => p.id === id);

  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const continueItems = Object.entries(profile.watchHistory || {})
    .filter(([_, record]: [string, any]) => record.position > 30 && !record.completed)
    .map(([movieId, record]: [string, any]) => {
      const movie = moviesCache.find((m) => m.id === movieId);
      const safeMovie = movie ? sanitizeMovieForClient(movie) : null;
      return {
        ...record,
        movieId,
        movie: safeMovie,
        ...(safeMovie || {}),
      };
    })
    .filter((item) => item.movie !== null);

  continueItems.sort((a, b) => new Date(b.lastWatched).getTime() - new Date(a.lastWatched).getTime());
  res.json(continueItems.slice(0, 20));
});

// GET /api/profiles/:id/recommendations
router.get("/api/profiles/:id/recommendations", (req, res) => {
  const id = req.params.id;
  const forceRefresh = req.query.refresh === "true";
  const data = loadProfiles();
  const profilesList = data.profiles || [];
  const profile = profilesList.find((p: any) => p.id === id);

  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const cached = profile.cachedRecommendations;
  const isStale = !cached || !cached.updatedAt || Date.now() - new Date(cached.updatedAt).getTime() > 12 * 60 * 60 * 1000;

  if (!forceRefresh && !isStale && cached && cached.recommendations && cached.recommendations.length > 0) {
    return res.json({
      ...cached,
      recommendations: cached.recommendations.map((r: any) => ({
        ...r,
        movie: sanitizeMovieForClient(r.movie),
      })),
    });
  }

  try {
    const recData = generateRecommendationsForProfile(profile, profilesList, moviesCache);
    profile.cachedRecommendations = recData;

    if (!profile.recentlyShownLog) profile.recentlyShownLog = [];
    recData.recommendations.forEach((rec: any) => {
      profile.recentlyShownLog.push({ id: rec.movie.id, timestamp: new Date().toISOString() });
    });

    saveProfiles(data);
    return res.json({
      ...recData,
      recommendations: recData.recommendations.map((r: any) => ({
        ...r,
        movie: sanitizeMovieForClient(r.movie),
      })),
    });
  } catch (err: any) {
    console.error(`Error generating recommendations for profile ${id}:`, err);
    if (cached && cached.recommendations) {
      return res.json({
        ...cached,
        recommendations: cached.recommendations.map((r: any) => ({
          ...r,
          movie: sanitizeMovieForClient(r.movie),
        })),
      });
    }
    return res.status(500).json({ error: "Failed to generate recommendations", details: err.message });
  }
});

export default router;
