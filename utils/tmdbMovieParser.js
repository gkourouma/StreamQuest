const genreMap = require("../utils/genreMap");

function parseTMDBMovieData(tmdbData) {
  const genreNames = tmdbData.genre_ids
    ? tmdbData.genre_ids.map(id => genreMap[id]).filter(Boolean)
    : tmdbData.genres?.map(g => g.name) || [];

  return {
    tmdbId: tmdbData.id,
    title: tmdbData.title,
    overview: tmdbData.overview,
    genre: genreNames,
    poster: tmdbData.poster_path
      ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`
      : "",
    rating: tmdbData.vote_average || null,
    releaseDate: tmdbData.release_date
      ? new Date(tmdbData.release_date)
      : null,
    runTime: tmdbData.runtime || null,
    backdrop: tmdbData.backdrop_path
      ? `https://image.tmdb.org/t/p/original${tmdbData.backdrop_path}`
      : "",
    credits: tmdbData.credits?.cast
      ? {
          cast: tmdbData.credits.cast.slice(0, 4).map(actor => ({
            name: actor.name,
            character: actor.character,
            profilePath: actor.profile_path,
          })),
        }
      : {},
  };
}

module.exports = parseTMDBMovieData;

  