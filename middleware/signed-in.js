const isSignedIn = (req, res, next) => {
  if (req.session.user) return next(); //check if user is logged in and go to next middleware or route
  res.redirect("/auth/sign-in");
};

module.exports = isSignedIn;
