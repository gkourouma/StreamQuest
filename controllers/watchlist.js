const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const Movie = require("../models/movie.js");

router.get("/watchlist", async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id).populate({
      path: "watchlist",
      populate: {
        path: "reviews.user",
        select: "username _id",
      },
    });

    res.render("user/watchlist", { watchlists: user.watchlist, currentUserId: req.session.user._id });
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

router.delete("/watchlist/:movieId", async (req, res) => {
  try {
    const movieId = req.params.movieId;
    const user = await User.findById( req.session.user._id);

    user.watchlist.pull(movieId)
    await user.save()
    res.redirect("/user/watchlist");

  } catch (error) {
    console.log(error);
    res.redirect("/");
  }
});

router.post("/watchlist/:movieId/review", async (req, res) => {
  try {
    console.log("Session user:", req.session.user);
    const movieId = req.params.movieId;
    const user = await User.findById(req.session.user._id);
    const movie = await Movie.findById(movieId);

    const newReview = {
      user: user._id,
      content: req.body.content,
    };

    movie.reviews.push(newReview);
    await movie.save();
    res.redirect("/user/watchlist");
  } catch (error) {
    console.log(error);
    res.redirect("/");
  }
});

router.put("/watchlist/:movieId/review/:reviewId", async (req, res) => {
  try {
    const { movieId, reviewId } = req.params;
    const movie = await Movie.findById(movieId);
    const review = movie.reviews.id(reviewId);

    review.content = req.body.content;
    await movie.save();
    res.redirect("/user/watchlist");
  } catch (error) {
    console.log(error);
    res.redirect("/");
  }
});

router.delete("/watchlist/:movieId/review/:reviewId", async (req, res) => {
  try {
    const { movieId, reviewId } = req.params;
    const movie = await Movie.findById(movieId);
    const review = movie.reviews.id(reviewId);

    movie.reviews.pull(reviewId);
    await movie.save();
    res.redirect("/user/watchlist");
  } catch (error) {
    console.log(error);
    res.redirect("/");
  }
});

module.exports = router;
