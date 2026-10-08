const crypto = require("crypto");
const { validateInitData } = require("../utils/telegram-auth");
const {
  signSessionToken,
  signVerificationToken,
  verifyVerificationToken,
} = require("../utils/session");
const users = require("../db/users");
const store = require("../services/verification-store");
const asyncHandler = require("../middleware/async");
const verificationService = require("../services/verification");
const telegram = require("../utils/telegram");

/**
 * TEMPORARY diagnostic for the "Invalid initData signature" failure.
 *
 * Telegram's `signature` field is Ed25519 and can be checked against Telegram's
 * published public key, which needs no bot token. That separates the two
 * possible causes: if Ed25519 verifies for this bot id the payload is authentic
 * and the HMAC construction is at fault; if it fails, the payload came from a
 * different bot or was altered in transit.
 *
 * Logs only booleans and non-secret metadata: no token, no full hash, no user
 * JSON, no signature. Remove once the cause is confirmed.
 */
function logRejectedInitData(initData, err) {
  try {
    const params = new URLSearchParams(typeof initData === "string" ? initData : "");
    const hash = params.get("hash") || "";
    const signature = params.get("signature") || "";
    const token = process.env.BOT_TOKEN || "";
    const botId = token.split(":")[0];

    const fields = (excluded) =>
      [...params.entries()]
        .filter(([key]) => !excluded.includes(key))
        .map(([key, value]) => `${key}=${value}`)
        .sort()
        .join("\n");

    // HMAC variants: the docs do not state whether `signature` belongs in the
    // HMAC data-check-string, so try both and report which one matches.
    const secret = crypto.createHmac("sha256", "WebAppData").update(token).digest();
    const hmacMatches = {
      excludingSignature:
        hash === crypto.createHmac("sha256", secret).update(fields(["hash", "signature"])).digest("hex"),
      includingSignature:
        hash === crypto.createHmac("sha256", secret).update(fields(["hash"])).digest("hex"),
    };

    // Ed25519 per the third-party spec: "<bot_id>:WebAppData\n" + fields
    // (except hash and signature), sorted, joined by line feed.
    const TELEGRAM_ED25519_PUBKEY_HEX =
      "e7bf03a2fa4602af4580703d88dda5bb59f32ed8b02a56c187fe7d34caed242d";
    const ed25519Verified = (() => {
      if (!signature) return null;
      try {
        const publicKey = crypto.createPublicKey({
          key: {
            kty: "OKP",
            crv: "Ed25519",
            x: Buffer.from(TELEGRAM_ED25519_PUBKEY_HEX, "hex").toString("base64url"),
          },
          format: "jwk",
        });
        return crypto.verify(
          null,
          Buffer.from(`${botId}:WebAppData\n${fields(["hash", "signature"])}`, "utf8"),
          publicKey,
          Buffer.from(signature, "base64url")
        );
      } catch (verifyErr) {
        console.error("[initdata diagnostic] Ed25519 check failed:", verifyErr.message);
        return null;
      }
    })();

    let userId = null;
    let username = null;
    try {
      const user = JSON.parse(params.get("user") || "null");
      userId = user?.id ?? null;
      username = user?.username ?? null;
    } catch {
      /* user payload missing or malformed: leave nulls in place */
    }

    console.warn("[initdata diagnostic]", {
      error: err.message,
      keys: [...params.keys()].sort(),
      botId,
      hmacMatches,
      ed25519Verified,
      userId,
      username,
      authDate: params.get("auth_date"),
      queryIdPresent: Boolean(params.get("query_id")),
      signaturePresent: Boolean(signature),
      hashLength: hash.length,
      initDataLength: typeof initData === "string" ? initData.length : null,
    });
  } catch (logErr) {
    console.error("[initdata diagnostic] failed:", logErr.message);
  }
}

/**
 * POST /api/miniapp/auth
 * Body: { initData }
 * Validates the Telegram Mini App init data and returns a short session token.
 */
const auth = asyncHandler(async (req, res) => {
  let telegramUser;
  try {
    telegramUser = validateInitData(req.body?.initData);
  } catch (err) {
    logRejectedInitData(req.body?.initData, err);
    return res.status(401).json({ error: "INVALID_INIT_DATA", message: err.message });
  }

  const user = await users.findByTelegramChatId(telegramUser.id);
  if (!user) {
    return res.status(403).json({
      error: "NOT_REGISTERED",
      message: "Register through the Telegram bot before opening the Mini App.",
    });
  }

  return res.json({
    sessionToken: signSessionToken(user),
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      referral: user.referral,
      awaitingVerification: Boolean(store.findOpenForReferredUser(user.id)),
    },
  });
});

