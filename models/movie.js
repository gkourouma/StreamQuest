const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
});

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    tmdbId: {
      type: Number,
      unique: true,
    },
    genre: [String],
    type: {
      type: String,
      enum: ["movie", "tv"],
      default: "movie",
    },
    overview: String,
    rating: Number,
    releaseDate: Date,
    run_time: Number,
    poster: String,
    backdrop: String,
    source: {
      type: String,
      enum: ["trending", "popular", "discover", "top_rated", "upcoming"],
      default: "discover",
    },
    credits: {
      cast: [
        {
          name: String,
          character: String,
          profilePath: String,
        },
      ],
    },
    similar: [
      {
        title: String,
        poster: String,
        tmdbId: Number,
      },
    ],
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    reviews: [reviewSchema],
    trailer: {
      type: String,
    },
  },
  { collection: "2024_releases" }
);

const Movie = mongoose.model("Movie", movieSchema);

module.exports = Movie;
