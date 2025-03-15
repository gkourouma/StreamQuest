const express = require("express");
const router = express.Router();
const Movie = require("../models/movie.js");

router.get("/homepage", async (req, res) => {
  const currentHour = new Date().getHours();
  let greeting;

try{
  if (currentHour < 12) {
    greeting = "Good Morning";
  } else if (currentHour < 18) {
    greeting = "Good Afternoon";
  } else {
    greeting = "Good Evening";
  }

  const genreFilter = req.query.genre && req.query.genre !== 'All' ? { genre: req.query.genre } : {};
  const ratingFilter = req.query.minRating && req.query.minRating !== 'All' ? {rating: {$gte: Math.floor(parseFloat(req.query.minRating))}}: {}

  const combo = {...genreFilter, ...ratingFilter}

  const movies = await Movie.find(combo);

  res.render("user/homepage", {movies, greeting });
} catch (error){
  console.log(error);
  res.redirect('/')
}
});

module.exports = router;
