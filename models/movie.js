const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  content: {
    type: String,
    required: true
  }
});

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
    },
    reviews: [reviewSchema]
  },
  { collection: "2024_releases" }
);

const Movie = mongoose.model("Movie", movieSchema);

module.exports = Movie;
