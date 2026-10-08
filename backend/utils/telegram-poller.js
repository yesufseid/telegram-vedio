const telegram = require("./telegram");

const DEFAULT_TIMEOUT = Number(process.env.TELEGRAM_POLL_TIMEOUT || 30);
const BACKOFF_MS = 5000;
const BACKOFF_MAX_MS = 60_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Long-polls Telegram for updates and feeds each one to `handleUpdate`.
 *
 * Updates are handled strictly one at a time. That ordering is required: a
 * `/start` stores the referral in memory and the contact message that follows
 * consumes it, so concurrent handling could pair the wrong messages.
 *
 * The acknowledged offset lives in memory. A restart therefore replays recent
 * updates, which is safe: existing users are detected instead of duplicated and
 * the users insert is `ON CONFLICT DO NOTHING`.
 */
function startTelegramPolling({ handleUpdate }) {
  const timeout = DEFAULT_TIMEOUT;

  let running = true;
  let offset;
  let backoff = BACKOFF_MS;
  let webhookCleared = false;

  // Interruptible wait: a stop() during the backoff must not hold the process.
  const sleepUntil = async (ms) => {
    const deadline = Date.now() + ms;
    while (running && Date.now() < deadline) {
      await sleep(Math.min(250, deadline - Date.now()));
    }
  };

  const run = async () => {
    while (running) {
      try {
        const updates = await telegram.getUpdates({ offset, timeout });

        if (!running) return;
        backoff = BACKOFF_MS;

        for (const update of updates) {
          if (!running) return;
          offset = update.update_id + 1;

          try {
            await handleUpdate(update);
          } catch (err) {
            console.error("Telegram update handling failed:", err.message);
          }
        }
      } catch (err) {
        if (!running) return;

        // 401 means the token itself is wrong: retrying cannot help.
        if (err.status === 401) {
          console.error("Telegram polling stopped: BOT_TOKEN was rejected.");
          return;
        }

        // A leftover webhook blocks getUpdates; clear it once and retry.
        if (err.status === 409 && !webhookCleared) {
          webhookCleared = true;
          try {
            await telegram.deleteWebhook({ dropPendingUpdates: false });
            console.warn("Removed an existing Telegram webhook to enable polling.");
            continue;
          } catch (clearErr) {
            console.error("Failed to delete webhook:", clearErr.message);
          }
        }

        console.error(`Telegram polling error (${err.message}); retrying in ${backoff}ms`);
        await sleepUntil(backoff);
        backoff = Math.min(backoff * 2, BACKOFF_MAX_MS);
      }
    }
  };

  const ready = run();

  return {
    /** Stops the loop after the in-flight getUpdates call settles. */
    stop() {
      running = false;
      return ready;
    },
  };
}

module.exports = { startTelegramPolling };
