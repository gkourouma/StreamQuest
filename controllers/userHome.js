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
    });
  } catch (error) {
    console.error("❌ Error rendering homepage:", error);
    res.redirect("/");
  }
});


// router.get('/import-upcoming', async (req, res) => {
//   const TMDB_API_KEY = process.env.TMDB_API_KEY;

//   try {
//     const upcomingRes = await fetch(
//       `https://api.themoviedb.org/3/movie/upcoming?api_key=${TMDB_API_KEY}&language=en-US&page=1`
//     );
//     const data = await upcomingRes.json();

//     let imported = 0;

//     for (const movie of data.results) {
//       const exists = await Movie.findOne({ tmdbId: movie.id });
//       if (exists) continue;

//       await Movie.create({
//         tmdbId: movie.id,
//         title: movie.title,
//         overview: movie.overview,
//         genre: [], // You can add genre handling later
//         poster: `https://image.tmdb.org/t/p/w300${movie.poster_path}`,
//         rating: movie.vote_average,
//         releaseDate: movie.release_date ? new Date(movie.release_date) : null,
//         runTime: movie.runtime // Might need separate call
//       });

//       imported++;
//     }

//     res.send(`✅ Imported ${imported} new movies from TMDB.`);
//   } catch (err) {
//     console.error("Failed to import:", err);
//     res.status(500).send("Something went wrong.");
//   }
// });

// router.get("/update-all-movies", async (req, res) => {
//   const TMDB_API_KEY = process.env.TMDB_API_KEY;

//   try {
//     const movies = await Movie.find();
//     let updatedCount = 0;

//     for (let movie of movies) {
//       let tmdbData = null;

//       // ✅ Fetch by tmdbId if available
//       if (movie.tmdbId) {
//         const resById = await fetch(`https://api.themoviedb.org/3/movie/${movie.tmdbId}?api_key=${TMDB_API_KEY}`);
//         if (resById.ok) {
//           tmdbData = await resById.json();
//         }
//       }

//       // ✅ Fallback: search by title
//       if (!tmdbData) {
//         const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(movie.title)}`;
//         const searchRes = await fetch(searchUrl);
//         const searchData = await searchRes.json();
//         const match = searchData.results[0];

//         if (match) {
//           movie.tmdbId = match.id; // Save TMDB ID for future
//           const detailedRes = await fetch(`https://api.themoviedb.org/3/movie/${match.id}?api_key=${TMDB_API_KEY}`);
//           if (detailedRes.ok) {
//             tmdbData = await detailedRes.json();
//           }
//         }
//       }

//       // ✅ If TMDB data found, update the movie
//       if (tmdbData) {
//         movie.overview = tmdbData.overview || movie.overview;
//         movie.poster = tmdbData.poster_path
//           ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`
//           : movie.poster;
//         movie.rating = tmdbData.vote_average || movie.rating;
//         movie.releaseDate = tmdbData.release_date ? new Date(tmdbData.release_date) : movie.releaseDate;
//         movie.run_time = tmdbData.runtime || movie.run_time;

//         await movie.save();
//         updatedCount++;
//         console.log(`✅ Updated: ${movie.title}`);
//       } else {
//         console.log(`❌ No TMDB match found for: ${movie.title}`);
//       }
//     }

//     res.send(`✅ Updated ${updatedCount} movies using TMDB (including runtime).`);
//   } catch (error) {
//     console.error("❌ Error updating movies:", error);
//     res.status(500).send("Error updating movies.");
//   }
// });

// router.get("/batch-update-type", async (req, res) => {
//   const TMDB_API_KEY = process.env.TMDB_API_KEY;
//   const allMedia = await Movie.find();

//   for (let media of allMedia) {
//     try {
//       const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
//         media.title
//       )}`;
//       const response = await fetch(searchUrl);
//       const data = await response.json();
//       const match = data.results[0];

//       if (
//         match &&
//         (match.media_type === "movie" || match.media_type === "tv")
//       ) {
//         media.type = match.media_type;
//         await media.save();
//         console.log(`Updated ${media.title} to type: ${match.media_type}`);
//       }
//     } catch (err) {
//       console.log(`Error updating ${media.title}:`, err);
//     }
//   }

//   res.send("Batch type update complete.");
// });

// router.get("/upcoming", async (req, res) => {
//   try {
//     const url = `https://api.themoviedb.org/3/movie/upcoming?api_key=${TMDB_API_KEY}&language=en-US&page=1`;
//     const response = await fetch(url);
//     const data = await response.json();

//     res.render("user/upcoming", { upcoming: data.results });
//   } catch (error) {
//     console.log(error);
//     res.redirect("/");
//   }
// });

// router.get("/unify-release-dates", async (req, res) => {
//   try {
//     const movies = await Movie.find();
//     let updated = 0;

//     for (let movie of movies) {
//       let parsedDate = null;

//       // Case 1: If release_year exists and looks like a full date string
//       if (movie.release_year && typeof movie.release_year === "string") {
//         parsedDate = new Date(movie.release_year);
//         if (isNaN(parsedDate)) parsedDate = null; // safety fallback
//       }

//       // Case 2: If no full date, fall back to releaseYear (year only)
//       if (!parsedDate && movie.releaseYear && typeof movie.releaseYear === "number") {
//         parsedDate = new Date(movie.releaseYear, 0, 1); // Jan 1 of that year
//       }

//       // Save unified field
//       if (parsedDate) {
//         movie.releaseDate = parsedDate;
//         await movie.save();
//         updated++;
//         console.log(`✅ Updated releaseDate for: ${movie.title}`);
//       } else {
//         console.log(`⚠️ Skipped: ${movie.title} — no date could be parsed`);
//       }

//       if (movie.releaseDate) {
//         console.log(`⏭️ Already has releaseDate: ${movie.title}`);
//         continue;
//       }

//     }

//     res.send(`✅ Unified releaseDate for ${updated} movies.`);
//   } catch (err) {
//     console.error("❌ Error unifying release dates:", err);
//     res.status(500).send("Error updating release dates.");
//   }
// });

module.exports = router;
