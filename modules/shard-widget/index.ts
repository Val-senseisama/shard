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
}>('ShardWidget');

/** One task, as the widget renders it. */
export interface WidgetTask {
  id: string;
  title: string;
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
