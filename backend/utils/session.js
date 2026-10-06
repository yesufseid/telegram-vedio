const jwt = require("jsonwebtoken");

const SESSION_TTL = "12h";
const VERIFICATION_TTL = "10m";

function getSecret() {
  const secret = process.env.SESSION_SECRET || process.env.API_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not configured");
  return secret;
}

function signSessionToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      chatId: user.telegramChatId,
      role: user.role,
      kind: "miniapp",
    },
    getSecret(),
    { expiresIn: SESSION_TTL }
  );
}

function verifySessionToken(token) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, getSecret());
    if (decoded.kind !== "miniapp") return null;
    return { id: decoded.sub, telegramChatId: decoded.chatId, role: decoded.role };
  } catch {
    return null;
  }
}

function signVerificationToken(verification, verificationRequest) {
  return jwt.sign(
    {
      kind: "verification",
      verificationId: verification.id,
      referredUserId: verification.referredUserId,
      referringUserId: verification.referringUserId,
      code: verificationRequest,
    },
    getSecret(),
    { expiresIn: VERIFICATION_TTL }
  );
}

function verifyVerificationToken(token) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, getSecret());
    if (decoded.kind !== "verification") return null;
    return decoded;
  } catch {
    return null;
  }
}

function bearerFrom(req) {
  const header = req.headers.authorization;
  if (!header || typeof header !== "string") return null;
  const [scheme, value] = header.split(" ");
  if (!value || scheme.toLowerCase() !== "bearer") return null;
  return value.trim();
}

module.exports = {
  signSessionToken,
  verifySessionToken,
  signVerificationToken,
  verifyVerificationToken,
  bearerFrom,
};