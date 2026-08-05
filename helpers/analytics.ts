import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import Session from '@/helpers/Session';
import { CONFIG } from '@/config';

/**
 * Product-analytics client. Fire-and-forget telemetry for the revenue funnel.
 *
 * Decoupled from Apollo on purpose: a plain fetch means a failed/blocked track
 * can never touch app state, the cache, or the UX. All errors are swallowed.
 * Keep event names in sync with the server `EventName` union (Helpers/Telemetry.ts).
 */
export type AnalyticsEventName =
  | 'paywall_impression'
  | 'upgrade_tap'
  | 'purchase_completed'
  | 'purchase_cancelled'
  // Growth loop: a completion card was handed to the OS share sheet. Paired with
  // the server's `share_completed` so share rate per finished quest is measurable.
  | 'share_tapped';

const ANON_ID_KEY = 'analytics_anon_id';
let cachedAnonId: string | null = null;

/** Stable per-install id so pre-auth events can be tied together. */
async function getAnonId(): Promise<string> {
  if (cachedAnonId) return cachedAnonId;
  try {
    const existing = await Session.get(ANON_ID_KEY);
    if (existing && typeof existing === 'string') {
      cachedAnonId = existing;
      return existing;
    }
    const fresh = Crypto.randomUUID();
    await Session.set(ANON_ID_KEY, fresh);
    cachedAnonId = fresh;
    return fresh;
  } catch {
    // If storage is unavailable, fall back to an ephemeral id for this session.
    cachedAnonId = cachedAnonId || Crypto.randomUUID();
    return cachedAnonId;
  }
}

const TRACK_MUTATION = `mutation TrackEvent($input: TrackEventInput!) { trackEvent(input: $input) { success } }`;

/**
 * Record a funnel event. Never awaited on the hot path; never throws.
 */
export function track(
  name: AnalyticsEventName,
  opts: { source?: string; props?: Record<string, unknown> } = {}
): void {
  // Detach from the caller entirely — best-effort.
  (async () => {
    try {
      const anonId = await getAnonId();
      const token = (await Session.getCookie('x-access-token')) || '';
      await fetch(CONFIG.GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': token,
        },
        credentials: 'omit',
        body: JSON.stringify({
          query: TRACK_MUTATION,
          variables: {
            input: {
              name,
              source: opts.source,
              props: opts.props,
              platform: Platform.OS,
              anonId,
            },
          },
        }),
      });
    } catch {
      // swallow — telemetry must never affect the user
    }
  })();
}
