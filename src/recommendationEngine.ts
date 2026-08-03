import { Movie, Profile, TasteProfile, HeroRecommendation, ProfileRecommendationData, RecentlyShownLog } from "./types";

// Configurable weights for composite scoring (Phase B constraint)
export const RECOMMENDATION_WEIGHTS = {
  GENRE: 0.35,
  PEOPLE: 0.25,
  TAGS: 0.15,
  QUALITY: 0.10,
  FRESHNESS: 0.10,
  JITTER: 0.05,
};

const HALFLIFE_DAYS = 30; // 30-day halflife for watch history recency decay
const RECENTLY_SHOWN_WINDOW_DAYS = 3; // N days for hero candidate exclusion log

// Helper: Normalize dictionary values so sum = 1.0
function normalizeVector(vec: Record<string, number>): Record<string, number> {
  const sum = Object.values(vec).reduce((acc, val) => acc + (val > 0 ? val : 0), 0);
  if (sum <= 0) return {};
  const normalized: Record<string, number> = {};
  for (const [key, val] of Object.entries(vec)) {
    if (val > 0) {
      normalized[key] = parseFloat((val / sum).toFixed(4));
    }
  }
  return normalized;
}

// Helper: Extract text keywords from tagline, plot, and subcategories
function extractKeywords(movie: Movie): string[] {
  const text = `${movie.tagline || ""} ${movie.plot || ""} ${movie.subcategory || ""}`.toLowerCase();
  if (!text.trim()) return [];
  const words = text
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3);
  
  // Return unique keywords (limit top 10)
  const unique = Array.from(new Set(words));
  return unique.slice(0, 10);
}

// Helper: Extract all metadata attributes from a Movie or TV show candidate
function getItemMetadata(movie: Movie) {
  const genres = movie.genres && movie.genres.length > 0
    ? movie.genres
    : (movie.showGenres && movie.showGenres.length > 0
      ? movie.showGenres
      : (movie.category ? [movie.category] : []));

  const actors = movie.actors ? movie.actors.map((a) => a.name.trim()).filter(Boolean) : [];
  
  const directors = movie.director
    ? movie.director.split(/[,/]/).map((d) => d.trim()).filter(Boolean)
    : [];

  const studio = movie.studio || movie.showStudio || null;

  const yearVal = movie.year || movie.showYear || null;
  const decade = yearVal ? `${Math.floor(yearVal / 10) * 10}s` : null;

  const tags = extractKeywords(movie);

  const rating = movie.rating ?? movie.showRating ?? null;

  return { genres, actors, directors, studio, decade, tags, rating };
}

/**
 * PHASE A — Taste Profile Builder
 * Recomputes a profile's taste vector based on their watch history.
 */
