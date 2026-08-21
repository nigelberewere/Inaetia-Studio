import express from "express";
import { GoogleGenAI } from "@google/genai";
import { moviesCache, musicCache } from "../state";
import { sanitizeMovieForClient, sanitizeTrackForClient } from "../auth";

const router = express.Router();

let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

// GET /api/ai/status - Check if Gemini API is configured
router.get("/api/ai/status", (req, res) => {
  const isAvailable = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    available: isAvailable,
    model: isAvailable ? "gemini-2.5-flash" : null,
  });
});

// POST /api/ai/recommend - Smart library recommendation powered by Gemini
router.post("/api/ai/recommend", async (req, res) => {
  const { prompt, mediaType } = req.body;

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Prompt is required" });
  }

  const ai = getGenAI();
  if (!ai) {
    return res.status(503).json({
      error: "Gemini API key is not configured on the server. Set GEMINI_API_KEY in server environment settings.",
      available: false,
    });
  }

  try {
    const moviesCatalog = moviesCache.slice(0, 150).map((m) => ({
      id: m.id,
      title: m.title,
      year: m.year,
      genres: m.genres,
      category: m.category,
      plot: m.plot ? m.plot.slice(0, 120) : undefined,
    }));

    const musicCatalog = musicCache.slice(0, 150).map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: t.album,
    }));

    const systemInstruction = `You are an expert AI media curator for Inaetia Studios home theater.
Analyze the user request and select the most fitting items strictly from the provided media catalog.
Provide a concise, engaging curator note explaining why these match the mood.
Return a valid JSON object matching this schema:
{
  "curatorNote": "string explanation",
  "movieIds": ["id1", "id2"],
  "trackIds": ["id1", "id2"]
}`;

    const contextPayload = {
      userPrompt: prompt,
      requestedType: mediaType || "all",
      availableMovies: mediaType === "music" ? [] : moviesCatalog,
      availableMusic: mediaType === "movies" ? [] : musicCatalog,
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: systemInstruction },
            { text: `User Query: ${prompt}\n\nCatalog:\n${JSON.stringify(contextPayload)}` },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text || "{}";
    const parsed = JSON.parse(responseText);

    const recommendedMovieIds = Array.isArray(parsed.movieIds) ? parsed.movieIds : [];
    const recommendedTrackIds = Array.isArray(parsed.trackIds) ? parsed.trackIds : [];

    const matchedMovies = moviesCache
      .filter((m) => recommendedMovieIds.includes(m.id))
      .map(sanitizeMovieForClient);

    const matchedMusic = musicCache
      .filter((t) => recommendedTrackIds.includes(t.id))
      .map(sanitizeTrackForClient);

    res.json({
      curatorNote: parsed.curatorNote || "Curated selections based on your mood:",
      movies: matchedMovies,
      music: matchedMusic,
    });
  } catch (err: any) {
    console.error("Gemini recommendation error:", err);
    res.status(500).json({ error: "Failed to generate AI recommendations", details: err.message });
  }
});

// POST /api/ai/synopsis - Generate enhanced cinematic synopsis for a movie or episode
router.post("/api/ai/synopsis", async (req, res) => {
  const { title, year, category, filename } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }

  const ai = getGenAI();
  if (!ai) {
    return res.status(503).json({
      error: "Gemini API key is not configured on the server.",
      available: false,
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Generate a compelling, spoiler-free 2-3 sentence cinematic synopsis and 2-4 genre tags for the media title: "${title}" (${year || "Unknown Year"}, Category: ${category || "General"}, File: ${filename || ""}).
Return JSON in format: { "synopsis": "string", "tagline": "string", "genres": ["string"] }`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (err: any) {
    console.error("Gemini synopsis error:", err);
    res.status(500).json({ error: "Failed to generate synopsis", details: err.message });
  }
});

export default router;
