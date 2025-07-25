const express = require("express");
const router = express.Router();
const Movie = require("../models/movie.js");
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const mongoose = require("mongoose");

router.get("/homepage", async (req, res) => {
  let usedIds = [];
  const currentHour = new Date().getHours();
  let greeting =
    currentHour < 12
      ? "Good Morning"
      : currentHour < 18
      ? "Good Afternoon"
      : "Good Evening";

  try {
    const genreFilter =
      req.query.genre && req.query.genre !== "All"
        ? { genre: req.query.genre }
        : {};
    const ratingFilter =
      req.query.minRating && req.query.minRating !== "All"
        ? { rating: { $gte: Math.floor(parseFloat(req.query.minRating)) } }
        : {};
    const searchFilter = req.query.search
      ? { title: { $regex: req.query.search, $options: "i" } }
      : {};

    const filters = { ...genreFilter, ...ratingFilter, ...searchFilter };

    const filteredMovies = await Movie.find({
      ...filters,
      poster: { $ne: "" },
    });


    const popularRes = await fetch(
      `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=en-US`
    );
    const popularData = await popularRes.json();
    const slides = popularData.results.slice(0, 5);

    const trending = await Movie.find({
      source: "trending",
      poster: { $ne: "" }
    })
      .sort({ releaseDate: -1 })
      .limit(20);
    usedIds.push(...trending.map((m) => m._id));

    const actionMovies = await Movie.find({
      genre: { $in: ["Action"] },
      type: "movie",
      _id: { $nin: usedIds },
    })
      .sort({ releaseDate: -1 })
      .limit(20);
    usedIds.push(...actionMovies.map((m) => m._id));

    const dramaMovies = await Movie.find({
      genre: { $in: ["Drama"] },
      type: "movie",
      _id: { $nin: usedIds },
    })
      .sort({ releaseDate: -1 })
      .limit(20);
    usedIds.push(...dramaMovies.map((m) => m._id));

    const sciFiMovies = await Movie.find({
      genre: { $in: ["Science Fiction", "Sci-Fi"] },
      type: "movie",
      _id: { $nin: usedIds },
    })
      .sort({ releaseDate: -1 })
      .limit(20);
    usedIds.push(...sciFiMovies.map((m) => m._id));

    const crimeShows = await Movie.find({
      genre: { $in: ["Crime"] },
      type: "tv",
      _id: { $nin: usedIds },
    })
      .sort({ releaseDate: -1 })
      .limit(20);
    usedIds.push(...crimeShows.map((m) => m._id));

    const comedyTV = await Movie.find({
      genre: { $in: ["Comedy"] },
      type: "tv",
      _id: { $nin: usedIds },
    })
      .sort({ releaseDate: -1 })
      .limit(20);
    usedIds.push(...comedyTV.map((m) => m._id));

    const upcoming = await Movie.find({
      _id: { $nin: usedIds },
      poster: { $ne: "" }
    })
      .sort({ releaseDate: -1 })
      .limit(20);

    res.render("user/homepage", {
      greeting,
      filters,
      slides,
      genre: req.query.genre || "",
      minRating: req.query.minRating || "",
      search: req.query.search || "",
      upcoming,
      trending,
      actionMovies,
      dramaMovies,
      sciFiMovies,
      crimeShows,
      comedyTV,
      filteredMovies,
    });
  } catch (error) {
    console.error("❌ Error rendering homepage:", error);
    res.redirect("/");
  }
});

module.exports = router;
