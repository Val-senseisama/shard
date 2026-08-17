import { useUserStore } from '~/store/user.store';
import { useFriendsStore } from '~/store/friends.store';

/**
 * Progressive disclosure.
 *
 * The app grew a lot of surface — leaderboard, teams, challenges, side quests,
 * achievements, chat polls — well ahead of having users to justify it. A brand
 * new account currently sees nine competing entry points, none of which mean
 * anything until they've done the one thing that matters: create a quest and
 * start finishing it.
 *
 * So features reveal themselves when they become *true* rather than when the
 * screen happens to render. Nothing is removed — a leaderboard with no friends on
 * it isn't a feature, it's a dead end that costs a new user attention.
 *
 * Rules live here, in one place, so "when does X appear" is answerable without
 * reading five screens.
 */

export interface UnlockState {
  /** Competing on XP needs someone to compete with. */
  leaderboard: boolean;
  /** Teams need enough people to be a team. */
  teams: boolean;
  /** Challenges assume you already know what finishing feels like. */
  challenges: boolean;
  /** Always on: side quests are the daily-habit mechanic, not an extra. */
  sideQuests: boolean;
  /** Achievements are only interesting once some exist. */
  achievements: boolean;
  /**
   * Offering the home-screen widget needs a streak worth protecting.
   *
   * The widget's whole pitch is "don't lose the number", so on day one it is
   * asking someone to rearrange their home screen for a zero. This gates the
   * *earned* half of the decision only — whether the device can pin a widget,
   * and whether one is already there, is asked separately at the call site.
   */
  widgetPrompt: boolean;
}

export interface UnlockInputs {
  friendCount: number;
  hasCompletedFirstQuest: boolean;
  achievementCount: number;
  currentStreak: number;
}

/** Pure so the thresholds are reviewable and testable in one glance. */
export function computeUnlocks(input: UnlockInputs): UnlockState {
  return {
    leaderboard: input.friendCount >= 1 || input.hasCompletedFirstQuest,
    teams: input.friendCount >= 3,
    challenges: input.hasCompletedFirstQuest,
    sideQuests: true,
    achievements: input.achievementCount > 0 || input.hasCompletedFirstQuest,
    widgetPrompt: input.currentStreak >= 2,
  };
}

/** What's currently unlocked for the signed-in user. */
export function useUnlocks(): UnlockState {
  const user = useUserStore((s) => s.user);
  const friends = useFriendsStore((s) => s.friends);

  return computeUnlocks({
    friendCount: friends?.length ?? 0,
    hasCompletedFirstQuest: !!user?.hasCompletedFirstQuest,
    achievementCount: user?.achievements?.length ?? 0,
    currentStreak: user?.currentStreak ?? 0,
  });
}
