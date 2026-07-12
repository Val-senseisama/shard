# Shard — App Report (for AI planning)

**Purpose:** Quick brief so another model can plan improvements. **Business goal: maximize revenue.**

## What it is
Gamified goal app (Expo/React Native, Apollo GraphQL, RevenueCat). Users create **Shards** (goals) → **mini-goals** → **tasks**, earning XP, levels, RPG stats (STR/INT/CHA/END/CRE), streaks, achievements, side quests. Social: friends, collaborators, accountability partners, teams, per-shard chat. AI engine breaks a goal into scheduled quests.

## Stack
Expo SDK 53, React Native 0.79, expo-router (file-based), NativeWind, Apollo Client, RevenueCat (`react-native-purchases`), Google Sign-In, expo-sqlite (offline mutation queue), Firebase, expo-notifications.

## Key screens (`app/`)
- `(auth)/`: welcome, onboarding (3 slides), login, register, complete-profile
- `(screens)/(tabs)/`: Home (shard list), schedule (calendar), new-shard-tab (FAB → create), friends (+teams), account (profile/settings)
- `(screens)/`: new-shard (**AI/manual create — the money screen**), subscribe-pro (paywall), productivity (analytics), side-quests, achievements, shard/[id]/ (detail, chat, edit, settings)

## Monetization today
- **Model:** RevenueCat Pro — monthly / yearly / lifetime. Target model going forward: **freemium with hard caps.**
- **Only real gate:** AI goal-breakdown credits (`getAIUsage`; `-1` = unlimited/Pro).
- **Entitlement:** split across `subscriptionTier` (local) + RevenueCat (`UserProvider.tsx` checks `'Thinkertech Pro'`; `purchasesService.ts` uses `ENTITLEMENT_ID`) — verify they match prod.

## Critical problems (ranked, revenue-first)
1. **AI-credit gate is broken** — at 0 credits the Generate button is still tappable and "upgrade to Pro" is plain text, not a paywall link. `new-shard.tsx:~1410, ~1204`. **Fix first.**
2. **Everything else is free & uncapped** — no shard/collaborator/team limits; analytics free; paywall promises ("unlimited shards, advanced analytics, ad-free") are fictional. No reason to pay.
3. **Paywall is buried** — only reachable from Account settings. No contextual cap-hit triggers, no onboarding paywall, no trial.
4. **No growth loop** — social graph exists but no referral, no leaderboard.
5. **No analytics instrumentation** — cannot measure paywall impressions, trial starts, cap-hits, conversion. Blind.

## Proposed free vs Pro line
Free: 3 active shards · ~5 AI credits/mo · 1 collaborator · create 1 small team (≤3) · 7-day analytics · manual scheduling.
Pro: unlimited shards/credits/collaborators/teams · full analytics + export · AI auto-scheduling · exclusive quests/cosmetics.
**Rule:** cap quantity & automation, never cap *finishing existing work* (no lockout of existing shards → avoids churn/refunds).

## Roadmap
- **P0 (unblock revenue) — ✅ DONE (client-side):** AI-credit hard stop + tappable paywall CTA; contextual reason-aware paywall triggers; loud Account upsell card. Details below. Spec: `P0-IMPLEMENTATION-PLAN.md`.
- **P1 (next):** server-side cap enforcement + "near/at limit" nudges; 7-day trial + onboarding paywall anchor.
- **P2:** referral (both get bonus credits/trial); friends/teams leaderboard; analytics free/Pro split.
- **P3 polish:** centralize XP formula (dup in Home/Account) + accent color (`#7c3aed` vs `#8b5cf6`, deliberate on Account — decide before swapping); explain radar stats; onboarding "create your first AI quest" activation.
- **Always:** instrument analytics in parallel so impact is measurable (paywall impressions by `source`, trial starts, cap-hits, conversion).

## P0 implementation status (done)
- **New:** `helpers/paywall.ts` → `openPaywall(source)`, the single taggable entry for every paywall trigger. `source` values: `ai_credits | shard_limit | collaborator_limit | team_limit | account | generic`.
- **`new-shard.tsx`:** 0-credit state now hard-stops the AI Generate button and routes to the paywall; credit row is tappable ("Upgrade →") when empty; CTA becomes "Unlock unlimited AI — Go Pro"; server `needsUpgrade` also opens the paywall. Free users are capped at 1 collaborator (`FREE_COLLABORATOR_LIMIT`) → paywall.
- **`subscribe-pro.tsx`:** reads `source` param and shows a reason-specific line in the hero (`SOURCE_REASON` map); falls back to generic copy when absent.
- **`account.tsx`:** free users see a prominent gradient "Unlock Shard Pro" card (routes `source=account`); Pro users keep "Manage Subscription" (RevenueCat Customer Center).
- **Verified:** `tsc --noEmit` clean project-wide. Entitlement ID `'Thinkertech Pro'` matches across `UserProvider.tsx` + `purchasesService.ts` (no silent-downgrade risk). Not runtime-driven (needs iOS/Android simulator; RevenueCat/native modules don't run on web).

### ⚠️ Backend must confirm (P0 client guards only)
1. **Collaborator cap (1 free)** is enforced client-side only — server must enforce too, else it's bypassable. Change `FREE_COLLABORATOR_LIMIT` in `new-shard.tsx` if the intended free limit differs.
2. **`needsUpgrade`** is routed with `source='ai_credits'` (the AI-create path); if that flag can also mean a *shard* limit, add a distinct signal. Server's message still shows accurate specifics via toast.
3. Confirm `getAIUsage` actually resets monthly and returns `-1` for Pro (the gate relies on it).

## Don't
Paywall completing tasks/streaks or opening existing shards; ship caps without a fair upgrade path (trial + contextual paywall); add intrusive ads before trying hard-caps + trial.

## Deeper detail
Full per-screen audit: `~/.claude/plans/inherited-popping-goblet.md`. P0 build spec: `P0-IMPLEMENTATION-PLAN.md`.
