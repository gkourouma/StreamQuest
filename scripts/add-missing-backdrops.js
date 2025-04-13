require("dotenv").config();
const mongoose = require("mongoose");
const fetch = require("node-fetch");
const Movie = require("../models/movie"); // adjust path as needed

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const DB_URI = process.env.MONGODB_URI;

mongoose.connect(DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

async function updateBackdrops() {
  const movies = await Movie.find({
    $or: [
      { backdrop: { $exists: false } },
      { backdrop: null },
      { backdrop: "" }
    ]
  });

  console.log(`🎬 Found ${movies.length} movies without backdrops.`);

  let updated = 0;

  for (let movie of movies) {
    if (!movie.tmdbId) {
        const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(movie.title)}`;
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();
        const match = searchData.results[0];
      
        if (match && match.id) {
          movie.tmdbId = match.id;
          console.log(`🔁 Found TMDB ID for ${movie.title}: ${match.id}`);
        } else {
          console.log(`🚫 Could not find TMDB ID for ${movie.title}`);
          continue; // skip this one if no match
        }
      }
      

    try {
      const res = await fetch(`https://api.themoviedb.org/3/movie/${movie.tmdbId}/images?api_key=${TMDB_API_KEY}`);
      const data = await res.json();
      const backdrop = data.backdrops?.[0]?.file_path;

      if (backdrop) {
        movie.backdrop = `https://image.tmdb.org/t/p/original${backdrop}`;
        await movie.save();
        updated++;
        console.log(`✅ Updated: ${movie.title}`);
      } else {
        console.log(`🚫 No backdrop found for ${movie.title}`);
      }
    } catch (err) {
      console.error(`❌ Failed for ${movie.title}:`, err.message);
    }
  }

  console.log(`✅ Finished. Updated ${updated} movies.`);
  mongoose.disconnect();
}

updateBackdrops();
