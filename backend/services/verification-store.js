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
  AVAILABLE: "AVAILABLE",
  // The referred user entered all 5 digits; the referral is being asked to decide.
  SUBMITTED: "SUBMITTED",
  // The referral rejected the code; the user is told to enter it again.
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
  FAILED: "FAILED",
  COMPLETED: "COMPLETED",
});

const OPEN_STATUSES = [STATUS.PENDING, STATUS.AVAILABLE, STATUS.SUBMITTED, STATUS.REJECTED];

// The referral must confirm from the bot within this window, otherwise the
// verification expires and the referred user is told to try again.
const CLICK_TIMEOUT_MS = Number(process.env.AVAILABILITY_TIMEOUT_MS || 60_000);

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
  const now = Date.now();
  const verification = {
    id: crypto.randomUUID(),
    referredUserId,
    referringUserId,
    status: STATUS.PENDING,
    code: null,
    // Bumped on every code submission so the referral's buttons from a previous
    // attempt cannot act on a newer one.
    submitNonce: 0,
    createdAt: now,
    updatedAt: now,
    deadlineAt: now + CLICK_TIMEOUT_MS,
  };

  store.set(verification.id, verification);
  prune();
  return verification;
}

/**
 * Records a full 5-digit submission and moves the verification to SUBMITTED so the
 * referral can accept or reject it. Returns the nonce the referral's buttons must
 * carry, or null when the verification is not awaiting a code.
 */
function markSubmitted(id, code) {
  const verification = store.get(id);
  if (!verification) return null;
  if (![STATUS.AVAILABLE, STATUS.REJECTED].includes(verification.status)) return null;

  verification.status = STATUS.SUBMITTED;
  verification.code = code;
  verification.submitNonce += 1;
  verification.updatedAt = Date.now();
  return verification.submitNonce;
}

/**
 * Flips a PENDING verification to EXPIRED once the referral missed the one minute
 * click window. Done lazily on read so no background timer is needed.
 */
function expireStale() {
  const now = Date.now();
  for (const verification of store.values()) {
    if (verification.status !== STATUS.PENDING) continue;
    if (verification.deadlineAt > now) continue;
    setStatus(verification.id, STATUS.EXPIRED);
  }
}

function findById(id) {
  return store.get(id) || null;
}

/**
 * Resolves a verification only when it belongs to the given referral. Used for the
 * bot button so a leaked callback payload cannot unlock someone else's verification.
 */
function findByIdForReferringUser(id, referringUserId) {
  const verification = store.get(id);
  if (!verification) return null;
  return verification.referringUserId === referringUserId ? verification : null;
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

/**
 * Most recent verification for a referred user whatever its status. Needed because an
 * EXPIRED one is no longer "open", yet the client still has to be told about it.
 */
function latestForReferredUser(referredUserId) {
  let latest = null;
  for (const verification of store.values()) {
    if (verification.referredUserId !== referredUserId) continue;
    if (!latest || verification.createdAt > latest.createdAt) latest = verification;
  }
  return latest;
}

module.exports = {
  STATUS,
  CLICK_TIMEOUT_MS,
  create,
  markSubmitted,
  findById,
  findByIdForReferringUser,
  setStatus,
  expireStale,
  findOpenForReferredUser,
  latestForReferredUser,
};