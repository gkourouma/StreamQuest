const express = require('express')
const router = express.Router()
const TMDB_API_KEY = process.env.TMDB_API_KEY
const Movie = require("../models/movie.js")


router.get("/:movieId", async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.movieId); 
    if (!movie) {
      return res.status(404).send("Movie not found.");
    }

    function formatRuntime(mins) {
      if (!mins) return "N/A";
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h}h ${m}m`;
    }

    const tmdbId = movie.tmdbId; // make sure you have the TMDB ID
    const similar = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/similar?api_key=${TMDB_API_KEY}&language=en-US`)
    const similarData = await similar.json();
    const similarMovies = similarData.results.slice(0, 10);

    console.log("✅ Movie found:", movie.title);

    res.render("user/show", {movie, formatRuntime, similarMovies});
  } catch (error) {
    console.log(error);
    res.redirect("/")
  }
})

module.exports = router;