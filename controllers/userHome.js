const express = require("express");
const router = express.Router();
const Movie = require("../models/movie.js");

router.get("/homepage", async (req, res) => {
  const currentHour = new Date().getHours();
  let greeting;

  try {
    if (currentHour < 12) {
      greeting = "Good Morning";
    } else if (currentHour < 18) {
      greeting = "Good Afternoon";
    } else {
      greeting = "Good Evening";
    }

    const genreFilter =
      req.query.genre && req.query.genre !== "All"
        ? { genre: req.query.genre }
        : {};
    const ratingFilter =
      req.query.minRating && req.query.minRating !== "All"
        ? { rating: { $gte: Math.floor(parseFloat(req.query.minRating)) } }
        : {};

    const filters = { ...genreFilter, ...ratingFilter };

    //Pagination
    const itemsPerPage = 20;
    const pageNum = parseInt(req.query.pageNum) || 1; // Getting page number and setting defult page number
    const totalMovies = await Movie.countDocuments(filters); //counts total items in doc

    const movies = await Movie.find(filters)
      .limit(itemsPerPage) //limits how many movies are displayed
      .skip((pageNum - 1) * itemsPerPage); //skips movies from prev pages

    res.render("user/homepage", {
      movies,
      greeting,
      totalMovies,
      currentPage: pageNum,
      totalOfPages: Math.ceil(totalMovies / itemsPerPage),
      genre: req.query.genre || "",
      minRating: req.query.minRating || "",
    });
  } catch (error) {
    console.log(error);
    res.redirect("/");
  }
});

module.exports = router;
