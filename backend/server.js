require("dotenv").config();
const { configureDns } = require("./config/dns");
configureDns();

const path = require("path");
const express = require("express");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const passport = require("./config/passport");
const authRoutes = require("./routes/authRoutes");
const pageRoutes = require("./routes/pageRoutes");
const apiRoutes = require("./routes/apiRoutes");
const { attachCsrfToken } = require("./middleware/csrf");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { connectDatabase } = require("./config/database");
const { ensureAdminUser } = require("./services/adminBootstrap");

const app = express();
const isProduction = process.env.NODE_ENV === "production";

if (isProduction && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be configured when NODE_ENV=production.");
}

const mongoUrl = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoUrl) {
  throw new Error("MONGODB_URI or MONGO_URI must be configured.");
}

const sessionStore = MongoStore.create({
  mongoUrl,
  ttl: 60 * 60 * 24 * 7,
  touchAfter: 60 * 60 * 24
});

if (isProduction) {
  app.set("trust proxy", 1);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../frontend/views"));
app.use(express.static(path.join(__dirname, "../frontend")));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "script-src": ["'self'", "https://cdn.jsdelivr.net"],
        "style-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
        "img-src": ["'self'", "data:", "https://i.ytimg.com"],
        "frame-src": ["https://www.youtube-nocookie.com"]
      }
    }
  })
);
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(express.json({ limit: "2mb" }));
app.use(
  session({
    store: sessionStore,
    name: "businessplan.sid",
    secret: process.env.SESSION_SECRET || "development-only-change-this-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  res.locals.currentUser = req.user || null;
  res.locals.currentUrl = req.originalUrl || req.url;
  res.locals.enhancementFeeAmount = Number(process.env.ENHANCEMENT_FEE_AMOUNT || 10);
  res.locals.enhancementFeeCurrency = process.env.ENHANCEMENT_FEE_CURRENCY || "USD";
  next();
});
app.use(attachCsrfToken);
app.use(
  ["/login", "/signup", "/forgot-password"],
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false
  })
);
app.use(authRoutes);
app.use(pageRoutes);
app.use("/api", apiRoutes);
app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT) || 3000;

async function startServer() {
  await connectDatabase();
  await ensureAdminUser();
  return app.listen(port, () => {
    console.log(`Business Plan Maker is running at http://localhost:${port}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Unable to start Business Plan Maker:", error.message);
    process.exit(1);
  });
}

module.exports = { app, sessionStore, startServer };
