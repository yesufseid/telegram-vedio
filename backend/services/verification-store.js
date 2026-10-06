const crypto = require("crypto");

/**
 * In-memory verification state.
 *
 * The database only holds the `users` table, so verification lifecycle state is
 * kept here instead. Consequences of this choice:
 *   - state is lost when the process restarts
 *   - state is per-instance, so horizontal scaling needs sticky sessions or a
 *     shared store later
 */
const STATUS = Object.freeze({
  PENDING: "PENDING",
  PREPARING: "PREPARING",
  AVAILABLE: "AVAILABLE",
  FAILED: "FAILED",
  COMPLETED: "COMPLETED",
});

const OPEN_STATUSES = [STATUS.PENDING, STATUS.PREPARING, STATUS.AVAILABLE];

const MAX_ENTRIES = 5000;
const store = new Map();

function prune() {
  if (store.size <= MAX_ENTRIES) return;

  const entries = [...store.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt);
  for (const [id] of entries.slice(0, store.size - MAX_ENTRIES)) {
    if (store.get(id).status === STATUS.COMPLETED) store.delete(id);
  }
}

function create({ referredUserId, referringUserId }) {
  const verification = {
    id: crypto.randomUUID(),
    referredUserId,
    referringUserId,
    status: STATUS.PENDING,
    code: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  store.set(verification.id, verification);
  prune();
  return verification;
}

function findById(id) {
  return store.get(id) || null;
}

function setStatus(id, status, code = undefined) {
  const verification = store.get(id);
  if (!verification) return null;

  verification.status = status;
  if (code !== undefined) verification.code = code;
  verification.updatedAt = Date.now();
  return verification;
}

/** The open verification for a referred user, if any. */
function findOpenForReferredUser(referredUserId) {
  for (const verification of [...store.values()].reverse()) {
    if (verification.referredUserId === referredUserId && OPEN_STATUSES.includes(verification.status)) {
      return verification;
    }
  }
  return null;
}

/** Most recent verification for a referred user, whatever its status. */
function latestForReferredUser(referredUserId) {
  let latest = null;
  for (const verification of store.values()) {
    if (verification.referredUserId !== referredUserId) continue;
    if (!latest || verification.createdAt > latest.createdAt) latest = verification;
  }
  return latest;
}

/** Open verifications a referral is responsible for, newest first. */
function listForReferringUser(referringUserId) {
  return [...store.values()]
    .filter(
      (verification) =>
        verification.referringUserId === referringUserId &&
        [STATUS.PENDING, STATUS.PREPARING, STATUS.AVAILABLE, STATUS.FAILED].includes(
          verification.status
        )
    )
    .sort((a, b) => b.createdAt - a.createdAt);
}

module.exports = {
  STATUS,
  create,
  findById,
  setStatus,
  findOpenForReferredUser,
  latestForReferredUser,
  listForReferringUser,
};