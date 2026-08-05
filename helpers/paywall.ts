import { router } from 'expo-router';
import { track } from '@/helpers/analytics';

/**
 * Paywall entry points. `source` is surfaced on the paywall as a reason-specific
 * subheadline and is the hook for future analytics (paywall impressions by source).
 */
export type PaywallSource =
  | 'ai_credits'
  | 'shard_limit'
  | 'collaborator_limit'
  | 'team_limit'
  | 'account'
  // Shown right after the user's FIRST completed quest — the moment they have
  // proof the product works, and where the trial now ends. This replaces the
  // onboarding paywall, which asked for money before anything had been created.
  | 'first_completion'
  | 'generic';

/**
 * Single, consistent way to open the Pro paywall so every trigger is taggable.
 */
export const openPaywall = (source: PaywallSource = 'generic') => {
  // Every paywall trigger flows through here — the funnel's top event.
  // source doubles as the cap-hit signal (ai_credits | shard_limit | collaborator_limit | …).
  track('paywall_impression', { source });
  router.push({ pathname: '/subscribe-pro', params: { source } });
};
