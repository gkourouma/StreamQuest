const express = require("express");
const router = express.Router();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const Movie = require("../models/movie.js");
const mongoose = require("mongoose");
const Watchlist = require("../models/watchlist.js");

router.get("/:movieId", async (req, res) => {
  try {
    const movieId = req.params.movieId;
    let movie;

    // Handle both Mongo ObjectId and TMDB numeric ID
    if (mongoose.Types.ObjectId.isValid(movieId)) {
      movie = await Movie.findById(movieId);
    }
    if (!movie) {
      movie = await Movie.findOne({ tmdbId: Number(movieId) });
    }

    if (!movie) {
      return res.status(404).send("Movie not found.");
    }

    // Runtime formatter
    function formatRuntime(mins) {
      if (!mins) return "N/A";
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h}h ${m}m`;
    }

    const tmdbId = movie.tmdbId;
    const mediaType = movie.type === "tv" ? "tv" : "movie";

    // Get similar from TMDB
    const similarRes = await fetch(
      `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/similar?api_key=${TMDB_API_KEY}&language=en-US`
    );
    const similarData = await similarRes.json();

    let similarMovies = [];

    if (Array.isArray(similarData.results)) {
      // Sort, slice, and filter
      const sortedSimilar = similarData.results
        .filter((sim) => sim.poster_path && (sim.title || sim.name))
        .sort(
          (a, b) =>
            new Date(b.release_date || b.first_air_date) -
            new Date(a.release_date || a.first_air_date)
        )
        .slice(0, 10);

      const ids = sortedSimilar.map((r) => r.id);
      const existing = await Movie.find({ tmdbId: { $in: ids } });

      similarMovies = sortedSimilar
        .filter((sim) => existing.find((e) => e.tmdbId === sim.id))
        .map((sim) => {
          const match = existing.find((e) => e.tmdbId === sim.id);
          return {
            title: match.title,
            poster: match.poster,
            _id: match._id,
            type: match.type,
          };
        });
    } else {
      console.error(" similarData.results is not an array:", similarData);
    }

    // Fallback: recommended by genre
    let recommended = [];
    if (!similarMovies.length && movie.genre?.length) {
      recommended = await Movie.find({
        genre: { $in: movie.genre },
        _id: { $ne: movie._id },
        poster: { $ne: "" },
      })
        .sort({ releaseDate: -1 })
        .limit(10);
    }

    const userWatchlists = await Watchlist.find({ user: req.session.user._id });

    res.render("user/show", {
      movie,
      formatRuntime,
      similarMovies,
      recommended,
      watchlists: userWatchlists,
    });
  } catch (error) {
    console.error(" Error loading show page:", error);
    res.redirect("/");
  }
});

module.exports = router;
