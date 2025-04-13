const passUserToView = (req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.currentUser = req.session.user || null;
  next();
};

module.exports = passUserToView;
