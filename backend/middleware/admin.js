function requireAdmin(req, res, next) {
  if (!req.isAuthenticated?.()) return res.redirect("/login");
  if (!req.user?.isAdmin && req.user?.role !== "admin") {
    if (req.path.startsWith("/api/")) return res.status(403).json({ error: "Admin access is required." });
    return res.status(403).render("error", { title: "Admin access required", message: "You do not have permission to open that page." });
  }
  return next();
}

module.exports = { requireAdmin };