export function recomputeTasteProfile(profile: Profile, moviesCatalog: Movie[]): TasteProfile {
  const now = Date.now();
  const rawGenres: Record<string, number> = {};
  const rawActors: Record<string, number> = {};
  const rawDirectors: Record<string, number> = {};
  const rawTags: Record<string, number> = {};
  const rawStudios: Record<string, number> = {};
  const rawDecades: Record<string, number> = {};

  const historyEntries = Object.entries(profile.watchHistory || {});
  let validWatchCount = 0;

  // Map movies for fast lookup
  const movieMap = new Map<string, Movie>();
  moviesCatalog.forEach((m) => movieMap.set(m.id, m));

  for (const [movieId, record] of historyEntries) {
    const movie = movieMap.get(movieId);
    if (!movie) continue;

    validWatchCount++;

    // a. Recency weight: exponential decay e^(-days / halflife)
    const lastWatchedMs = new Date(record.lastWatched).getTime();
    const daysSinceWatched = Math.max(0, (now - lastWatchedMs) / (1000 * 60 * 60 * 24));
    const recencyWeight = Math.exp(-daysSinceWatched / HALFLIFE_DAYS);

    // b. Completion weight
    let completionScale = 1.0;
    if (record.completed) {
      completionScale = 1.0;
    } else if (record.duration > 0) {
      const pct = record.position / record.duration;
      if (pct >= 0.9) {
        completionScale = 1.0;
      } else if (pct < 0.05) {
        completionScale = -0.05; // Slightly negative contribution for abandoned items
      } else {
        completionScale = pct;
      }
    }

    const itemWeight = recencyWeight * completionScale;
    if (itemWeight <= 0) continue;

    const meta = getItemMetadata(movie);

    // Accumulate genres
    meta.genres.forEach((g) => {
      rawGenres[g] = (rawGenres[g] || 0) + itemWeight;
    });

    // Accumulate actors
    meta.actors.forEach((a) => {
      rawActors[a] = (rawActors[a] || 0) + itemWeight;
    });

    // Accumulate directors
    meta.directors.forEach((d) => {
      rawDirectors[d] = (rawDirectors[d] || 0) + itemWeight;
    });

    // Accumulate tags
    meta.tags.forEach((t) => {
      rawTags[t] = (rawTags[t] || 0) + itemWeight;
    });

    // Accumulate studio
    if (meta.studio) {
      rawStudios[meta.studio] = (rawStudios[meta.studio] || 0) + itemWeight;
    }

    // Accumulate decade
    if (meta.decade) {
      rawDecades[meta.decade] = (rawDecades[meta.decade] || 0) + itemWeight;
    }
  }

  // Cold start check (< 3 watched items)
  const isColdStart = validWatchCount < 3;

  return {
    updatedAt: new Date().toISOString(),
    isColdStart,
    watchCount: validWatchCount,
    genres: normalizeVector(rawGenres),
    actors: normalizeVector(rawActors),
    directors: normalizeVector(rawDirectors),
    tags: normalizeVector(rawTags),
    studios: normalizeVector(rawStudios),
    decades: normalizeVector(rawDecades),
  };
}

interface CandidateItem {
  id: string;
  title: string;
  isTvShow: boolean;
  representativeMovie: Movie;
  episodesCount?: number;
  watchedCount?: number;
  metadata: ReturnType<typeof getItemMetadata>;
  rawScore?: number;
  whyTag?: string;
  contributingTitle?: string | null;
  contributingGenre?: string | null;
}

/**
 * PHASE B & C & D — Recommendation Engine Entrypoint
 */
