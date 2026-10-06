const telegram = require("../utils/telegram");
const { parseReferralPayload } = require("../utils/telegram-auth");
const users = require("../db/users");
const { registerUser, notifyReferralOfRegistration } = require("../services/registration");

const PENDING_TTL_MS = 15 * 60 * 1000;
const pendingReferrals = new Map();

function rememberReferral(chatId, referral) {
  pendingReferrals.set(String(chatId), { referral, createdAt: Date.now() });
}

function takeReferral(chatId) {
  const key = String(chatId);
  const entry = pendingReferrals.get(key);
  if (!entry) return null;
  pendingReferrals.delete(key);
  if (Date.now() - entry.createdAt > PENDING_TTL_MS) return null;
  return entry.referral;
}

setInterval(() => {
  const cutoff = Date.now() - PENDING_TTL_MS;
  for (const [chatId, entry] of pendingReferrals.entries()) {
    if (entry.createdAt < cutoff) pendingReferrals.delete(chatId);
  }
}, 5 * 60 * 1000).unref();

const escape = (value) =>
  String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function askForPhone(chatId, firstName) {
  await telegram.sendMessage(
    chatId,
    `Welcome${firstName ? `, ${escape(firstName)}` : ""}! Please share your phone number to continue.`,
    {
      reply_markup: {
        keyboard: [[{ text: "Share Phone Number", request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
        remove_keyboard: false,
      },
    }
  );
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

async function handleStart(message) {
  const { id: chatId, username, first_name: firstName } = message.chat || {};
  if (!chatId) return;

  const referralPayload = parseReferralPayload(message.text);
  rememberReferral(chatId, referralPayload);

  const existing = await users.findByTelegramChatId(chatId);
  if (existing) {
    await telegram.sendMessage(chatId, "You are already registered.");
    await offerMiniApp(chatId, existing);
    return;
  }

  await askForPhone(chatId, firstName);
}

async function handleContact(message) {
  const contact = message.contact || {};
  const chatId = message.chat?.id;
  if (!chatId || !contact.phone_number) {
    await telegram.sendMessage(chatId, "We could not read that phone number. Please try sharing it again.");
    return;
  }

  const referralPayload = takeReferral(chatId);

  try {
    const { user, created, referrer } = await registerUser({
      telegramChatId: chatId,
      username: message.from?.username || null,
      phoneNumber: contact.phone_number,
      payloadReferral: referralPayload,
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
  if (message.contact) return handleContact(message);

  if (message.chat?.id) {
    await telegram.sendMessage(
      message.chat.id,
      "Please use the Share Phone Number button to register."
    );
  }
}

async function telegramWebhook(req, res) {
  const update = req.body;
  if (!update) return res.status(200).json({ ok: true });

  try {
    await handleUpdate(update);
  } catch (err) {
    console.error("Telegram update handling failed:", err.message);
  }

  return res.status(200).json({ ok: true });
}

async function telegramBotInit() {
  const username = await telegram.getBotUsername();
  await telegram.setMyCommands([
    { command: "start", description: "Register and open the Mini App" },
  ]);
  await telegram.setChatMenuButton(telegram.miniAppUrl());
  console.log(`🤖 Telegram bot @${username} is ready`);
}

module.exports = { telegramWebhook, telegramBotInit };