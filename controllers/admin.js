const express = require("express");
const router = express.Router();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const Movie = require("../models/movie.js");
const parseTMDBMovieData = require("../utils/tmdbMovieParser");
const isAdmin = require("../middleware/is-admin");
const isSignedIn = require("../middleware/signed-in.js");
const genreMap = require("../utils/genreMap");
const mongoose = require("mongoose");

router.get("/import", isSignedIn, isAdmin, async (req, res) => {
  const category = req.query.category; // e.g. popular, top_rated, discover
  const genreId = req.query.genre; // optional: used only in discover
  const mediaType = req.query.type || "movie"; // "movie" or "tv"

  try {
    let apiUrl;
    if (category === "discover") {
      apiUrl = `https://api.themoviedb.org/3/discover/${mediaType}?api_key=${TMDB_API_KEY}&language=en-US&page=1`;
      if (genreId) apiUrl += `&with_genres=${genreId}`;
    } else {
      apiUrl = `https://api.themoviedb.org/3/${mediaType}/${category}?api_key=${TMDB_API_KEY}&language=en-US&page=1`;
    }

    const resTMDB = await fetch(apiUrl);
    if (!resTMDB.ok) {
      console.error("❌ TMDB fetch failed:", resTMDB.status);
      return res.status(500).send("TMDB API fetch failed.");
    }

    const data = await resTMDB.json();
    if (!Array.isArray(data.results)) {
      console.error("❌ TMDB response is not iterable:", data);
      return res.status(500).send("Invalid TMDB response format.");
    }

    let imported = 0;
    let skipped = 0;

    for (const tmdbMovie of data.results) {
      try {
        const exists = await Movie.findOne({ tmdbId: tmdbMovie.id });
        if (exists) {
          skipped++;
          continue;
        }

        const detailUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbMovie.id}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos,similar`;
        const detailRes = await fetch(detailUrl);

        if (!detailRes.ok) {
          console.warn(`⚠️ Detail fetch failed for ID ${tmdbMovie.id}`);
          skipped++;
          continue;
        }

        const fullData = await detailRes.json();
        const newMovie = parseTMDBMovieData(fullData, category, mediaType);
        newMovie.type = mediaType;
        newMovie.source = category;
        newMovie.lastUpdated = new Date();

        await Movie.create(newMovie);
        imported++;
        console.log(`✅ Imported: ${newMovie.title}`);
      } catch (err) {
        console.error(`❌ Error importing TMDB ID ${tmdbMovie.id}:`, err);
        skipped++;
      }
    }

    res.send({
      message: `✅ Imported ${imported} ${mediaType}s from '${category}'`,
      imported,
      skipped,
      category,
      genre: genreId || null,
      type: mediaType,
    });
  } catch (err) {
    console.error("❌ Import error:", err);
    res.status(500).send("Import failed.");
  }
});


router.get("/update-all-movies", isSignedIn, isAdmin, async (req, res) => {
  try {
    const movies = await Movie.find();
    let updatedCount = 0;
    let skippedCount = 0;

    for (let movie of movies) {
      if (!movie.tmdbId) {
        console.log(`⛔ Skipping ${movie.title || movie.name} — missing tmdbId`);
        skippedCount++;
        continue;
      }

      const type = movie.type || "movie";
      const detailUrl = `https://api.themoviedb.org/3/${type}/${movie.tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos`;
      const response = await fetch(detailUrl);
      if (!response.ok) {
        console.log(`❌ TMDB fetch failed for: ${movie.title || movie.name}`);
        skippedCount++;
        continue;
      }

      const tmdbData = await response.json();
      const trailer = tmdbData.videos?.results?.find(
        v => v.type === "Trailer" && v.site === "YouTube"
      );
      
      movie.trailer = trailer ? `https://www.youtube.com/embed/${trailer.key}` : movie.trailer;
      
      const newTitle = tmdbData.title || tmdbData.name;
      const newRelease = tmdbData.release_date || tmdbData.first_air_date;
      const newPoster = tmdbData.poster_path
        ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`
        : null;

      if (!newTitle) {
        console.log(`⚠️ No title found for TMDB ID ${movie.tmdbId}`);
        skippedCount++;
        continue;
      }

      // Update fields
      movie.title = newTitle;
      movie.overview = tmdbData.overview || movie.overview;
      movie.poster = newPoster || movie.poster;
      movie.backdrop = tmdbData.backdrop_path
        ? `https://image.tmdb.org/t/p/original${tmdbData.backdrop_path}`
        : movie.backdrop;
      movie.rating = tmdbData.vote_average || movie.rating;
      movie.releaseDate = newRelease ? new Date(newRelease) : movie.releaseDate;
      movie.run_time = tmdbData.runtime || movie.run_time;
      movie.type = type;
      movie.lastUpdated = new Date();

      if (tmdbData.credits?.cast) {
        movie.credits = {
          cast: tmdbData.credits.cast.slice(0, 4).map((actor) => ({
            name: actor.name,
            character: actor.character,
            profilePath: actor.profile_path,
          })),
        };
      }

      if (type === "tv") {
        movie.number_of_seasons = tmdbData.number_of_seasons || movie.number_of_seasons;
        movie.number_of_episodes = tmdbData.number_of_episodes || movie.number_of_episodes;
        
        console.log(`${movie.title}: ${tmdbData.number_of_seasons} seasons, ${tmdbData.number_of_episodes} episodes`);
      }


      // Save similar section
      const similarUrl = `https://api.themoviedb.org/3/${type}/${movie.tmdbId}/similar?api_key=${TMDB_API_KEY}&language=en-US`;
      const similarRes = await fetch(similarUrl);
      const similarData = await similarRes.json();

      movie.similar = Array.isArray(similarData.results)
        ? similarData.results
            .filter((sim) => sim.poster_path && (sim.title || sim.name))
            .slice(0, 10)
            .map((sim) => ({
              title: sim.title || sim.name,
              poster: `https://image.tmdb.org/t/p/w300${sim.poster_path}`,
              tmdbId: sim.id,
            }))
        : [];

      await movie.save();
      updatedCount++;
      console.log(`✅ Updated: ${movie.title}`);
    }

    res.send({
      message: "✅ Movie update complete.",
      totalMovies: movies.length,
      updated: updatedCount,
      skipped: skippedCount,
    });
  } catch (err) {
    console.error("❌ Error updating movies:", err);
    res.status(500).send("Update failed.");
  }
});


