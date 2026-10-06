const { verifySessionToken, bearerFrom } = require("../utils/session");

/**
 * Rejects any request that does not carry a valid Mini App session token.
 * The Telegram identity always comes from the validated initData, never from
 * a client supplied user id.
 */
function requireSession(req, res, next) {
  const token = bearerFrom(req) || req.query.token;
  const session = verifySessionToken(token);

  if (!session) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "Invalid Mini App session" });
  }

  req.session = session;
  return next();
}

module.exports = { requireSession };