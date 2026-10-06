const { validateInitData } = require("../utils/telegram-auth");
const {
  signSessionToken,
  signVerificationToken,
  verifyVerificationToken,
} = require("../utils/session");
const users = require("../db/users");
const store = require("../services/verification-store");
const { sendToUser, EVENTS } = require("../utils/socket-server");
const asyncHandler = require("../middleware/async");
const availability = require("../services/availability");
const verificationService = require("../services/verification");

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

  let verification = store.findOpenForReferredUser(user.id);
  if (!verification) {
    verification = store.create({
      referredUserId: user.id,
      referringUserId: referrer.id,
    });
  }

  const delivered = verificationService.notifyReferralReady(referrer, user, verification.id);

  return res.json({
    verificationId: verification.id,
    referralOnline: delivered,
    referredUser: verificationService.publicProfile(user),
  });
});

/**
 * GET /api/miniapp/verifications
 * Referred users currently waiting on this referral.
 */
const listVerifications = asyncHandler(async (req, res) => {
  const items = await Promise.all(
    store.listForReferringUser(req.session.id).map(async (verification) => {
      const referredUser = await users.findById(verification.referredUserId);
      return {
        id: verification.id,
        status: verification.status,
        createdAt: new Date(verification.createdAt).toISOString(),
        updatedAt: new Date(verification.updatedAt).toISOString(),
        referredUser: {
          id: verification.referredUserId,
          username: referredUser ? referredUser.username : null,
          displayName: referredUser?.username ? `@${referredUser.username}` : "Referred user",
        },
      };
    })
  );

  return res.json({ verifications: items });
});

/**
 * POST /api/miniapp/verifications/:id/start
 * Section 9/10: runs the one-minute availability process before the existing
 * verification page may be opened.
 */
const startVerification = asyncHandler(async (req, res) => {
  const verification = store.findById(req.params.id);
  if (!verification) {
    return res.status(404).json({ error: "VERIFICATION_NOT_FOUND" });
  }

  if (verification.referringUserId !== req.session.id) {
    return res.status(403).json({ error: "FORBIDDEN", message: "This verification is not yours." });
  }

  const referredUser = await users.findById(verification.referredUserId);
  const referringUser = await users.findById(req.session.id);
  if (!referredUser || !referringUser) {
    return res.status(404).json({ error: "USER_NOT_FOUND" });
  }

  const previous = store.latestForReferredUser(referredUser.id);
  const isRetry = previous && previous.status === store.STATUS.FAILED;

  if (isRetry) {
    verificationService.notifyReferredRetryAvailable(referredUser);
    sendToUser(referringUser.id, EVENTS.VERIFICATION_RETRY_AVAILABLE, {
      verificationId: verification.id,
      message: "We asked the referred user to open the Mini App again.",
    });
    return res.json({ status: "RETRY_REQUESTED", referredUser: verificationService.publicProfile(referredUser) });
  }

  const result = await verificationService.startAvailability({ verification, referringUser, referredUser });

  if (!result.available) {
    return res.status(503).json({
      error: "SYSTEM_UNAVAILABLE",
      message: "There is a system problem. Please try later.",
      timeoutMs: availability.TIMEOUT_MS,
    });
  }

  return res.json({
    status: "AVAILABLE",
    verificationId: verification.id,
    referredUser: verificationService.publicProfile(referredUser),
    verificationToken: signVerificationToken(result.verification, "sms-code"),
  });
});

/**
 * POST /api/miniapp/verifications/complete
 * Section 16: the referral submitted the existing verification form.
 */
const completeVerification = asyncHandler(async (req, res) => {
  const payload = verifyVerificationToken(req.body?.verificationToken);

  if (!payload) {
    return res
      .status(401)
      .json({ error: "INVALID_VERIFICATION_TOKEN", message: "The verification session expired." });
  }

  if (payload.referringUserId !== req.session.id) {
    return res.status(403).json({ error: "FORBIDDEN", message: "This verification is not yours." });
  }

  const verification = store.findById(payload.verificationId);
  if (!verification) return res.status(404).json({ error: "VERIFICATION_NOT_FOUND" });

  if (verification.status !== store.STATUS.AVAILABLE) {
    return res
      .status(409)
      .json({ error: "NOT_AVAILABLE", message: "The availability check has not succeeded yet." });
  }

  const referredUser = await users.findById(verification.referredUserId);
  store.setStatus(verification.id, store.STATUS.COMPLETED, req.body?.code ?? null);

  const delivered = verificationService.notifyVerificationCompleted(referredUser);
  sendToUser(req.session.id, EVENTS.VERIFICATION_COMPLETED, {
    verificationId: verification.id,
    referredUser: verificationService.publicProfile(referredUser),
    message: "Verification submitted.",
  });

  return res.json({ status: "COMPLETED", referredUserNotified: delivered });
});

module.exports = {
  auth,
  me,
  ready,
  listVerifications,
  startVerification,
  completeVerification,
};