const { sendToUser, EVENTS } = require("../utils/socket-server");
const store = require("./verification-store");
const availability = require("./availability");

const publicProfile = (user) => ({
  id: user.id,
  username: user.username,
  displayName: [user.username ? `@${user.username}` : null].filter(Boolean).join(" ") || "Referred user",
});

/** Notifies the referral that a referred user opened the Mini App and is ready. */
function notifyReferralReady(referrer, referredUser, verificationId) {
  const delivered = sendToUser(referrer.id, EVENTS.USER_READY_FOR_VERIFICATION, {
    verificationId,
    referredUser: publicProfile(referredUser),
    message: "A referred user is ready for verification.",
  });

  if (!delivered) {
    console.log(`[referral] ${referrer.username || referrer.id} is offline, ready notification skipped`);
  }
  return delivered;
}

/**
 * Section 13: after a failed availability attempt the referral clicks again, so
 * the referred user is told the system is working and should open the Mini App.
 */
function notifyReferredRetryAvailable(referredUser) {
  const delivered = sendToUser(referredUser.id, EVENTS.VERIFICATION_RETRY_AVAILABLE, {
    message: "The system is now working. Please try again.",
  });

  if (!delivered) {
    console.log(`[referral] ${referredUser.id} is offline, retry notification skipped`);
  }
  return delivered;
}

function notifyVerificationCompleted(referredUser) {
  return sendToUser(referredUser.id, EVENTS.VERIFICATION_COMPLETED, {
    message: "Verification completed.",
  });
}

/**
 * Runs the one-minute availability process for one verification.
 * The verification page is only unlocked when the check succeeds.
 */
async function startAvailability({ verification, referringUser, referredUser }) {
  await store.setStatus(verification.id, store.STATUS.PREPARING);
  sendToUser(referringUser.id, EVENTS.VERIFICATION_PREPARING, {
    verificationId: verification.id,
    timeoutMs: availability.TIMEOUT_MS,
    message: "Preparing verification... Please wait.",
  });

  const result = await availability.runAvailabilityCheck();

  if (result.available) {
    const updated = await store.setStatus(verification.id, store.STATUS.AVAILABLE);
    sendToUser(referringUser.id, EVENTS.VERIFICATION_AVAILABLE, {
      verificationId: verification.id,
      referredUser: publicProfile(referredUser),
      message: "Verification is available.",
    });
    return { available: true, verification: updated, attempts: result.attempts };
  }

  const updated = await store.setStatus(verification.id, store.STATUS.FAILED);
  sendToUser(referringUser.id, EVENTS.VERIFICATION_SYSTEM_ERROR, {
    verificationId: verification.id,
    message: "There is a system problem. Please try later.",
  });
  return { available: false, verification: updated, attempts: result.attempts };
}

module.exports = {
  publicProfile,
  notifyReferralReady,
  notifyReferredRetryAvailable,
  notifyVerificationCompleted,
  startAvailability,
};