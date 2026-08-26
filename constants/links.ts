/**
 * Outbound links, in one place.
 *
 * The web copy of these lives in `shard-landing/lib/links.ts`; keep the two in
 * step. The package id was wrong on the site once (`app.shard`, a listing that
 * does not exist) and every download button 404'd silently, which is why neither
 * side inlines these any more.
 */
export const ANDROID_PACKAGE = 'com.xavitech.shard';

export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

export const SITE_URL = 'https://shard.zevbii.com';

/**
 * A Play Store URL that Play Console can attribute, and that can carry a
 * referral code through an install.
 *
 * Play reads the `referrer` parameter off the store link and hands it to the
 * Install Referrer API on first launch, as well as reporting it under
 * Acquisition → traffic sources. That gives us two things the bare URL did not:
 * we can tell an install earned by an invite apart from one that arrived on its
 * own, and the invite's code can travel with it instead of being memorised.
 *
 * The value is a single URL-encoded query string; Play unwraps it once and
 * passes the result through verbatim. Encoding it twice yields one opaque
 * `utm_source` and no code, which is why this is built here and not by hand.
 *
 * `PLAY_STORE_URL` stays untagged — it is the plain canonical link, for places
 * that are not a measurable campaign.
 */
export type PlayLinkSource = 'invite' | 'app_share' | 'support';

export const playStoreUrl = (
  source: PlayLinkSource,
  opts: { campaign?: string; content?: string } = {},
): string => {
  const parts: Record<string, string> = {
    utm_source: source,
    utm_medium: 'app',
    utm_campaign: opts.campaign ?? 'referral',
  };
  if (opts.content) parts.utm_content = opts.content;

  const referrer = Object.entries(parts)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  return `${PLAY_STORE_URL}&referrer=${encodeURIComponent(referrer)}`;
};

/**
 * The message an invite carries.
 *
 * It used to be code-only — "Use my code ABC123 when you sign up" with no link
 * anywhere in it. Nobody types a referral code into Play search, so the one
 * growth loop the product has terminated in a dead end. It also led with
 * "turn your goals into quests", which is the positioning we deliberately moved
 * off (see PLAN-product.md §3): the pitch is the plan, not the game layer.
 *
 * The code now rides along in the store link's `referrer`, so the friend does
 * not have to carry it across the install themselves — see
 * `helpers/installReferrer.ts`. The code stays in the text as well, because the
 * automatic path needs a Play install to have happened and the manual one
 * always works.
 */
export const inviteMessage = (referralCode: string) =>
  `I'm using Shard to plan my goals — you tell it what you want to get done and it writes the actual plan, with a date on every task.\n\n` +
  `Use my code ${referralCode} when you sign up and we both get bonus AI credits:\n` +
  `${playStoreUrl('invite', { content: referralCode })}`;
