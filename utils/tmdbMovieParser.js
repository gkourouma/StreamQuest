const genreMap = require("../utils/genreMap");

function parseTMDBMovieData(tmdbData, source = "discover", type = "movie") {
  const genreNames = tmdbData.genre_ids
    ? tmdbData.genre_ids.map((id) => genreMap[id]).filter(Boolean)
    : tmdbData.genres?.map((g) => g.name) || [];

  const release = tmdbData.release_date || tmdbData.first_air_date || null;

  const trailer = tmdbData.videos?.results?.find(
    (v) => v.type === "Trailer" && v.site === "YouTube"
  );

  const similar = Array.isArray(tmdbData.similar?.results)
    ? tmdbData.similar.results
        .filter((sim) => sim.poster_path && (sim.title || sim.name))
        .slice(0, 10)
        .map((sim) => ({
          title: sim.title || sim.name,
          poster: `https://image.tmdb.org/t/p/w300${sim.poster_path}`,
          tmdbId: sim.id,
        }))
    : [];

  return {
    tmdbId: tmdbData.id,
    title: tmdbData.title || tmdbData.name || "Untitled",
    overview: tmdbData.overview || "",
    genre: genreNames,
    poster: tmdbData.poster_path
      ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`
      : "",
    backdrop: tmdbData.backdrop_path
      ? `https://image.tmdb.org/t/p/original${tmdbData.backdrop_path}`
      : "",
    rating: tmdbData.vote_average ?? null,
    releaseDate: release ? new Date(release) : null,
    runTime: tmdbData.runtime || null,
    type,
    source,
    lastUpdated: new Date(),
    trailer: trailer
      ? `https://www.youtube.com/embed/${trailer.key}`
      : null,
    credits: tmdbData.credits?.cast
      ? {
          cast: tmdbData.credits.cast.slice(0, 4).map((actor) => ({
            name: actor.name,
            character: actor.character,
            profilePath: actor.profile_path,
          })),
        }
      : {},
    similar,
  };
}

module.exports = parseTMDBMovieData;

