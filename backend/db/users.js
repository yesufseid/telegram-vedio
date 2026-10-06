const crypto = require("crypto");
const pool = require("./pool");

const ROLES = Object.freeze({
  USER: "USER",
  ADMIN: "ADMIN",
  SUPERADMIN: "SUPERADMIN",
});

const mapUser = (row) =>
  row
    ? {
        id: row.id,
        username: row.username,
        phoneNumber: row.phone_number,
        telegramChatId: row.telegram_chat_id,
        role: row.role,
        referral: row.referral,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    : null;

const newId = () => crypto.randomUUID();

async function findByTelegramChatId(telegramChatId) {
  const { rows } = await pool.query(
    "SELECT * FROM users WHERE telegram_chat_id = $1 LIMIT 1",
    [String(telegramChatId)]
  );
  return mapUser(rows[0]);
}

async function findById(id) {
  const { rows } = await pool.query("SELECT * FROM users WHERE id = $1 LIMIT 1", [id]);
  return mapUser(rows[0]);
}

async function findByUsername(username) {
  if (!username) return null;
  const { rows } = await pool.query(
    "SELECT * FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1",
    [username]
  );
  return mapUser(rows[0]);
}

async function findSuperadmin() {
  const { rows } = await pool.query(
    "SELECT * FROM users WHERE role = $1 AND username IS NOT NULL ORDER BY created_at ASC LIMIT 1",
    [ROLES.SUPERADMIN]
  );
  return mapUser(rows[0]);
}

async function insertUser({ username, phoneNumber, telegramChatId, role, referral }) {
  const { rows } = await pool.query(
    `INSERT INTO users (id, username, phone_number, telegram_chat_id, role, referral)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (telegram_chat_id) DO NOTHING
     RETURNING *`,
    [newId(), username || null, phoneNumber, String(telegramChatId), role || ROLES.USER, referral]
  );

  if (rows[0]) return { user: mapUser(rows[0]), created: true };

  return { user: await findByTelegramChatId(telegramChatId), created: false };
}

async function updatePhoneNumber(id, phoneNumber) {
  const { rows } = await pool.query(
    "UPDATE users SET phone_number = $2, updated_at = NOW() WHERE id = $1 RETURNING *",
    [id, phoneNumber]
  );
  return mapUser(rows[0]);
}

async function ping() {
  const { rows } = await pool.query("SELECT 1 AS ok");
  return rows[0]?.ok === 1;
}

module.exports = {
  ROLES,
  findByTelegramChatId,
  findById,
  findByUsername,
  findSuperadmin,
  insertUser,
  updatePhoneNumber,
  ping,
};