export function generateRecommendationsForProfile(
  profile: Profile,
  allProfiles: Profile[],
  moviesCatalog: Movie[]
): ProfileRecommendationData {
  const tasteProfile = recomputeTasteProfile(profile, moviesCatalog);

  // Determine if profile has watched any TV show historically
  let hasWatchedTv = false;
  const historyMovieIds = new Set(Object.keys(profile.watchHistory || {}));

  moviesCatalog.forEach((m) => {
    if (historyMovieIds.has(m.id) && (m.type === "episode" || m.showName || m.showTitle)) {
      hasWatchedTv = true;
    }
  });

  // Clean recently shown log (retain logs within RECENTLY_SHOWN_WINDOW_DAYS)
  const now = Date.now();
  const validRecentlyShown = (profile.recentlyShownLog || []).filter((log) => {
    const ageDays = (now - new Date(log.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    return ageDays <= RECENTLY_SHOWN_WINDOW_DAYS;
  });

  const recentlyShownIds = new Set(validRecentlyShown.map((l) => l.id));

  // Build candidate pool: Movies + Show-level TV rollups
  const candidatePool: CandidateItem[] = [];

  // Group TV episodes by showName / showTitle
  const tvShowGroups = new Map<string, Movie[]>();
  const movieCandidates: Movie[] = [];

  moviesCatalog.forEach((m) => {
    if (m.type === "episode") {
      const showKey = (m.showTitle || m.showName || "Unknown Show").trim();
      if (!tvShowGroups.has(showKey)) {
        tvShowGroups.set(showKey, []);
      }
      tvShowGroups.get(showKey)!.push(m);
    } else {
      movieCandidates.push(m);
    }
  });

  // 1. Process Movie candidates
  movieCandidates.forEach((m) => {
    const watchRecord = profile.watchHistory?.[m.id];
    // Exclude fully watched movies
    if (watchRecord && watchRecord.completed) return;

    // Check recently shown
    const isRecentlyShown = recentlyShownIds.has(m.id);

    candidatePool.push({
      id: m.id,
      title: m.title,
      isTvShow: false,
      representativeMovie: m,
      metadata: getItemMetadata(m),
      rawScore: 0,
    });
  });

  // 2. Process TV Show candidates (show-level rollup)
  tvShowGroups.forEach((episodes, showKey) => {
    // Check if profile watched episodes in this show
    let watchedCount = 0;
    episodes.forEach((ep) => {
      const rec = profile.watchHistory?.[ep.id];
      if (rec && (rec.completed || rec.position > 0.8 * rec.duration)) {
        watchedCount++;
      }
    });

    // Exclude if all episodes completed (fully watched show)
    if (episodes.length > 0 && watchedCount >= episodes.length) return;

    // Select representative episode (prefer season 1 ep 1 or first episode)
    const sortedEps = [...episodes].sort((a, b) => {
      const sA = a.season ?? 1;
      const sB = b.season ?? 1;
      if (sA !== sB) return sA - sB;
      return (a.episode ?? 1) - (b.episode ?? 1);
    });
    const repMovie = sortedEps[0];

    // Combine metadata across episodes for show-level candidate
    const allGenres = Array.from(new Set(episodes.flatMap((e) => getItemMetadata(e).genres)));
    const allActors = Array.from(new Set(episodes.flatMap((e) => getItemMetadata(e).actors))).slice(0, 10);
    const allDirectors = Array.from(new Set(episodes.flatMap((e) => getItemMetadata(e).directors)));
    const showStudio = repMovie.showStudio || repMovie.studio || null;
    const showYear = repMovie.showYear || repMovie.year || null;
    const showRating = repMovie.showRating || repMovie.rating || null;
    const showDecade = showYear ? `${Math.floor(showYear / 10) * 10}s` : null;
    const allTags = Array.from(new Set(episodes.flatMap((e) => getItemMetadata(e).tags)));

    candidatePool.push({
      id: `show_${showKey}`,
      title: showKey,
      isTvShow: true,
      representativeMovie: {
        ...repMovie,
        title: repMovie.showTitle || repMovie.showName || repMovie.title,
        genres: allGenres.length > 0 ? allGenres : repMovie.genres,
        rating: showRating ?? repMovie.rating,
        year: showYear ?? repMovie.year,
        plot: repMovie.showPlot || repMovie.plot,
      },
      episodesCount: episodes.length,
      watchedCount,
      metadata: {
        genres: allGenres,
        actors: allActors,
        directors: allDirectors,
        studio: showStudio,
        decade: showDecade,
        tags: allTags,
        rating: showRating,
      },
      rawScore: 0,
    });
  });

  // Filter recently shown unless pool becomes too small (< 6)
  let eligibleCandidates = candidatePool.filter((c) => !recentlyShownIds.has(c.id));
  if (eligibleCandidates.length < 6) {
    eligibleCandidates = candidatePool; // Relax filter if pool is tight
  }

  // ---------------------------------------------------------
  // COLD START FALLBACK (< 3 watched items or tasteProfile.isColdStart)
  // ---------------------------------------------------------
  if (tasteProfile.isColdStart || eligibleCandidates.length === 0) {
    const recommendations = generateColdStartRecommendations(
      profile,
      allProfiles,
      moviesCatalog,
      eligibleCandidates.length > 0 ? eligibleCandidates : candidatePool,
      recentlyShownIds
    );

    return {
      updatedAt: new Date().toISOString(),
      isColdStart: true,
      recommendations,
    };
  }

  // ---------------------------------------------------------
  // PHASE B — Scoring Candidates against Taste Profile
  // ---------------------------------------------------------
  const watchedMovies = moviesCatalog.filter((m) => profile.watchHistory?.[m.id]);

  eligibleCandidates.forEach((candidate) => {
    const meta = candidate.metadata;

    // 1. Genre similarity (overlap with profile taste vector)
    let genreSimilarity = 0;
    meta.genres.forEach((g) => {
      genreSimilarity += tasteProfile.genres[g] || 0;
    });

    // 2. People overlap (actors & directors)
    let peopleOverlap = 0;
    meta.actors.forEach((a) => {
      peopleOverlap += (tasteProfile.actors[a] || 0) * 0.8;
    });
    meta.directors.forEach((d) => {
      peopleOverlap += (tasteProfile.directors[d] || 0) * 1.0;
    });

    // 3. Tag / Studio / Decade similarity
    let tagSimilarity = 0;
    meta.tags.forEach((t) => {
      tagSimilarity += (tasteProfile.tags[t] || 0) * 0.5;
    });
    if (meta.studio && tasteProfile.studios[meta.studio]) {
      tagSimilarity += tasteProfile.studios[meta.studio] * 0.3;
    }
    if (meta.decade && tasteProfile.decades[meta.decade]) {
      tagSimilarity += tasteProfile.decades[meta.decade] * 0.2;
    }

    // 4. Quality score (normalized NFO/IMDb rating 0..1)
    const rawRating = meta.rating ?? 7.0;
    const qualityScore = Math.min(1.0, Math.max(0, rawRating / 10.0));

    // 5. Freshness boost (based on file added date to library)
    const addedMs = new Date(candidate.representativeMovie.added).getTime();
    const ageDays = Math.max(0, (now - addedMs) / (1000 * 60 * 60 * 24));
    const freshnessBoost = Math.exp(-ageDays / 45.0);

    // 6. Exploration jitter
    const explorationJitter = Math.random();

    // Composite Score Formula
    const compositeScore =
      genreSimilarity * RECOMMENDATION_WEIGHTS.GENRE +
      peopleOverlap * RECOMMENDATION_WEIGHTS.PEOPLE +
      tagSimilarity * RECOMMENDATION_WEIGHTS.TAGS +
      qualityScore * RECOMMENDATION_WEIGHTS.QUALITY +
      freshnessBoost * RECOMMENDATION_WEIGHTS.FRESHNESS +
      explorationJitter * RECOMMENDATION_WEIGHTS.JITTER;

    candidate.rawScore = parseFloat(compositeScore.toFixed(4));

    // Determine highest contributing watched item for "Because you watched {Title}"
    let topMatchTitle: string | null = null;
    let topMatchScore = 0;

    for (const watched of watchedMovies) {
      const wMeta = getItemMetadata(watched);
      let matchScore = 0;

      // Genre overlap
      meta.genres.forEach((g) => {
        if (wMeta.genres.includes(g)) matchScore += 2;
      });
      // Cast / director overlap
      meta.actors.forEach((a) => {
        if (wMeta.actors.includes(a)) matchScore += 3;
      });
      meta.directors.forEach((d) => {
        if (wMeta.directors.includes(d)) matchScore += 4;
      });

      if (matchScore > topMatchScore) {
        topMatchScore = matchScore;
        topMatchTitle = watched.title;
      }
    }

    // Assign "Why" tag
    if (topMatchTitle && topMatchScore >= 2) {
      candidate.whyTag = `Because you watched ${topMatchTitle}`;
    } else if (meta.genres.length > 0) {
      // Find top matching genre
      let topGenre = meta.genres[0];
      let topGenreScore = tasteProfile.genres[topGenre] || 0;
      meta.genres.forEach((g) => {
        if ((tasteProfile.genres[g] || 0) > topGenreScore) {
          topGenreScore = tasteProfile.genres[g] || 0;
          topGenre = g;
        }
      });
      candidate.whyTag = `Because you like ${topGenre}`;
    } else {
      candidate.whyTag = "Recommended for You";
    }
  });

  // Sort candidates by raw composite score descending
  eligibleCandidates.sort((a, b) => (b.rawScore || 0) - (a.rawScore || 0));

  // ---------------------------------------------------------
  // PHASE C — Greedy MMR Re-ranking & Diversity Pass
  // ---------------------------------------------------------
  const selected: CandidateItem[] = [];
  const remaining = [...eligibleCandidates];

  while (selected.length < 6 && remaining.length > 0) {
    if (selected.length === 0) {
      selected.push(remaining.shift()!);
      continue;
    }

    let bestCandidateIdx = 0;
    let bestMmrScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i];
      let maxSim = 0;

      // Measure similarity to already selected items
      for (const sel of selected) {
        let sim = 0;

        // Shared primary genre
        const sharedGenres = cand.metadata.genres.filter((g) => sel.metadata.genres.includes(g));
        sim += sharedGenres.length * 0.3;

        // Same studio / show / director
        if (cand.metadata.studio && cand.metadata.studio === sel.metadata.studio) sim += 0.3;
        const sharedDirectors = cand.metadata.directors.filter((d) => sel.metadata.directors.includes(d));
        sim += sharedDirectors.length * 0.4;

        if (sim > maxSim) maxSim = sim;
      }

      // MMR Score = rawScore - 0.3 * similarityPenalty
      const mmrScore = (cand.rawScore || 0) - 0.3 * maxSim;
      if (mmrScore > bestMmrScore) {
        bestMmrScore = mmrScore;
        bestCandidateIdx = i;
      }
    }

    selected.push(remaining.splice(bestCandidateIdx, 1)[0]);
  }

  // Guarantee at least 1 TV show in final set if profile has watched TV shows
  if (hasWatchedTv) {
    const hasTvInSelected = selected.some((s) => s.isTvShow);
    if (!hasTvInSelected) {
      const topTvCandidate = candidatePool.find((c) => c.isTvShow && !selected.some((s) => s.id === c.id));
      if (topTvCandidate && selected.length >= 6) {
        selected[5] = topTvCandidate; // Swap 6th candidate with top TV show
      } else if (topTvCandidate) {
        selected.push(topTvCandidate);
      }
    }
  }

  // Build final recommendations array
  const finalRecommendations: HeroRecommendation[] = selected.slice(0, 6).map((item) => ({
    movie: item.representativeMovie,
    score: item.rawScore || 0.75,
    whyTag: item.whyTag || "Recommended for You",
  }));

  return {
    updatedAt: new Date().toISOString(),
    isColdStart: false,
    recommendations: finalRecommendations,
  };
}

