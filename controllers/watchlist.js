const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const Movie = require("../models/movie.js");

router.get("/watchlist", async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id).populate(
      "watchlist"
    );

    res.render("user/watchlist", { watchlists: user.watchlist });
  } catch (error) {
    console.log(error);
    res.status(500).send(error.message);
  }
});

router.post("/watchlist/:movieId/add", async (req, res) => {
  try {
    const movieId = req.params.movieId;
    const user = await User.findById(req.session.user._id);
    const movie = await Movie.findById(movieId);

    if (!user.watchlist.includes(movieId)) {
      user.watchlist.push(movieId);
      await user.save();
    }

    res.redirect("/user/watchlist");
  } catch (error) {
    console.log(error);
    res.redirect("/");
  }
});

module.exports = router;