router.get("/import-dashboard", isSignedIn, isAdmin, async (req, res) => {
  try {
    const recentMovies = await Movie.find()
      .sort({ lastUpdated: -1 })
      .limit(5);

    res.render("admin/import-dashboard", {
      genreMap,
      recentMovies,
    });
  } catch (err) {
    console.error("❌ Error loading dashboard:", err);
    req.session.error = "Failed to load admin dashboard.";
    res.redirect("/admin/import-dashboard");
  }
});

router.get("/batch-update-type", isSignedIn, isAdmin, async (req, res) => {
  const TMDB_API_KEY = process.env.TMDB_API_KEY;

  try {
    const allMedia = await Movie.find();
    let updated = 0;

    for (let media of allMedia) {
      if (!media.title) continue;

      const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
        media.title
      )}`;
      const response = await fetch(searchUrl);
      const data = await response.json();
      const match = data.results?.[0];

      if (
        match &&
        (match.media_type === "movie" || match.media_type === "tv")
      ) {
        media.type = match.media_type;
        await media.save();
        updated++;
        console.log(`✅ Updated ${media.title} → ${match.media_type}`);
      } else {
        console.log(`❌ No valid match for: ${media.title}`);
      }
    }

    res.send(`✅ Batch type update complete. ${updated} items updated.`);
  } catch (err) {
    console.error("❌ Error in batch-update-type:", err);
    res.status(500).send("Batch type update failed.");
  }
});

router.get("/import/trending", isSignedIn, isAdmin, async (req, res) => {
  const TMDB_API_KEY = process.env.TMDB_API_KEY;

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_API_KEY}`
    );
    const data = await response.json();

    console.log("TMDB trending results:", data.results?.length || 0);

    if (!Array.isArray(data.results)) {
      return res.status(500).send("Invalid response from TMDB");
    }

    let imported = 0;
    let skipped = 0;

    for (const item of data.results) {
      // Skip items with missing IDs or unsupported types
      if (!item.id || !["movie", "tv"].includes(item.media_type)) {
        console.log("❌ Skipped unsupported or missing media_type:", item);
        skipped++;
        continue;
      }

      const exists = await Movie.findOne({ tmdbId: item.id });
      if (exists) {
        console.log(`⏭️ Already exists: ${item.title || item.name}`);
        skipped++;
        continue;
      }

      const detailUrl =
        item.media_type === "movie"
          ? `https://api.themoviedb.org/3/movie/${item.id}?api_key=${TMDB_API_KEY}&append_to_response=credits`
          : `https://api.themoviedb.org/3/tv/${item.id}?api_key=${TMDB_API_KEY}&append_to_response=credits`;

      const detailRes = await fetch(detailUrl);
      const fullData = await detailRes.json();

      const newMovie = parseTMDBMovieData(fullData, "trending", item.media_type);
      newMovie.type = item.media_type;
      newMovie.source = "trending";

      await Movie.create(newMovie);
      imported++;
      console.log(`✅ Imported: ${newMovie.title}`);
    }

    res.send(`✅ Imported ${imported} trending movies/TV shows. Skipped: ${skipped}`);
  } catch (err) {
    console.error("❌ Trending import failed:", err);
    res.status(500).send("Trending import failed.");
  }
});

module.exports = router;
