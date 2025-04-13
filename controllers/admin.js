const express = require("express");
const router = express.Router();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const Movie = require("../models/movie.js");
const parseTMDBMovieData = require("../utils/tmdbMovieParser");
const isAdmin = require("../middleware/is-admin");
const isSignedIn = require("../middleware/signed-in.js");
const genreMap = require("../utils/genreMap");

router.get("/import", isSignedIn, isAdmin, async (req, res) => {
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  const category = req.query.category; // e.g. upcoming, popular, top_rated
  const genreId = req.query.genre; // genre filter for discover

  try {
    let apiUrl;

    if (category === "discover") {
      // If a genre is provided, add it to the query string
      apiUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&page=1`;

      if (genreId) {
        apiUrl += `&with_genres=${genreId}`;
      }
    } else {
      apiUrl = `https://api.themoviedb.org/3/movie/${category}?api_key=${TMDB_API_KEY}&language=en-US&page=1`;
    }

    const resTMDB = await fetch(apiUrl);
    const data = await resTMDB.json();

    if (!Array.isArray(data.results)) {
      console.error("❌ TMDB response is not iterable:", data);
      return res.status(500).send("Invalid TMDB response format.");
    }

    let imported = 0;

    for (const tmdbMovie of data.results) {
      const exists = await Movie.findOne({ tmdbId: tmdbMovie.id });
      if (exists) continue;

      // Get detailed + credits
      const detailRes = await fetch(
        `https://api.themoviedb.org/3/movie/${tmdbMovie.id}?api_key=${TMDB_API_KEY}&append_to_response=credits`
      );
      const fullData = await detailRes.json();
      const newMovie = parseTMDBMovieData(fullData);
      await Movie.create(newMovie);
      imported++;
         console.log(`✅ Imported: ${newMovie.title}`);
    }

    res.send(
      `✅ Imported ${imported} movies from '${category}' ${
        genreId ? `with genre ID ${genreId}` : ""
      }`
    );
  } catch (err) {
    console.error("❌ Import error:", err);
    res.status(500).send("Import failed.");
  }
});

router.get("/update-all-movies", isSignedIn, isAdmin, async (req, res) => {
  const TMDB_API_KEY = process.env.TMDB_API_KEY;

  try {
    const movies = await Movie.find();
    let updatedCount = 0;

    for (let movie of movies) {
      let tmdbData = null;

      // ✅ Fetch by tmdbId if available
      if (movie.tmdbId) {
        const resById = await fetch(
          `https://api.themoviedb.org/3/movie/${movie.tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits`
        );
        if (resById.ok) {
          tmdbData = await resById.json();
        }
      }

      // ✅ Fallback: search by title
      if (!tmdbData) {
        const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
          movie.title
        )}`;
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();
        const match = searchData.results[0];

        if (match) {
          movie.tmdbId = match.id; // Save TMDB ID for future
          const detailedRes = await fetch(
            `https://api.themoviedb.org/3/movie/${match.id}?api_key=${TMDB_API_KEY}`
          );
          if (detailedRes.ok) {
            tmdbData = await detailedRes.json();
          }
        }
      }

      // ✅ If TMDB data found, update the movie
      if (tmdbData) {
        movie.overview = tmdbData.overview || movie.overview;
        movie.poster = tmdbData.poster_path
          ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`
          : movie.poster;
        movie.rating = tmdbData.vote_average || movie.rating;
        movie.releaseDate = tmdbData.release_date
          ? new Date(tmdbData.release_date)
          : movie.releaseDate;
        movie.run_time = tmdbData.runtime || movie.run_time;
        movie.backdrop = tmdbData.backdrop_path
          ? `https://image.tmdb.org/t/p/original${tmdbData.backdrop_path}`
          : movie.backdrop;
        movie.credits = {
          cast: tmdbData.credits.cast.slice(0, 4).map((actor) => ({
            name: actor.name,
            character: actor.character,
            profilePath: actor.profile_path, //
          })),
        };

        const similarRes = await fetch(
          `https://api.themoviedb.org/3/movie/${movie.tmdbId}/similar?api_key=${TMDB_API_KEY}&language=en-US`
        );
        const similarData = await similarRes.json();

        movie.similar = similarData.results.slice(0, 10).map((sim) => ({
          title: sim.title,
          poster: sim.poster_path
            ? `https://image.tmdb.org/t/p/w300${sim.poster_path}`
            : "",
          tmdbId: sim.id,
        }));

        await movie.save();
        updatedCount++;
        console.log(`✅ Updated: ${movie.title}`);
      } else {
        console.log(`❌ No TMDB match found for: ${movie.title}`);
      }
    }

    res.send(
      `✅ Updated ${updatedCount} movies using TMDB (including runtime).`
    );
  } catch (error) {
    console.error("❌ Error updating movies:", error);
    res.status(500).send("Error updating movies.");
  }
});

router.get("/import-dashboard", isSignedIn, isAdmin, (req, res) => {
  res.render("admin/import-dashboard", { genreMap });
});

router.get("/batch-update-type", isSignedIn, isAdmin, async (req, res) => {
    const TMDB_API_KEY = process.env.TMDB_API_KEY;
  
    try {
      const allMedia = await Movie.find();
      let updated = 0;
  
      for (let media of allMedia) {
        if (!media.title) continue;
  
        const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(media.title)}`;
        const response = await fetch(searchUrl);
        const data = await response.json();
        const match = data.results?.[0];
  
        if (match && (match.media_type === "movie" || match.media_type === "tv")) {
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
//       if (
//         !parsedDate &&
//         movie.releaseYear &&
//         typeof movie.releaseYear === "number"
//       ) {
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
