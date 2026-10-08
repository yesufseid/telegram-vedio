const API_ROOT = "https://api.telegram.org";

let botUsername = null;

function getToken() {
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error("BOT_TOKEN is not configured");
  return token;
}

async function callApi(method, payload = {}) {
  const res = await fetch(`${API_ROOT}/bot${getToken()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);
  if (!data || data.ok !== true) {
    const description = data?.description || `HTTP ${res.status}`;
    const error = new Error(`Telegram ${method} failed: ${description}`);
    error.status = res.status;
    error.errorCode = data?.error_code ?? null;
    throw error;
  }
  return data.result;
}

/**
 * Fetches pending updates. `offset` acknowledges every update below it, so the
 * caller must only pass an offset for updates it has already handled.
 */
async function getUpdates({ offset, timeout = 30, allowedUpdates } = {}) {
  return callApi("getUpdates", {
    offset,
    timeout,
    allowed_updates: allowedUpdates || ["message", "callback_query"],
  });
}

/** Required before getUpdates works, and the only way to stop an old webhook. */
async function deleteWebhook({ dropPendingUpdates = false } = {}) {
  return callApi("deleteWebhook", { drop_pending_updates: dropPendingUpdates });
}

async function getMe() {
  if (!botUsername) {
    const me = await callApi("getMe");
    botUsername = me.username;
  }
  return botUsername;
}

async function getBotUsername() {
  const me = await callApi("getMe");
  botUsername = me.username;
  return botUsername;
}

async function sendMessage(chatId, text, options = {}) {
  return callApi("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", ...options });
}

/** photo accepts either a public URL or a Telegram file_id. */
async function sendPhoto(chatId, photo, options = {}) {
  return callApi("sendPhoto", { chat_id: chatId, photo, parse_mode: "HTML", ...options });
}

async function answerCallbackQuery(callbackQueryId, text, showAlert = false) {
  try {
    await callApi("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text,
      show_alert: showAlert,
    });
  } catch (err) {
    console.error("answerCallbackQuery error:", err.message);
  }
}

async function answerWebhookQuery(id, result) {
  if (!id) return;
  try {
    await fetch(`${API_ROOT}/bot${getToken()}/answerWebhookJsonQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, result }),
    });
  } catch (err) {
    console.error("answerWebhookJsonQuery error:", err.message);
  }
}

async function setMyCommands(commands) {
  return callApi("setMyCommands", { commands });
}

async function setChatMenuButton(url, text = "Open Mini App") {
  return callApi("setChatMenuButton", { menu_button: { type: "web_app", text, web_app: { url } } });
}

function buildStartLink(username, referral) {
  const base = `https://t.me/${username}`;
  return referral ? `${base}?start=${encodeURIComponent(referral)}` : base;
}

function miniAppUrl() {
  const url = process.env.MINI_APP_URL;
  if (!url) throw new Error("MINI_APP_URL is not configured");
  return url;
}

/**
 * Absolute URL of the welcome photo served by the frontend. The origin comes
 * from MINI_APP_URL unless FRONTEND_URL overrides it, so no extra required env.
 */
function welcomePhotoUrl() {
  const origin = process.env.FRONTEND_URL || new URL(miniAppUrl()).origin;
  return `${origin.replace(/\/$/, "")}/welcome-image`;
}

module.exports = {
  sendMessage,
  sendPhoto,
  welcomePhotoUrl,
  answerCallbackQuery,
  answerWebhookQuery,
  setMyCommands,
  setChatMenuButton,
  getBotUsername,
  buildStartLink,
  miniAppUrl,
  getUpdates,
  deleteWebhook,
};