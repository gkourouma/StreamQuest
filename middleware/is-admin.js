function isAdmin(req, res, next) {
    const adminUsername = process.env.ADMIN_USERNAME;
    if (req.session.user && req.session.user.username === adminUsername) {
      return next();
    }
    res.status(403).send("Forbidden");
  }
  
  module.exports = isAdmin;
  
  