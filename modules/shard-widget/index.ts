import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

/**
 * Home-screen widget bridge.
 *
 * Android only for now. iOS needs a WidgetKit extension, which cannot be built
 * without Xcode — the JS surface here is deliberately platform-agnostic so the
 * iOS implementation drops in behind it without touching call sites.
 *
 * Loaded with `requireOptionalNativeModule` so a JS bundle running against a
 * build that predates this module (or on iOS) degrades to no-ops rather than
 * throwing at import time.
 */
const Native = requireOptionalNativeModule<{
  setSnapshot(json: string): boolean;
  getPending(): string;
  clearPending(taskIds: string[]): boolean;
  requestUpdate(): boolean;
  isWidgetInstalled(): boolean;
  canPinWidget(): boolean;
  requestPinWidget(): boolean;
}>('ShardWidget');

/** One task, as the widget renders it. */
export interface WidgetTask {
  id: string;
  title: string;
  /**
   * What kind of thing this is, which decides whether the widget can finish it.
   *
   * A `task` carries the shard/mini-goal/index that `completeTask` addresses, so
   * the widget offers "Mark done" and completes it in place. A `sideQuest` needs
   * `completeSideQuest` — a different mutation with no shard to aim at — so the
   * widget can only hand the user into the app. Absent on snapshots written
   * before this field existed; treat that as `task`, which is what they all were.
   */
  kind?: 'task' | 'sideQuest';
  miniGoalId: string;
  shardId: string;
  shardTitle?: string | null;
  miniGoalTitle?: string | null;
  /** Position within the parent mini-goal — completeTask addresses tasks by index. */
  taskIndex: number;
}

/** Everything the widget draws. Kept small: it crosses a process boundary. */
export interface WidgetSnapshot {
  streak: number;
  /** Whether today's activity already counted, which decides "safe" vs "at risk". */
  doneToday: boolean;
  nextTask: WidgetTask | null;
  /**
   * Today's completed / scheduled counts, for the widget's XP bar.
   *
   * Sent rather than derived because the widget only ever receives `nextTask` —
   * one task, by design — so it has nothing to count. Two integers is a cheap
   * way to give the card a sense of a day in progress instead of a single
   * decontextualised to-do.
   */
  tasksDone: number;
  tasksTotal: number;
  updatedAt: number;
}

/** A completion the user tapped on the widget that hasn't reached the server. */
export interface PendingCompletion {
  taskId: string;
  miniGoalId: string;
  shardId: string;
  taskIndex: number;
  at: number;
}

export const isWidgetSupported = Platform.OS === 'android' && Native != null;

/** True only when the user actually has the widget placed on a home screen. */
export function isWidgetInstalled(): boolean {
  if (!Native) return false;
  try {
    return Native.isWidgetInstalled();
  } catch {
    return false;
  }
}

/**
 * Whether the launcher offers a one-tap "add to home screen" dialog.
 *
 * Check before showing anything that offers to add the widget. Below Android 8
 * there is no such API, and a launcher above it may still decline — on those
 * devices the only route is the long-press widget picker, which is not something
 * a button can do for the user.
 */
export function canPinWidget(): boolean {
  if (!Native) return false;
  try {
    return Native.canPinWidget();
  } catch {
    return false;
  }
}

/**
 * Ask the launcher to show its "add widget" dialog.
 *
 * Returns whether the request was accepted, not whether the user accepted it —
 * see the note on the native side. Callers should re-check `isWidgetInstalled()`
 * later rather than treating `true` as done.
 */
export function requestPinWidget(): boolean {
  if (!Native) return false;
  try {
    return Native.requestPinWidget();
  } catch {
    return false;
  }
}

/**
 * Replace what the widget displays.
 *
 * Never throws: a widget is decoration on top of the app, and a failure to
 * update it must not surface as an error in a screen the user is looking at.
 */
export function setWidgetSnapshot(snapshot: WidgetSnapshot): void {
  if (!Native) return;
  try {
    Native.setSnapshot(JSON.stringify(snapshot));
  } catch {
    // ignored by design — see above
  }
}

/** Completions tapped on the widget, oldest first. */
export function getPendingCompletions(): PendingCompletion[] {
  if (!Native) return [];
  try {
    const parsed = JSON.parse(Native.getPending());
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Drop completions the app has now successfully sent. */
export function clearPendingCompletions(taskIds: string[]): void {
  if (!Native || taskIds.length === 0) return;
  try {
    Native.clearPending(taskIds);
  } catch {
    // ignored by design
  }
}

/** Re-render without changing the snapshot. */
export function refreshWidget(): void {
  if (!Native) return;
  try {
    Native.requestUpdate();
  } catch {
    // ignored by design
  }
}
