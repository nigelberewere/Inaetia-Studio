import { describe, it, expect } from "vitest";
import { parseNfoFromString } from "../nfoReader";
import { getSimilarMovies } from "../recommendationEngine";
import { Movie } from "../types";

describe("TMM NFO Parser & Content Extraction", () => {
  it("parses rich TMM XML metadata including collections, tags, multiple directors, studios, and ratings", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>
<movie>
    <title>Iron Man</title>
    <originaltitle>Iron Man</originaltitle>
    <set>
        <name>Iron Man Collection</name>
        <overview>The Iron Man trilogy.</overview>
    </set>
    <year>2008</year>
    <ratings>
        <rating default="true" max="10" name="imdb">
            <value>7.9</value>
            <votes>1050000</votes>
        </rating>
    </ratings>
    <mpaa>PG-13</mpaa>
    <genre>Action</genre>
    <genre>Science Fiction</genre>
    <genre>Adventure</genre>
    <tag>marvel cinematic universe</tag>
    <tag>superhero</tag>
    <tag>based on comic</tag>
    <director>Jon Favreau</director>
    <credits>Mark Fergus</credits>
    <credits>Hawk Ostby</credits>
    <studio>Marvel Studios</studio>
    <studio>Paramount</studio>
    <actor>
        <name>Robert Downey Jr.</name>
        <role>Tony Stark / Iron Man</role>
    </actor>
    <actor>
        <name>Gwyneth Paltrow</name>
        <role>Pepper Potts</role>
    </actor>
    <actor>
        <name>Jeff Bridges</name>
        <role>Obadiah Stane</role>
    </actor>
    <plot>After being held captive in an Afghan cave, billionaire engineer Tony Stark creates a unique weaponized suit of armor to fight evil.</plot>
    <tagline>Heroes aren't born. They're built.</tagline>
</movie>`;

    const parsed = parseNfoFromString(xml);
    expect(parsed).not.toBeNull();
    expect(parsed?.title).toBe("Iron Man");
    expect(parsed?.set).toBe("Iron Man Collection");
    expect(parsed?.year).toBe(2008);
    expect(parsed?.rating).toBe(7.9);
    expect(parsed?.votes).toBe(1050000);
    expect(parsed?.mpaa).toBe("PG-13");
    expect(parsed?.genres).toEqual(["Action", "Science Fiction", "Adventure"]);
    expect(parsed?.tags).toEqual(["marvel cinematic universe", "superhero", "based on comic"]);
    expect(parsed?.directors).toEqual(["Jon Favreau"]);
    expect(parsed?.writers).toEqual(["Mark Fergus", "Hawk Ostby"]);
    expect(parsed?.studios).toEqual(["Marvel Studios", "Paramount"]);
    expect(parsed?.actors).toHaveLength(3);
    expect(parsed?.actors[0].name).toBe("Robert Downey Jr.");
  });

  it("handles string <set> and <premiered> fallback for year", () => {
    const xml = `<movie>
      <title>The Matrix</title>
      <set>The Matrix Collection</set>
      <premiered>1999-03-31</premiered>
      <rating>8.7</rating>
      <director>Lana Wachowski / Lilly Wachowski</director>
      <genre>Action / Sci-Fi</genre>
      <tag>cyberpunk, artificial intelligence</tag>
    </movie>`;

    const parsed = parseNfoFromString(xml);
    expect(parsed?.title).toBe("The Matrix");
    expect(parsed?.set).toBe("The Matrix Collection");
    expect(parsed?.year).toBe(1999);
    expect(parsed?.rating).toBe(8.7);
    expect(parsed?.directors).toEqual(["Lana Wachowski", "Lilly Wachowski"]);
    expect(parsed?.genres).toEqual(["Action", "Sci-Fi"]);
    expect(parsed?.tags).toEqual(["cyberpunk", "artificial intelligence"]);
  });
});

describe("TMM More Like This Recommendation Engine", () => {
  const catalog: Movie[] = [
    {
      id: "m1",
      title: "Iron Man",
      filename: "Iron.Man.2008.mkv",
      filepath: "Iron.Man.2008.mkv",
      size: 1000,
      duration: 7200,
      thumbnail: "/thumb/1",
      extension: ".mkv",
      added: "2026-01-01T00:00:00.000Z",
      type: "movie",
      category: "Movies",
      set: "Iron Man Collection",
      year: 2008,
      rating: 7.9,
      genres: ["Action", "Sci-Fi"],
      tags: ["superhero", "marvel cinematic universe", "billionaire"],
      director: "Jon Favreau",
      directors: ["Jon Favreau"],
      studio: "Marvel Studios",
      studios: ["Marvel Studios"],
      actors: [
        { name: "Robert Downey Jr.", role: "Tony Stark" },
        { name: "Gwyneth Paltrow", role: "Pepper Potts" },
      ],
      plot: "Billionaire engineer Tony Stark builds high tech armor suits.",
    },
    {
      id: "m2",
      title: "Iron Man 2",
      filename: "Iron.Man.2.2010.mkv",
      filepath: "Iron.Man.2.2010.mkv",
      size: 1000,
      duration: 7200,
      thumbnail: "/thumb/2",
      extension: ".mkv",
      added: "2026-01-01T00:00:00.000Z",
      type: "movie",
      category: "Movies",
      set: "Iron Man Collection",
      year: 2010,
      rating: 7.0,
      genres: ["Action", "Sci-Fi"],
      tags: ["superhero", "marvel cinematic universe"],
      director: "Jon Favreau",
      directors: ["Jon Favreau"],
      studio: "Marvel Studios",
      studios: ["Marvel Studios"],
      actors: [
        { name: "Robert Downey Jr.", role: "Tony Stark" },
        { name: "Don Cheadle", role: "War Machine" },
      ],
      plot: "With the world now aware of his identity as Iron Man, Tony Stark faces pressure.",
    },
    {
      id: "m3",
      title: "Captain America: Civil War",
      filename: "Cap.Civil.War.2016.mkv",
      filepath: "Cap.Civil.War.2016.mkv",
      size: 1000,
      duration: 8000,
      thumbnail: "/thumb/3",
      extension: ".mkv",
      added: "2026-01-01T00:00:00.000Z",
      type: "movie",
      category: "Movies",
      set: "Captain America Collection",
      year: 2016,
      rating: 7.8,
      genres: ["Action", "Sci-Fi"],
      tags: ["superhero", "marvel cinematic universe"],
      director: "Anthony Russo, Joe Russo",
      directors: ["Anthony Russo", "Joe Russo"],
      studio: "Marvel Studios",
      studios: ["Marvel Studios"],
      actors: [
        { name: "Chris Evans", role: "Steve Rogers" },
        { name: "Robert Downey Jr.", role: "Tony Stark" },
      ],
      plot: "Political involvement in the Avengers cause a rift between Captain America and Iron Man.",
    },
    {
      id: "m4",
      title: "Inception",
      filename: "Inception.2010.mkv",
      filepath: "Inception.2010.mkv",
      size: 1000,
      duration: 8800,
      thumbnail: "/thumb/4",
      extension: ".mkv",
      added: "2026-01-01T00:00:00.000Z",
      type: "movie",
      category: "Movies",
      year: 2010,
      rating: 8.8,
      genres: ["Action", "Sci-Fi", "Thriller"],
      tags: ["dream", "mind", "subconscious", "heist"],
      director: "Christopher Nolan",
      directors: ["Christopher Nolan"],
      studio: "Warner Bros. Pictures",
      studios: ["Warner Bros. Pictures", "Syncopy"],
      actors: [
        { name: "Leonardo DiCaprio", role: "Cobb" },
        { name: "Joseph Gordon-Levitt", role: "Arthur" },
        { name: "Elliot Page", role: "Ariadne" },
      ],
      plot: "A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.",
    },
    {
      id: "m5",
      title: "Interstellar",
      filename: "Interstellar.2014.mkv",
      filepath: "Interstellar.2014.mkv",
      size: 1000,
      duration: 10000,
      thumbnail: "/thumb/5",
      extension: ".mkv",
      added: "2026-01-01T00:00:00.000Z",
      type: "movie",
      category: "Movies",
      year: 2014,
      rating: 8.7,
      genres: ["Sci-Fi", "Drama", "Adventure"],
      tags: ["space travel", "black hole", "wormhole"],
      director: "Christopher Nolan",
      directors: ["Christopher Nolan"],
      studio: "Paramount",
      studios: ["Paramount", "Warner Bros. Pictures", "Syncopy"],
      actors: [
        { name: "Matthew McConaughey", role: "Cooper" },
        { name: "Anne Hathaway", role: "Brand" },
      ],
      plot: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    },
    {
      id: "m6",
      title: "Finding Nemo",
      filename: "Finding.Nemo.2003.mkv",
      filepath: "Finding.Nemo.2003.mkv",
      size: 1000,
      duration: 6000,
      thumbnail: "/thumb/6",
      extension: ".mkv",
      added: "2026-01-01T00:00:00.000Z",
      type: "movie",
      category: "Movies",
      set: "Finding Nemo Collection",
      year: 2003,
      rating: 8.2,
      genres: ["Animation", "Adventure", "Comedy"],
      tags: ["ocean", "fish", "family", "father son"],
      director: "Andrew Stanton",
      directors: ["Andrew Stanton"],
      studio: "Pixar",
      studios: ["Pixar", "Walt Disney Pictures"],
      actors: [
        { name: "Albert Brooks", role: "Marlin" },
        { name: "Ellen DeGeneres", role: "Dory" },
      ],
      plot: "After his son is captured in the Great Barrier Reef, a timid clownfish embarks on a journey to bring him home.",
    },
    {
      id: "m7",
      title: "Toy Story",
      filename: "Toy.Story.1995.mkv",
      filepath: "Toy.Story.1995.mkv",
      size: 1000,
      duration: 4800,
      thumbnail: "/thumb/7",
      extension: ".mkv",
      added: "2026-01-01T00:00:00.000Z",
      type: "movie",
      category: "Movies",
      set: "Toy Story Collection",
      year: 1995,
      rating: 8.3,
      genres: ["Animation", "Adventure", "Comedy"],
      tags: ["toys", "friendship", "rivalry"],
      director: "John Lasseter",
      directors: ["John Lasseter"],
      studio: "Pixar",
      studios: ["Pixar", "Walt Disney Pictures"],
      actors: [
        { name: "Tom Hanks", role: "Woody" },
        { name: "Tim Allen", role: "Buzz Lightyear" },
      ],
      plot: "A cowboy doll is profoundly threatened and jealous when a new spaceman figure supplants him as top toy in a boy's room.",
    }
  ];

  it("prioritizes same movie collection (TMM <set> tag) and gives human-readable reason", () => {
    const ironMan = catalog[0];
    const recs = getSimilarMovies(ironMan, catalog, 4);

    expect(recs.length).toBeGreaterThan(0);
    // Iron Man 2 should be the top recommendation because it shares the same collection, director, actor, genres, studio
    expect(recs[0].movie.title).toBe("Iron Man 2");
    expect(recs[0].matchReason).toContain("Iron Man");
    expect(recs[0].matchedFactors.collection).toBe("Iron Man Collection");
  });

  it("recommends Christopher Nolan movies when inspecting Inception (same director)", () => {
    const inception = catalog[3];
    const recs = getSimilarMovies(inception, catalog, 4);

    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].movie.title).toBe("Interstellar");
    expect(recs[0].matchReason).toBe("Directed by Christopher Nolan");
    expect(recs[0].matchedFactors.directors).toContain("Christopher Nolan");
  });

  it("recommends Pixar animated movies when inspecting Finding Nemo (same studio and genres)", () => {
    const nemo = catalog[5];
    const recs = getSimilarMovies(nemo, catalog, 4);

    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].movie.title).toBe("Toy Story");
    expect(recs[0].matchedFactors.studio).toBe("Pixar");
  });

  it("ensures recommendations are NOT the same for every movie", () => {
    const recsIronMan = getSimilarMovies(catalog[0], catalog, 4);
    const recsInception = getSimilarMovies(catalog[3], catalog, 4);
    const recsNemo = getSimilarMovies(catalog[5], catalog, 4);

    // Each movie must have distinct recommendations based on their rich TMM metadata!
    expect(recsIronMan[0].movie.id).not.toBe(recsInception[0].movie.id);
    expect(recsInception[0].movie.id).not.toBe(recsNemo[0].movie.id);
    expect(recsIronMan[0].movie.id).not.toBe(recsNemo[0].movie.id);

    // Self should never be in recommendations
    expect(recsIronMan.some(r => r.movie.id === catalog[0].id)).toBe(false);
    expect(recsInception.some(r => r.movie.id === catalog[3].id)).toBe(false);
    expect(recsNemo.some(r => r.movie.id === catalog[5].id)).toBe(false);
  });
});
