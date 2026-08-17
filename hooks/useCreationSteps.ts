import { useCallback, useMemo, useState } from 'react';

/**
 * The quest creation wizard's step machine.
 *
 * `new-shard.tsx` used to hold `step: 1 | 2` and branch on `step === 2 && mode
 * === 'ai'` at every render site, with "2" written into the header, the step
 * indicator and the back button. That works for exactly two modes that happen to
 * have the same number of steps; it does not survive a third with a different
 * shape (course import is source → review → pace).
 *
 * So steps are data. A mode declares its ordered step ids, and everything
 * else — how many dots to draw, what the header says, where Back goes — is
 * derived. Adding a mode is one line in MODE_STEPS plus its titles.
 */

export type CreationMode = 'ai' | 'manual' | 'course';

export type StepId =
  // shared first step: pick a mode, describe the quest
  | 'compose'
  // ai — a short interview before anything is generated
  | 'sharpen'
  // ai — the editable draft workspace (also where generation streams in)
  | 'shape'
  // manual
  | 'minigoals'
  // course — paste a link, paste text, or screenshots
  | 'source'
  // course — review sections & items, toggle optional, add practice
  | 'curriculumReview'
  // course — choose session days & duration, preview pacing against deadline
  | 'pace';

/**
 * Ordered steps per mode. The first entry is always the mode picker + form,
 * because the user can still switch modes there.
 */
const MODE_STEPS = {
  ai: ['compose', 'sharpen', 'shape'],
  manual: ['compose', 'minigoals'],
  course: ['compose', 'source', 'curriculumReview', 'pace'],
} as const satisfies Record<CreationMode, readonly StepId[]>;

/** Header title per step. Was a nested ternary over (step, mode). */
const STEP_TITLES: Record<StepId, string> = {
  compose: 'New Quest',
  sharpen: 'A few questions',
  shape: 'Your plan',
  minigoals: 'Mini-Goals',
  source: 'Course Source',
  curriculumReview: 'Curriculum',
  pace: 'Your Pace',
};

export interface CreationSteps {
  mode: CreationMode;
  /** Switching mode returns to the first step — step 2 of one mode is
   *  meaningless in another, and the two step lists need not be the same
   *  length. */
  setMode: (mode: CreationMode) => void;

  steps: readonly StepId[];
  step: StepId;
  /** 0-based, for array work. */
  stepIndex: number;
  /** 1-based, for display. */
  stepNumber: number;
  totalSteps: number;
  title: string;
  isFirst: boolean;
  isLast: boolean;

  next: () => void;
  /** No-op on the first step — the caller decides whether that means
   *  `router.back()`. */
  back: () => void;
  goTo: (step: StepId) => void;
  /** Back to the first step of the current mode. */
  reset: () => void;
}

export function useCreationSteps(initialMode: CreationMode = 'ai'): CreationSteps {
  const [mode, setModeState] = useState<CreationMode>(initialMode);
  const [stepIndex, setStepIndex] = useState(0);

  const steps = MODE_STEPS[mode] as readonly StepId[];

  // A mode switch can shorten the list, so clamp rather than trusting the index.
  const safeIndex = Math.min(stepIndex, steps.length - 1);
  const step = steps[safeIndex];

  const setMode = useCallback((next: CreationMode) => {
    setModeState(next);
    setStepIndex(0);
  }, []);

  const next = useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, MODE_STEPS[mode].length - 1));
  }, [mode]);

  const back = useCallback(() => {
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  const goTo = useCallback(
    (target: StepId) => {
      const index = (MODE_STEPS[mode] as readonly StepId[]).indexOf(target);
      // Ignore a step that doesn't belong to this mode rather than landing the
      // wizard on -1 and rendering nothing.
      if (index >= 0) setStepIndex(index);
    },
    [mode]
  );

  const reset = useCallback(() => setStepIndex(0), []);

  return useMemo(
    () => ({
      mode,
      setMode,
      steps,
      step,
      stepIndex: safeIndex,
      stepNumber: safeIndex + 1,
      totalSteps: steps.length,
      title: STEP_TITLES[step],
      isFirst: safeIndex === 0,
      isLast: safeIndex === steps.length - 1,
      next,
      back,
      goTo,
      reset,
    }),
    [mode, setMode, steps, step, safeIndex, next, back, goTo, reset]
  );
}