/**
 * PHASE D — Cold Start Fallback Generator
 * Blends household-wide popular, highest-rated, and recently added items.
 */
function generateColdStartRecommendations(
  profile: Profile,
  allProfiles: Profile[],
  moviesCatalog: Movie[],
  candidates: CandidateItem[],
  recentlyShownIds: Set<string>
): HeroRecommendation[] {
  // Aggregate household watch counts across all profiles
  const householdWatchCounts = new Map<string, number>();
  allProfiles.forEach((p) => {
    Object.keys(p.watchHistory || {}).forEach((movieId) => {
      householdWatchCounts.set(movieId, (householdWatchCounts.get(movieId) || 0) + 1);
    });
  });

  const scoredCandidates = candidates.map((cand) => {
    const movie = cand.representativeMovie;

    // Household popularity score
    const watchCount = householdWatchCounts.get(movie.id) || 0;
    const popScore = Math.min(1.0, watchCount / 3.0);

    // Rating score
    const rating = cand.metadata.rating ?? 7.5;
    const ratingScore = rating / 10.0;

    // Freshness score
    const ageDays = (Date.now() - new Date(movie.added).getTime()) / (1000 * 60 * 60 * 24);
    const freshnessScore = Math.exp(-ageDays / 60.0);

    // Blended cold start score
    const score = popScore * 0.4 + ratingScore * 0.4 + freshnessScore * 0.2;

    let whyTag = "Featured Title";
    if (watchCount >= 2) {
      whyTag = "Household Favorite";
    } else if (rating >= 8.0) {
      whyTag = "Highest Rated in Library";
    } else if (ageDays <= 30) {
      whyTag = "Recently Added";
    } else if (cand.metadata.genres.length > 0) {
      whyTag = `Popular in ${cand.metadata.genres[0]}`;
    }

    return {
      movie,
      score: parseFloat(score.toFixed(4)),
      whyTag,
    };
  });

  // Sort by cold start blended score
  scoredCandidates.sort((a, b) => b.score - a.score);

  return scoredCandidates.slice(0, 6).map((item) => ({
    movie: item.movie,
    score: item.score,
    whyTag: item.whyTag,
  }));
}
