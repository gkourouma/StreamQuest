const mongoose = require("mongoose");

const watchlistSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  items: [
    {
      mediaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Movie", 
      },
      type: {
        type: String,
        enum: ["movie", "tv"],
        required: true,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Watchlist = mongoose.model("Watchlist", watchlistSchema);

module.exports = Watchlist;
