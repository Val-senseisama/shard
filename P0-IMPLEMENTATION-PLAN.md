# Shard — P0 Implementation Plan (Revenue-Unblocking Fixes)

**Goal:** Ship the three changes that directly unblock Pro conversions, under a **freemium-with-hard-caps** model. These are UI/client changes that make the *existing* paywall actually reachable and enforce the AI-credit gate. Backend cap enforcement is P1 (separate).

Files referenced are relative to repo root (`app/(screens)/...`).

---

## P0.1 — Fix the broken AI-credit gate (highest priority)

**Problem:** In `app/(screens)/new-shard.tsx`, when `aiRemaining === 0`:
- The "Generate Quest with AI" button is only `disabled={loading}` (~line 1410) — a 0-credit user can still tap and trigger a generation.
- The "No AI credits remaining — upgrade to Pro" message (~lines 1204–1208) is a plain `<Text>` with no press handler.

**Change:**
1. Compute a derived flag near the other state (~line 854):
   ```ts
   const outOfCredits = mode === 'ai' && aiRemaining === 0;
   ```
2. In the Generate button's `disabled` prop (~line 1410) and the `handleGenerate` guard, add `|| outOfCredits`. Also bail early in the generate handler if `outOfCredits`.
3. Wrap the credit-status row (~lines 1185–1210) in `AnimatedPressable` (already imported) when `aiRemaining === 0`, navigating to the paywall:
   ```ts
   onPress={() => router.push({ pathname: '/subscribe-pro', params: { source: 'ai_credits' } })}
   ```
   Add a small "Upgrade →" affordance so it reads as tappable.
4. When `outOfCredits`, change the primary CTA copy/behavior from "Generate Quest with AI" to "Unlock unlimited AI — Go Pro" that routes to `/subscribe-pro`.

**Acceptance:** With 0 credits, tapping Generate is impossible; the only forward action leads to the paywall. Pro users (`aiRemaining === -1`) are unaffected.

---

## P0.2 — Contextual paywall triggers (reason-aware)

**Problem:** The paywall (`app/(screens)/subscribe-pro.tsx`) is only reachable from Account settings + the (now-fixed) credit row. No cap-hit ever routes there.

**Change:**
1. Accept an optional `source` param in `subscribe-pro.tsx` (via `useLocalSearchParams`) and render a one-line, reason-specific subheadline above the hero, e.g.:
   - `ai_credits` → "You're out of free AI quests this month."
   - `shard_limit` → "You've reached your 3-shard free limit."
   - `collaborator_limit` → "Free plan includes 1 collaborator."
   - `team_limit` → "Upgrade to create larger teams."
   Default to the current generic copy when `source` is absent.
2. Create a tiny helper `helpers/paywall.ts` exporting `openPaywall(source: string)` = `router.push({ pathname: '/subscribe-pro', params: { source } })`, so every call site is consistent and analytics-taggable later.
3. Wire the first real cap trigger now: in `new-shard.tsx`, when a free user tries to add a 2nd collaborator (friend-role selection) or exceed the shard limit at submit, call `openPaywall('collaborator_limit' | 'shard_limit')` instead of proceeding. (Client-side guard; server enforcement is P1.)

**Acceptance:** Each cap-hit deep-links to the paywall with a specific reason line. `openPaywall` is the single entry used everywhere.

---

## P0.3 — Make the Account "Subscribe to Pro" row a loud upsell

**Problem:** In `app/(screens)/(tabs)/account.tsx` (~lines 263–273) the Pro entry is a plain settings row, visually identical to "Change Password."

**Change:**
1. For free users (`user?.subscriptionTier !== 'pro'`), replace the row with a gradient upsell card rendered *above* the settings sections (reuse the `LinearGradient` `['#7c3aed','#6d28d9']` already used on the paywall/tab bar):
   - Title: "Unlock Shard Pro"
   - Sub: "Unlimited shards, AI quests & analytics"
   - CTA chevron → `openPaywall('account')`.
2. Keep the existing "Manage Subscription" (RevenueCat Customer Center) path unchanged for Pro users.

**Acceptance:** Free users see a prominent, on-brand upsell card; Pro users see the unchanged manage-subscription entry.

---

## Cross-cutting (do alongside P0)

- **Standardize accent color:** `#7c3aed` (`ACCENT` in `components/shard/constants`) and `#8b5cf6` are used interchangeably. Pick `ACCENT` and replace stray `#8b5cf6` in `account.tsx` / `Home.tsx`. Low risk, improves polish.
- **Verify entitlement IDs:** confirm `'Thinkertech Pro'` (`components/UserProvider.tsx`) and `ENTITLEMENT_ID` (`services/purchasesService.ts`) reference the same production RevenueCat entitlement — a mismatch silently downgrades payers. **Check before shipping any gate.**

---

## Explicitly OUT of scope for P0 (tracked as P1+)
- Server-authoritative cap enforcement + the shared "near/at limit" nudge system.
- 7-day trial + onboarding paywall anchor.
- Referral loop, leaderboard, analytics free/Pro split.
- Analytics instrumentation (paywall impressions/source, trial starts, cap-hits) — **strongly recommended to land in parallel** so P0 impact is measurable.

---

## How to verify end-to-end
1. Run the app (`npm run ios` / `npm run android`).
2. Force `aiRemaining = 0` (mock `GET_AI_USAGE` or a test account): confirm Generate is blocked and the row/CTA route to the paywall with `source=ai_credits`.
3. From Account as a free user: confirm the gradient upsell card appears and routes with `source=account`; as a Pro user, confirm Manage Subscription still opens Customer Center.
4. Trigger a collaborator/shard cap: confirm the paywall opens with the correct reason line.
5. Confirm no regressions for Pro users (`subscriptionTier === 'pro'`, `aiRemaining === -1`).
