function requireAuth(req, res, next) {
  if (!req.isAuthenticated?.()) {
    if (req.path.startsWith("/api/")) {
      return res.status(401).json({ error: "Your portal session has expired. Please sign in again." });
    }

    return res.redirect("/login");
  }

  return next();
}

function redirectIfAuthenticated(req, res, next) {
  return req.isAuthenticated?.() ? res.redirect("/dashboard") : next();
}

module.exports = { requireAuth, redirectIfAuthenticated };