/** GET /api/miniapp/me — session user, used to validate a cached token. */
const me = asyncHandler(async (req, res) => {
  const user = await users.findById(req.session.id);
  if (!user) return res.status(404).json({ error: "USER_NOT_FOUND" });

  return res.json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      referral: user.referral,
      awaitingVerification: Boolean(store.findOpenForReferredUser(user.id)),
    },
  });
});

/**
 * POST /api/miniapp/ready
 * The signed-in user opened the Mini App: notify their referral.
 */
const ready = asyncHandler(async (req, res) => {
  const user = await users.findById(req.session.id);
  if (!user) return res.status(404).json({ error: "USER_NOT_FOUND" });

  const referrer = await users.findByUsername(user.referral);
  if (!referrer) {
    return res
      .status(409)
      .json({ error: "REFERRAL_NOT_FOUND", message: "Your referral could not be resolved." });
  }

  store.expireStale();

  // Re-opening after an expired window arms a fresh one instead of reusing the dead
  // verification, which is what the "please try again" retry flow relies on.
  let verification = store.findOpenForReferredUser(user.id);
  let armed = false;

  if (!verification) {
    verification = store.create({ referredUserId: user.id, referringUserId: referrer.id });
    armed = true;
  }

  // Only a freshly armed window pings the referral, so repeated re-opens of an
  // already pending verification do not spam another Ready button.
  if (armed) {
    await verificationService.notifyReferralReady(referrer, user, verification.id);
  }

  return res.json({
    verificationId: verification.id,
    status: verification.status,
    referredUser: verificationService.publicProfile(user),
  });
});

/**
 * GET /api/miniapp/verifications/status
 *
 * Polling replacement for the old VERIFICATION_AVAILABLE socket event. Returns the
 * signed verification token only once the referral confirmed from the bot.
 */
const verificationStatus = asyncHandler(async (req, res) => {
  store.expireStale();

  const verification =
    store.findOpenForReferredUser(req.session.id) || store.latestForReferredUser(req.session.id);

  // A finished verification is nothing to wait on; the client polls on instead.
  if (!verification || verification.status === store.STATUS.COMPLETED) {
    return res.json({ status: "NONE" });
  }

  const response = {
    status: verification.status,
    verificationId: verification.id,
    deadlineAt: verification.deadlineAt,
  };

  if (verification.status === store.STATUS.AVAILABLE) {
    response.verificationToken = signVerificationToken(verification, "sms-code");
  }

  return res.json(response);
});

/**
 * POST /api/miniapp/verifications/complete
 *
 * The referred user submits the 5-digit code on the existing verification page. The
 * referral confirms from the bot instead, so this accepts either side of the pair;
 * both ids are HMAC-bound into the token, which keeps it scoped to this one
 * verification.
 */
const completeVerification = asyncHandler(async (req, res) => {
  const payload = verifyVerificationToken(req.body?.verificationToken);

  if (!payload) {
    return res
      .status(401)
      .json({ error: "INVALID_VERIFICATION_TOKEN", message: "The verification session expired." });
  }

  const isParticipant =
    payload.referringUserId === req.session.id || payload.referredUserId === req.session.id;

  if (!isParticipant) {
    return res.status(403).json({ error: "FORBIDDEN", message: "This verification is not yours." });
  }

  const verification = store.findById(payload.verificationId);
  if (!verification) return res.status(404).json({ error: "VERIFICATION_NOT_FOUND" });

  if (verification.status !== store.STATUS.AVAILABLE) {
    return res
      .status(409)
      .json({ error: "NOT_AVAILABLE", message: "Your referral has not confirmed yet." });
  }

  store.setStatus(verification.id, store.STATUS.COMPLETED, req.body?.code ?? null);

  const referredUser = await users.findById(verification.referredUserId);
  const referrer = await users.findById(verification.referringUserId);
  const displayName = verificationService.publicProfile(referredUser).displayName;

  if (referrer && referrer.telegramChatId) {
    await telegram
      .sendMessage(referrer.telegramChatId, `Verification submitted by ${displayName}.`)
      .catch((err) => console.error("Referral completion notice failed:", err.message));
  }

  return res.json({ status: "COMPLETED" });
});

module.exports = {
  auth,
  me,
  ready,
  verificationStatus,
  completeVerification,
};
