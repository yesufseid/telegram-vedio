const telegram = require("../utils/telegram");
const { parseReferralPayload } = require("../utils/telegram-auth");
const users = require("../db/users");
const { registerUser, notifyReferralOfRegistration } = require("../services/registration");

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
  if (user.role !== users.ROLES.USER) {
    await telegram.sendMessage(chatId, "Registration completed.");
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

async function handleUpdate(update) {
  const message = update.message;
  if (!message) return;

  const text = (message.text || "").trim();
  if (text.startsWith("/start")) return handleStart(message);
}

async function telegramBotInit() {
  const username = await telegram.getBotUsername();
  await telegram.setMyCommands([
    { command: "start", description: "Register and open the Mini App" },
  ]);
  await telegram.setChatMenuButton(telegram.miniAppUrl());
  console.log(`🤖 Telegram bot @${username} is ready`);
}

module.exports = { handleUpdate, handleStart, telegramBotInit };