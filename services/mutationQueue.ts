import { ApolloClient, DocumentNode } from '@apollo/client';
import { getDb } from './db';
import { markTaskComplete, markScheduleTaskComplete, markNotificationRead, markAllNotificationsRead } from './syncService';
import {
  COMPLETE_TASK,
  COMPLETE_MINI_GOAL,
  SEND_MESSAGE,
  UPDATE_SHARD,
  ADD_TASK,
  UPDATE_TASK,
  DELETE_TASK,
  MARK_MESSAGES_READ,
  MARK_NOTIFICATION_READ,
  MARK_ALL_NOTIFICATIONS_READ,
  COMPLETE_SIDE_QUEST,
  COMPLETE_HABIT_CYCLE,
} from '~/Graphql/Mutations';

const MAX_RETRIES = 3;

const MUTATION_MAP: Record<string, DocumentNode> = {
  COMPLETE_TASK,
  COMPLETE_MINI_GOAL,
  SEND_MESSAGE,
  UPDATE_SHARD,
  ADD_TASK,
  UPDATE_TASK,
  DELETE_TASK,
  MARK_MESSAGES_READ,
  MARK_NOTIFICATION_READ,
  MARK_ALL_NOTIFICATIONS_READ,
  COMPLETE_SIDE_QUEST,
  COMPLETE_HABIT_CYCLE,
};

interface QueueRow {
  id: string;
  mutation_name: string;
  variables: string;
  created_at: number;
  status: 'pending' | 'processing' | 'failed';
  retry_count: number;
  last_error: string | null;
}

function uuid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function enqueue(mutationName: string, variables: object) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO mutation_queue (id, mutation_name, variables, created_at, status, retry_count)
     VALUES (?, ?, ?, ?, 'pending', 0)`,
    [uuid(), mutationName, JSON.stringify(variables), Date.now()]
  );
}

export async function drain(client: ApolloClient<any>) {
  const db = await getDb();

  // Items left in 'processing' from a previous crash — reset them so they retry
  await db.runAsync(
    `UPDATE mutation_queue SET status = 'pending' WHERE status = 'processing'`
  );

  const rows = await db.getAllAsync<QueueRow>(
    `SELECT * FROM mutation_queue WHERE status = 'pending' ORDER BY created_at ASC`
  );

  for (const row of rows) {
    const mutation = MUTATION_MAP[row.mutation_name];
    if (!mutation) {
      await db.runAsync(
        `UPDATE mutation_queue SET status = 'failed', last_error = ? WHERE id = ?`,
        [`Unknown mutation: ${row.mutation_name}`, row.id]
      );
      continue;
    }

    await db.runAsync(
      `UPDATE mutation_queue SET status = 'processing' WHERE id = ?`,
      [row.id]
    );

    try {
      const variables = JSON.parse(row.variables);
      await client.mutate({ mutation, variables });
      await db.runAsync('DELETE FROM mutation_queue WHERE id = ?', [row.id]);
    } catch (err: any) {
      const retries = row.retry_count + 1;
      if (retries >= MAX_RETRIES) {
        await db.runAsync(
          `UPDATE mutation_queue SET status = 'failed', retry_count = ?, last_error = ? WHERE id = ?`,
          [retries, err.message ?? 'Unknown error', row.id]
        );
      } else {
        await db.runAsync(
          `UPDATE mutation_queue SET status = 'pending', retry_count = ?, last_error = ? WHERE id = ?`,
          [retries, err.message ?? 'Unknown error', row.id]
        );
      }
    }
  }
}

export async function getPendingCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM mutation_queue WHERE status = 'pending'`
  );
  return row?.count ?? 0;
}

export async function getFailedCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM mutation_queue WHERE status = 'failed'`
  );
  return row?.count ?? 0;
}

export async function clearFailed() {
  const db = await getDb();
  await db.runAsync(`DELETE FROM mutation_queue WHERE status = 'failed'`);
}

// Apply the optimistic local state change that mirrors what the server would do.
// Called immediately when the user acts offline so the UI updates without waiting.
export async function applyOptimistic(mutationName: string, variables: Record<string, any>) {
  switch (mutationName) {
    case 'COMPLETE_TASK':
      await markTaskComplete(variables.miniGoalId, variables.taskIndex);
      // If this task also appears in the schedule view, mark it there too
      await markScheduleTaskComplete(`${variables.miniGoalId}-${variables.taskIndex}`);
      break;
    case 'MARK_NOTIFICATION_READ':
      await markNotificationRead(variables.notificationId);
      break;
    case 'MARK_ALL_NOTIFICATIONS_READ':
      // userId is not part of the mutation variables — caller must pass it
      if (variables._userId) await markAllNotificationsRead(variables._userId);
      break;
    default:
      break;
  }
}
