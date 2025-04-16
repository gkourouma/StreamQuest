const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const Movie = require("../models/movie.js");
const Watchlist = require("../models/watchlist.js");

router.get("/watchlist", async (req, res) => {
  try {
    const watchlists = await Watchlist.find({user:req.session.user._id})
      .populate("items.mediaId")
      .sort({ createdAt: -1 });

    res.render("user/watchlist", { watchlists, user: req.session.user._id });
  } catch (error) {
    console.log(error);
    res.status(500).send(error.message);
  }
});

router.post("/watchlists", async (req, res) => {
  try {
    const watchlistName = req.body.name;

    await Watchlist.create({
      user: req.session.user._id,
      name: watchlistName,
      items: [],
    });

    res.redirect("/user/watchlist");
  } catch (error) {
    console.log(error);
    res.redirect("/user/watchlist");
  }
})

router.post("/watchlists/add-to-selected", async (req, res) => {
  try {
    const { watchlistId, mediaId, type } = req.body;

    await Watchlist.updateOne(
      {
        _id: watchlistId,
        user: req.session.user._id,
        "items.mediaId": { $ne: mediaId },
      },
      {
        $push: { items: { mediaId, type } },
      }
    );

    res.redirect("back");
  } catch (err) {
    console.error("❌ Failed to add to watchlist:", err);
    res.status(500).send("Failed to add to watchlist.");
  }
});



router.delete("/watchlists/:watchlistId", async (req, res) => {
  try {
    await Watchlist.findOneAndDelete({
      _id: req.params.watchlistId,
      user: req.session.user._id, // security check
    });

    res.redirect("/user/watchlist");
  } catch (err) {
    console.error("❌ Failed to delete watchlist:", err);
    res.status(500).send("Delete failed.");
  }
});

router.delete("/watchlists/:watchlistId/remove/:mediaId", async (req, res) => {
  try {
    await Watchlist.updateOne(
      {
        _id: req.params.watchlistId,
        user: req.session.user._id, // secure check
      },
      {
        $pull: { items: { mediaId: req.params.mediaId } }
      }
    );

    res.redirect("/user/watchlist");
  } catch (err) {
    console.error("❌ Failed to remove item:", err);
    res.status(500).send("Item removal failed.");
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
