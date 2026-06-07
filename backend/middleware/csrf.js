const crypto = require("crypto");

function attachCsrfToken(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }

  res.locals.csrfToken = req.session.csrfToken;
  next();
}

function verifyCsrfToken(req, res, next) {
  const token = req.get("x-csrf-token") || req.body?._csrf;

  if (!token || token !== req.session.csrfToken) {
    return res.status(403).json({ error: "Your request could not be verified. Refresh and try again." });
  }

  next();
}

module.exports = { attachCsrfToken, verifyCsrfToken };
