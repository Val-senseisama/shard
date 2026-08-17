import { useCallback, useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  START_QUEST_INTAKE,
  START_QUEST_DRAFT,
  EDIT_QUEST_DRAFT,
  COMMIT_QUEST_DRAFT,
  REFINE_QUEST_DRAFT,
  UNDO_QUEST_DRAFT,
} from '~/Graphql/Mutations';
import WebSocketService from '~/helpers/WebSocketService';

/**
 * Owns the quest draft for the whole creation flow.
 *
 * A draft is a quest that isn't real yet — the server writes nothing to the
 * user's quest list until `commit()`. That's what makes the review step
 * editable: every change is a cheap draft write rather than a mutation of a live
 * quest, and abandoning costs nothing.
 */

export interface IntakeQuestion {
  slot: string;
  prompt: string;
  /** Which control to render: text | rhythm | resources. */
  inputKind: string;
  placeholder?: string;
  /** Tappable answers in the user's voice. Absent for the rhythm slot. */
  suggestions?: string[];
}

export interface DraftStep {
  id: string;
  text: string;
  estimatedDuration?: string;
  xpReward?: number;
}

export interface DraftMiniQuest {
  id: string;
  title: string;
  description?: string;
  estimatedDuration?: string;
  xpReward?: number;
  /** What to search for. Never a URL — only present if suggestions were opted in. */
  searchHint?: string;
  /** Hand-set; overrides the scheduler at commit. Epoch millis as a string. */
  dueDate?: string | null;
  steps: DraftStep[];
}

export interface DraftPlan {
  mainQuest: { title: string; description?: string; estimatedDuration?: string; xpReward?: number };
  miniQuests: DraftMiniQuest[];
  warning?: string | null;
}

export interface QuestDraft {
  id: string;
  goal: string;
  deadline?: string | null;
  plan?: DraftPlan | null;
  refinements: string[];
  refinementsRemaining: number;
  canUndo: boolean;
}

/** What changed in the last refinement, so the user isn't left diffing by eye. */
export interface PlanChange {
  kind: 'added' | 'removed' | 'changed' | 'reordered';
  phaseId: string;
  title: string;
}

/** A phase that has arrived over the socket but isn't part of a saved plan yet. */
export interface StreamedPhase {
  title: string;
  stepCount: number;
  estimatedDuration?: string;
  index: number;
}

/** What the user answered. Mirrors QuestBriefInput on the server. */
export interface BriefAnswers {
  done?: string;
  why?: string;
  blockers?: string;
  rhythm?: { days: number[]; sessionMinutes: number; raw?: string };
  /** What they're already following — a pasted link or a description. */
  aids?: string;
  wantsSuggestions?: boolean;
  skipped?: string[];
}

export type DraftEditOp =
  | 'renameQuest'
  | 'renamePhase'
  | 'removePhase'
  | 'reorderPhase'
  | 'redatePhase'
  | 'setDeadline'
  | 'editTask'
  | 'addTask'
  | 'removeTask';

export interface DraftEdit {
  op: DraftEditOp;
  phaseId?: string;
  taskId?: string;
  value?: string;
  toIndex?: number;
  dueDate?: string;
}

