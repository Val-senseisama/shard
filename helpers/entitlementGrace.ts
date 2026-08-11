/**
 * A short window after a confirmed purchase during which the server is allowed
 * to be wrong about the tier.
 *
 * Entitlement is granted by RevenueCat's webhook, which is asynchronous. Between
 * Play confirming the charge and that webhook landing, `currentUser` honestly
 * answers `free` — it just hasn't been told yet. Anything that refetches in that
 * gap and writes the result verbatim will wipe out the optimistic `pro` the
 * paywall just set, and the user is left having paid with nothing to show.
 *
 * That gap is easy to hit: returning from the Play purchase sheet is an
 * AppState `active` transition, so a foreground refetch fires right into it.
 *
 * So for a bounded window we keep `pro` and let the server catch up, rather than
 * trusting a value we have good reason to believe is stale. This is deliberately
 * one-directional — it can only preserve access already paid for, never grant
 * access nobody bought, and it expires on its own.
 */

const GRACE_MS = 90_000;

let graceUntil = 0;

/** Call once a purchase is confirmed by the store. */
export function beginEntitlementGrace() {
  graceUntil = Date.now() + GRACE_MS;
}

/** True while a recent purchase may not have reached the server yet. */
export function inEntitlementGrace() {
  return Date.now() < graceUntil;
}

/** Ends the window early — the server has confirmed, so there's nothing to cover. */
export function endEntitlementGrace() {
  graceUntil = 0;
}
