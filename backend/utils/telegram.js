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
    throw new Error(`Telegram ${method} failed: ${description}`);
  }
  return data.result;
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

function isValidSecretToken(secretToken) {
  const expected = process.env.WEBHOOK_SECRET_TOKEN;
  if (!expected) return true;
  return secretToken === expected;
}

module.exports = {
  sendMessage,
  answerCallbackQuery,
  answerWebhookQuery,
  setMyCommands,
  setChatMenuButton,
  getBotUsername,
  buildStartLink,
  miniAppUrl,
  isValidSecretToken,
};