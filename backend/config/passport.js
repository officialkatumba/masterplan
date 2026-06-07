const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const { User, findByIdentifier } = require("../models/userModel");

passport.use(
  new LocalStrategy(
    { usernameField: "identifier", passwordField: "password" },
    async (identifier, password, done) => {
      try {
        const user = await findByIdentifier(String(identifier).trim());
        if (!user || !(await bcrypt.compare(String(password), user.passwordHash))) {
          return done(null, false, { message: "The email, phone number, or password is incorrect." });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    done(null, await User.findById(id).exec());
  } catch (error) {
    done(error);
  }
});

module.exports = passport;
