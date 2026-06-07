function notFound(req, res) {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "The requested API endpoint does not exist." });
  }

  return res.status(404).render("error", {
    title: "Page not found",
    message: "The page you requested does not exist."
  });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  console.error(error);
  const status = error.status || 500;
  const message =
    status >= 500 ? "The server could not complete that request. Please try again." : error.message;

  if (req.path.startsWith("/api/")) {
    return res.status(status).json({ error: message });
  }

  return res.status(status).render("error", { title: "Something went wrong", message });
}

module.exports = { notFound, errorHandler };
