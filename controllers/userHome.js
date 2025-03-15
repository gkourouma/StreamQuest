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

  const genreFilter = req.query.genre ? { genre: req.query.genre } : {};
  const movies = await Movie.find(genreFilter);

  res.render("user/homepage", {movies, greeting });
} catch (error){
  console.log(error);
  res.redirect('/')
}
});

module.exports = router;
