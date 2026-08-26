import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Carrying a referral code across the install.
 *
 * The invite flow used to end in a dead end: the message said "use my code
 * ABC123" and linked to a bare Play Store page, so the friend had to hold six
 * characters in their head through a store visit, a download and a signup form.
 * Realistically almost nobody does, which meant the only compounding loop in
 * the product converted at close to nothing.
 *
 * `playStoreUrl('invite', { content: CODE })` now puts the code in the link's
 * `referrer` parameter. Play stores that string against the install and hands it
 * back on first launch through the Install Referrer API, so the register screen
 * can prefill the field and nobody has to remember anything.
 *
 * Three things worth knowing before touching this:
 *
 * 1. **It is Android- and Play-only.** A sideloaded APK, an emulator without
 *    Play Services, or iOS returns nothing. Every failure here is silent and
 *    non-blocking by design — the manual code entry still works, and an invite
 *    is never worth stalling a signup screen over.
 * 2. **It is read once.** Play keeps returning the referrer for the life of the
 *    install, but a code that has already been offered should not reappear on a
 *    later signup, so the first read is recorded and short-circuits the rest.
 * 3. **The native module needs a build.** It is autolinked, so it exists in a
 *    dev client or a release build and not in Expo Go — hence the guarded
 *    require rather than a top-level import.
 */

const READ_FLAG_KEY = 'install_referrer_read';

/** The shape the native module hands back. */
interface InstallReferrerInfo {
  installReferrer?: string;
}

type ReferrerCallback = (info: InstallReferrerInfo, error?: unknown) => void;

interface PlayInstallReferrerModule {
  getInstallReferrerInfo(cb: ReferrerCallback): void;
}

function loadModule(): PlayInstallReferrerModule | null {
  if (Platform.OS !== 'android') return null;
  try {
    // Guarded: absent in Expo Go and on any platform without the native side.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-play-install-referrer');
    return mod?.PlayInstallReferrer ?? null;
  } catch {
    return null;
  }
}

/**
 * The raw referrer string Play recorded for this install, or null.
 *
 * Wrapped in a timeout because the underlying call binds to a Play Services
 * connection: on a device where that service is missing or slow the callback can
 * simply never fire, and a signup screen must not wait on it.
 */
function getReferrerString(timeoutMs = 2500): Promise<string | null> {
  const mod = loadModule();
  if (!mod) return Promise.resolve(null);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);

    try {
      mod.getInstallReferrerInfo((info, error) => {
        clearTimeout(timer);
        finish(error ? null : (info?.installReferrer ?? null));
      });
    } catch {
      clearTimeout(timer);
      finish(null);
    }
  });
}

/**
 * Pull one parameter out of a referrer string.
 *
 * Play hands the value back exactly as it was sent — a query string such as
 * `utm_source=invite&utm_campaign=referral&utm_content=ABC123` — so it parses
 * like a query string and not like a URL. Values arrive percent-encoded.
 */
export function parseReferrer(referrer: string): Record<string, string> {
  const out: Record<string, string> = {};

  for (const pair of referrer.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    if (eq < 1) continue;

    const key = pair.slice(0, eq);
    const rawValue = pair.slice(eq + 1);
    try {
      out[decodeURIComponent(key)] = decodeURIComponent(rawValue);
    } catch {
      // A malformed escape is not worth losing the rest of the string over.
      out[key] = rawValue;
    }
  }

  return out;
}

/**
 * A referral code that came in with the install, or null.
 *
 * Only returns a code from a link we built as an invite: an install attributed
 * to the site or a video carries campaign parameters but no code, and treating
 * some other `utm_content` as one would silently credit the wrong person.
 *
 * Safe to call on every mount of the register screen — after the first call it
 * resolves to null without touching the native module.
 */
export async function consumeInstallReferralCode(): Promise<string | null> {
  if (Platform.OS !== 'android') return null;

  try {
    const alreadyRead = await SecureStore.getItemAsync(READ_FLAG_KEY);
    if (alreadyRead) return null;
  } catch {
    // If we can't read the flag we can't guarantee once-only, and offering a
    // stale code is worse than offering none.
    return null;
  }

  const referrer = await getReferrerString();

  // Mark it read whatever came back, so a device with no Play Services doesn't
  // pay the timeout on every visit to the screen.
  try {
    await SecureStore.setItemAsync(READ_FLAG_KEY, String(Date.now()));
  } catch {
    // Non-fatal: worst case we look again next time.
  }

  if (!referrer) return null;

  const params = parseReferrer(referrer);
  if (params.utm_source !== 'invite') return null;

  const code = (params.utm_content || '').trim().toUpperCase();
  return code ? code : null;
}
