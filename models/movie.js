const mongoose = require("mongoose");

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    genre: [String],
    overview: String,
    rating: Number,
    releaseYear: Number,
    runTime: Number,
    poster: {
      type: String,
    }
  },
  { collection: "2024_releases" }
);

const Movie = mongoose.model("Movie", movieSchema);

module.exports = Movie;
