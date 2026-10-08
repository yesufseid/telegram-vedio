const telegram = require("../utils/telegram");
const { parseReferralPayload } = require("../utils/telegram-auth");
const users = require("../db/users");
const { registerUser, notifyReferralOfRegistration } = require("../services/registration");
const store = require("../services/verification-store");
const verificationService = require("../services/verification");

async function sendWelcomePhoto(chatId) {
  // A failed photo must never block registration, so it is isolated.
  try {
    await telegram.sendPhoto(chatId, telegram.welcomePhotoUrl());
  } catch (err) {
    console.error("Welcome photo failed:", err.message);
  }
}

async function offerMiniApp(chatId, user) {
  // The Mini App button is a Telegram bot UI concern: only role = USER sees it.
  // ADMIN and SUPERADMIN refer people with /share instead.
  if (user.role !== users.ROLES.USER) {
    await telegram.sendMessage(chatId, "Registration completed. Send /share to get your referral link.");
    return;
  }

  await telegram.sendMessage(chatId, "Registration successful.", {
    reply_markup: {
      inline_keyboard: [[{ text: "Open Mini App", web_app: { url: telegram.miniAppUrl() } }]],
    },
  });
}

/**
 * `/start` completes registration in a single round trip: there is no longer a
 * second step (contact sharing) that a pending-referral map would have to
 * bridge between, so the referral payload is read straight from the command.
 */
async function handleStart(message) {
  const { id: chatId, username } = message.chat || {};
  if (!chatId) return;

  const payloadReferral = parseReferralPayload(message.text);

  const existing = await users.findByTelegramChatId(chatId);
  if (existing) {
    await telegram.sendMessage(chatId, "You are already registered.");
    await offerMiniApp(chatId, existing);
    return;
  }

  await sendWelcomePhoto(chatId);

  try {
    const { user, created, referrer } = await registerUser({
      telegramChatId: chatId,
      username: message.from?.username || username || null,
      payloadReferral,
    });

    // A new registration is only interesting to a referral, and only once.
    if (created && referrer) {
      await notifyReferralOfRegistration(referrer, user).catch((err) =>
        console.error("Referral notification failed:", err.message)
      );
    }

    await telegram.sendMessage(chatId, "Registration successful.");
    await offerMiniApp(chatId, user);
  } catch (err) {
    console.error("Registration failed:", err.message);
    await telegram.sendMessage(chatId, "Something went wrong. Please try again later.");
  }
}

/**
 * `/share` hands an ADMIN or SUPERADMIN their personal referral deep link. This is
 * the only way referring happens now, since /referral is no longer a dashboard.
 */
async function handleShare(message) {
  const { id: chatId } = message.chat || {};
  if (!chatId) return;

  const user = await users.findByTelegramChatId(chatId);
  if (!user) {
    await telegram.sendMessage(chatId, "Send /start to register first.");
    return;
  }

  if (user.role === users.ROLES.USER) {
    await telegram.sendMessage(chatId, "This command is only available to admins.");
    return;
  }

  // The link carries the admin username, which /start resolves back to a referrer.
  // A missing username would produce a bare `?start=` link that refers to nobody.
  if (!user.username) {
    await telegram.sendMessage(chatId, "Set a Telegram username first, then send /share again.");
    return;
  }

  const link = telegram.buildStartLink(await telegram.getBotUsername(), user.username);
  await telegram.sendMessage(
    chatId,
    ["Your referral link:", "", link, "", "Share it so new users register as your referrals."].join("\n")
  );
}

/**
 * Handles the referral tapping "Ready" on the notification button. Tapping unlocks
 * the verification; the referred user picks it up on their next status poll.
 */
async function handleCallback(callbackQuery) {
  const { id: queryId, data, message } = callbackQuery || {};
  const chatId = message?.chat?.id || callbackQuery?.from?.id;
  if (!queryId || !data || !chatId) return;

  store.expireStale();

  if (!data.startsWith("vr:")) {
    await telegram.answerCallbackQuery(queryId, "Unknown action.");
    return;
  }

  const verificationId = data.slice("vr:".length);
  const user = await users.findByTelegramChatId(chatId);
  if (!user || user.role === users.ROLES.USER) {
    await telegram.answerCallbackQuery(queryId, "This is not your verification.");
    return;
  }

  // The callback payload is attacker-copyable, so ownership is checked against the
  // referral that owns the verification rather than trusting the button.
  const verification = store.findByIdForReferringUser(verificationId, user.id);
  if (!verification) {
    await telegram.answerCallbackQuery(queryId, "This verification is not yours.");
    return;
  }

  if (verification.status === store.STATUS.EXPIRED) {
    await telegram.answerCallbackQuery(queryId, "The one minute has passed. Ask the user to try again.");
    return;
  }

  if (verification.status !== store.STATUS.PENDING) {
    await telegram.answerCallbackQuery(queryId, "This verification was already handled.");
    return;
  }

  store.setStatus(verification.id, store.STATUS.AVAILABLE);

  const referredUser = await users.findById(verification.referredUserId);
  await telegram.answerCallbackQuery(queryId, "Ready.");
  await telegram.sendMessage(
    chatId,
    referredUser
      ? `Verification unlocked for ${verificationService.publicProfile(referredUser).displayName}.`
      : "Verification unlocked."
  );
}

async function handleUpdate(update) {
  if (update.callback_query) return handleCallback(update.callback_query);

  const message = update.message;
  if (!message) return;

  const text = (message.text || "").trim();
  if (text.startsWith("/start")) return handleStart(message);
  if (text.startsWith("/share")) return handleShare(message);
}

async function telegramBotInit() {
  const username = await telegram.getBotUsername();
  await telegram.setMyCommands([
    { command: "start", description: "Register and open the Mini App" },
    { command: "share", description: "Get your referral link (admin only)" },
  ]);
  await telegram.setChatMenuButton(telegram.miniAppUrl());
  console.log(`🤖 Telegram bot @${username} is ready`);
}

module.exports = { handleUpdate, handleStart, handleShare, handleCallback, telegramBotInit };