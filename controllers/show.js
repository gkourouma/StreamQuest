const express = require('express')
const router = express.Router()
const Movie = require("../models/movie.js")


router.get("/:movieId", async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.movieId)
    res.render("user/show", {movie})
  } catch (error) {
    console.log(error);
    res.redirect("/")
  }
})

module.exports = router;