const users = require("../db/users");

const TIMEOUT_MS = Number(process.env.AVAILABILITY_TIMEOUT_MS || 60_000);
const INTERVAL_MS = Number(process.env.AVAILABILITY_POLL_INTERVAL_MS || 5_000);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function probeExternalEndpoint() {
  const url = process.env.AVAILABILITY_PROBE_URL;
  if (!url) return true;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url, { method: "GET", signal: controller.signal });
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * A single availability attempt. This performs real checks (database
 * connectivity and, when configured, the upstream verification endpoint).
 * It never returns a fabricated result.
 */
async function checkOnce() {
  const databaseUp = await users.ping().catch(() => false);
  if (!databaseUp) return false;

  return probeExternalEndpoint();
}

/**
 * Runs the availability check for up to one minute before the referral is
 * allowed into the existing verification page.
 */
async function runAvailabilityCheck({ onAttempt } = {}) {
  const deadline = Date.now() + TIMEOUT_MS;
  let attempts = 0;

  for (;;) {
    attempts += 1;
    const available = await checkOnce();
    if (typeof onAttempt === "function") onAttempt({ attempts, available });

    if (available) {
      return { available: true, attempts, durationMs: TIMEOUT_MS - (deadline - Date.now()) };
    }

    if (Date.now() + INTERVAL_MS >= deadline) {
      return {
        available: false,
        attempts,
        durationMs: TIMEOUT_MS - (deadline - Date.now()),
      };
    }

    await sleep(INTERVAL_MS);
  }
}

module.exports = { runAvailabilityCheck, TIMEOUT_MS, INTERVAL_MS };