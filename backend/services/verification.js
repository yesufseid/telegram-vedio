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

module.exports = {
  publicProfile,
  notifyReferralReady,
};