export function useQuestDraft() {
  const [draft, setDraft] = useState<QuestDraft | null>(null);
  const [questions, setQuestions] = useState<IntakeQuestion[]>([]);
  const [generating, setGenerating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [changes, setChanges] = useState<PlanChange[]>([]);
  const [refining, setRefining] = useState(false);
  const [streamedPhases, setStreamedPhases] = useState<StreamedPhase[]>([]);

  const [startIntake] = useMutation(START_QUEST_INTAKE);
  const [startDraft] = useMutation(START_QUEST_DRAFT);
  const [editDraft] = useMutation(EDIT_QUEST_DRAFT);
  const [commitDraft] = useMutation(COMMIT_QUEST_DRAFT);
  const [refineDraft] = useMutation(REFINE_QUEST_DRAFT);
  const [undoDraft] = useMutation(UNDO_QUEST_DRAFT);

  /**
   * Phases arrive over the socket as the model writes them, so the wait shows
   * the plan appearing rather than a spinner inventing progress.
   *
   * Purely cosmetic: what gets saved is the plan the mutation returns. If the
   * socket is down these events simply never arrive and the spinner shows —
   * which is why nothing here feeds back into the draft.
   */
  useEffect(() => {
    const socket = WebSocketService.getSocket();
    if (!socket) return;
    const onPhase = (p: StreamedPhase) =>
      setStreamedPhases((prev) => (prev.some((x) => x.index === p.index) ? prev : [...prev, p]));
    socket.on('quest:draft:phase', onPhase);
    return () => {
      socket.off('quest:draft:phase', onPhase);
    };
  }, []);

  /**
   * Ask which questions matter for this goal.
   *
   * Never throws and never blocks: intake is an improvement on the old flow, so
   * a failure here means we skip straight to generating rather than stranding
   * the user.
   */
  const loadQuestions = useCallback(
    async (goal: string, deadline?: string): Promise<IntakeQuestion[]> => {
      try {
        const { data } = await startIntake({ variables: { goal, deadline } });
        const qs = data?.startQuestIntake?.questions ?? [];
        setQuestions(qs);
        return qs;
      } catch {
        setQuestions([]);
        return [];
      }
    },
    [startIntake]
  );

  /** Generate a plan into a draft. Writes no quest. */
  const generate = useCallback(
    async (input: {
      goal: string;
      deadline?: string;
      image?: string | null;
      participants?: { user: string; role: string }[];
      questType?: string;
      cadence?: string;
      answers?: BriefAnswers;
    }) => {
      setGenerating(true);
      setWarning(null);
      setStreamedPhases([]);
      try {
        const { data } = await startDraft({
          variables: {
            goal: input.goal,
            deadline: input.deadline,
            image: input.image,
            participants: input.participants,
            questType: input.questType,
            cadence: input.cadence,
            brief: input.answers,
          },
        });
        const res = data?.startQuestDraft;
        if (res?.success && res.draft) {
          setDraft(res.draft);
          setWarning(res.draft.plan?.warning ?? null);
        }
        return res;
      } finally {
        setGenerating(false);
      }
    },
    [startDraft]
  );

  /**
   * Apply an edit.
   *
   * The server returns the whole plan back rather than a patch — a plan is small
   * and reconciling a patch against optimistic local state is where off-by-one
   * reorder bugs live.
   */
  const applyEdit = useCallback(
    async (edit: DraftEdit) => {
      if (!draft) return null;
      const { data } = await editDraft({ variables: { draftId: draft.id, edit } });
      const res = data?.editQuestDraft;
      if (res?.success && res.draft) setDraft(res.draft);
      return res;
    },
    [draft, editDraft]
  );

  /**
   * Change the plan by saying what's wrong with it.
   *
   * On failure the plan is untouched server-side, so there's nothing to roll
   * back here — a half-applied refinement is worse than one that didn't happen.
   */
  const refine = useCallback(
    async (instruction: string) => {
      if (!draft) return null;
      setRefining(true);
      try {
        const { data } = await refineDraft({
          variables: { draftId: draft.id, instruction },
        });
        const res = data?.refineQuestDraft;
        if (res?.success && res.draft) {
          setDraft(res.draft);
          setChanges(res.changes ?? []);
          setWarning(res.draft.plan?.warning ?? null);
        }
        return res;
      } finally {
        setRefining(false);
      }
    },
    [draft, refineDraft]
  );

  /** Put the plan back the way it was before the last refinement. */
  const undo = useCallback(async () => {
    if (!draft) return null;
    const { data } = await undoDraft({ variables: { draftId: draft.id } });
    const res = data?.undoQuestDraft;
    if (res?.success && res.draft) {
      setDraft(res.draft);
      setChanges([]);
    }
    return res;
  }, [draft, undoDraft]);

  /** Dismiss the diff strip without touching the plan. */
  const clearChanges = useCallback(() => setChanges([]), []);

  /** Make it real. Idempotent server-side, so a double-tap is harmless. */
  const commit = useCallback(async () => {
    if (!draft) return null;
    setCommitting(true);
    try {
      const { data } = await commitDraft({ variables: { draftId: draft.id } });
      return data?.commitQuestDraft;
    } finally {
      setCommitting(false);
    }
  }, [draft, commitDraft]);

  /** Throw the plan away locally. The server's TTL sweeps the record. */
  const discard = useCallback(() => {
    setDraft(null);
    setWarning(null);
  }, []);

  return {
    draft,
    plan: draft?.plan ?? null,
    questions,
    generating,
    committing,
    refining,
    warning,
    changes,
    streamedPhases,
    loadQuestions,
    generate,
    applyEdit,
    refine,
    undo,
    clearChanges,
    commit,
    discard,
  };
}
