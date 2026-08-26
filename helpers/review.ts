import * as StoreReview from 'expo-store-review';
import * as SecureStore from 'expo-secure-store';

import { track } from '~/helpers/analytics';

/**
 * Asking for a store rating, once, at a moment that has earned it.
 *
 * The listing went live with no review prompt at all, so it carries no ratings —
 * which is the single largest tax on install conversion we have. Every
 * competitor in the category shows a score; an empty ratings block next to them
 * reads as abandonware no matter how good the copy above it is.
 *
 * The rules this encodes, all of which matter more than the prompt itself:
 *
 * - **Only after a real win.** The native sheet can be shown a limited number of
 *   times per user and Play gives no way to know whether it appeared, so the one
 *   shot has to land on someone who has just finished something. A prompt after
 *   a failure or a cancelled purchase buys a one-star review.
 * - **Never on the first completion.** That moment belongs to the Pro case on
 *   `quest-complete.tsx`; two asks stacked on one screen make both worse, and
 *   the money one is worth more.
 * - **Never incentivised.** Play's policy prohibits rewarding reviews and the
 *   enforcement is automated. Nothing here may ever be tied to credits, XP or a
 *   trial extension.
 * - **Once ever, and non-blocking.** A user who declines is not asked again by
 *   us; whether the OS actually rendered anything is not ours to know.
 */

const ASKED_KEY = 'store_review_asked';

/**
 * A moment good enough to ask on. Passed through to analytics so the trigger
 * that actually produces ratings can be told apart from the ones that don't.
 */
export type ReviewTrigger = 'quest_complete' | 'streak_milestone';

/**
 * Ask for a rating if this user has never been asked and the platform can show
 * the sheet. Resolves either way; callers should not branch on the result.
 *
 * Returns true only when the request was actually handed to the OS — useful in
 * tests and for the analytics event, not as a signal that anyone rated anything.
 */
export async function maybeAskForReview(trigger: ReviewTrigger): Promise<boolean> {
  try {
    const alreadyAsked = await SecureStore.getItemAsync(ASKED_KEY);
    if (alreadyAsked) return false;

    // `isAvailableAsync` covers the platform; `hasAction` covers whether there is
    // anywhere to send the user on this particular build and store.
    const available = await StoreReview.isAvailableAsync();
    if (!available) return false;
    if (!(await StoreReview.hasAction())) return false;

    // Written before the request, not after: if the sheet appears and the app is
    // backgrounded mid-flow, the user has still been asked, and asking twice is
    // the failure mode worth avoiding.
    await SecureStore.setItemAsync(ASKED_KEY, String(Date.now()));

    await StoreReview.requestReview();
    track('review_prompted', { props: { trigger } });
    return true;
  } catch {
    // A rating request is never worth an error in a success flow.
    return false;
  }
}
