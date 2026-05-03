// `import type` is erased at compile time — zero runtime cost, no native module
// loaded on module evaluation. The actual require() inside getDb() is the only
// point where the native binary is accessed, safely inside a try/catch upstream.
import type * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const SQLiteModule = require('expo-sqlite') as typeof SQLite;
  _db = await SQLiteModule.openDatabaseAsync('shard.db');
  await _db.execAsync('PRAGMA journal_mode = WAL');
  await _db.execAsync('PRAGMA foreign_keys = ON');
  await runMigrations(_db);
  return _db;
}

async function runMigrations(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current < 1) {
    await db.execAsync(SCHEMA_V1);
    await db.execAsync('PRAGMA user_version = 1');
  }
}

const SCHEMA_V1 = `
  CREATE TABLE IF NOT EXISTS users (
    id                      TEXT PRIMARY KEY,
    username                TEXT NOT NULL,
    email                   TEXT NOT NULL,
    profile_pic             TEXT,
    bio                     TEXT,
    auth_provider           TEXT NOT NULL DEFAULT 'email',
    role                    TEXT NOT NULL DEFAULT 'user',
    subscription_tier       TEXT DEFAULT 'free',
    email_verified          INTEGER NOT NULL DEFAULT 0,
    is_active               INTEGER NOT NULL DEFAULT 1,
    xp                      INTEGER DEFAULT 0,
    ai_credits              INTEGER DEFAULT 500,
    level                   INTEGER DEFAULT 1,
    current_streak          INTEGER DEFAULT 0,
    longest_streak          INTEGER DEFAULT 0,
    streak_freeze_tokens    INTEGER DEFAULT 1,
    previous_streak         INTEGER DEFAULT 0,
    strength                INTEGER DEFAULT 5,
    intelligence            INTEGER DEFAULT 5,
    charisma                INTEGER DEFAULT 5,
    endurance               INTEGER DEFAULT 5,
    creativity              INTEGER DEFAULT 5,
    workload_level          TEXT DEFAULT 'medium',
    max_tasks_per_day       INTEGER DEFAULT 4,
    preferred_task_duration TEXT DEFAULT 'medium',
    birthdate               TEXT,
    timezone                TEXT DEFAULT 'UTC',
    last_login_at           TEXT,
    last_active             TEXT,
    synced_at               INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS user_working_days (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day     INTEGER NOT NULL,
    PRIMARY KEY (user_id, day)
  );

  CREATE TABLE IF NOT EXISTS user_achievements (
    user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL,
    PRIMARY KEY (user_id, achievement_id)
  );

  CREATE TABLE IF NOT EXISTS user_pending_achievements (
    user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL,
    PRIMARY KEY (user_id, achievement_id)
  );

  CREATE TABLE IF NOT EXISTS shards (
    id                  TEXT PRIMARY KEY,
    title               TEXT NOT NULL,
    image               TEXT,
    description         TEXT,
    owner_id            TEXT NOT NULL,
    owner_username      TEXT,
    owner_profile_pic   TEXT,
    chat_id             TEXT,
    status              TEXT NOT NULL DEFAULT 'active',
    quest_type          TEXT NOT NULL DEFAULT 'standard',
    cadence             TEXT,
    habit_streak        INTEGER DEFAULT 0,
    is_private          INTEGER NOT NULL DEFAULT 0,
    is_anonymous        INTEGER NOT NULL DEFAULT 0,
    version             INTEGER DEFAULT 1,
    progress_completion REAL DEFAULT 0,
    progress_xp_earned  INTEGER DEFAULT 0,
    progress_level      INTEGER DEFAULT 1,
    timeline_start      TEXT,
    timeline_end        TEXT,
    last_activity_at    TEXT,
    participants_count  INTEGER DEFAULT 0,
    synced_at           INTEGER NOT NULL DEFAULT 0,
    created_at          TEXT,
    updated_at          TEXT
  );

  CREATE TABLE IF NOT EXISTS shard_participants (
    shard_id    TEXT NOT NULL REFERENCES shards(id) ON DELETE CASCADE,
    user_id     TEXT NOT NULL,
    username    TEXT,
    profile_pic TEXT,
    role        TEXT NOT NULL,
    PRIMARY KEY (shard_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS shard_rewards (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    shard_id TEXT NOT NULL REFERENCES shards(id) ON DELETE CASCADE,
    type     TEXT NOT NULL,
    value    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS mini_goals (
    id          TEXT PRIMARY KEY,
    shard_id    TEXT NOT NULL REFERENCES shards(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT,
    due_date    TEXT,
    progress    REAL DEFAULT 0,
    completed   INTEGER NOT NULL DEFAULT 0,
    assigned_to TEXT,
    version     INTEGER DEFAULT 1,
    synced_at   INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT,
    updated_at  TEXT
  );

  CREATE TABLE IF NOT EXISTS tasks (
    mini_goal_id    TEXT NOT NULL REFERENCES mini_goals(id) ON DELETE CASCADE,
    task_index      INTEGER NOT NULL,
    shard_id        TEXT NOT NULL,
    title           TEXT NOT NULL,
    due_date        TEXT,
    completed       INTEGER NOT NULL DEFAULT 0,
    xp_reward       INTEGER DEFAULT 20,
    deleted         INTEGER NOT NULL DEFAULT 0,
    deleted_at      TEXT,
    rescheduled     INTEGER NOT NULL DEFAULT 0,
    original_due_date TEXT,
    assigned_to     TEXT,
    synced_at       INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (mini_goal_id, task_index)
  );

  CREATE TABLE IF NOT EXISTS schedule_tasks (
    id              TEXT PRIMARY KEY,
    shard_id        TEXT NOT NULL,
    mini_goal_id    TEXT NOT NULL,
    shard_title     TEXT,
    mini_goal_title TEXT,
    title           TEXT NOT NULL,
    due_date        TEXT,
    completed       INTEGER NOT NULL DEFAULT 0,
    xp_reward       INTEGER DEFAULT 20,
    synced_at       INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS chats (
    id         TEXT PRIMARY KEY,
    type       TEXT NOT NULL,
    shard_id   TEXT,
    name       TEXT,
    synced_at  INTEGER NOT NULL DEFAULT 0,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS chat_participants (
    chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    PRIMARY KEY (chat_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id                  TEXT PRIMARY KEY,
    chat_id             TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id           TEXT NOT NULL,
    sender_username     TEXT,
    sender_profile_pic  TEXT,
    content             TEXT NOT NULL,
    type                TEXT NOT NULL DEFAULT 'text',
    reply_to            TEXT,
    edited              INTEGER NOT NULL DEFAULT 0,
    edited_at           TEXT,
    deleted             INTEGER NOT NULL DEFAULT 0,
    created_at          TEXT NOT NULL,
    pending             INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS message_reactions (
    message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL,
    emoji      TEXT NOT NULL,
    PRIMARY KEY (message_id, user_id, emoji)
  );

  CREATE TABLE IF NOT EXISTS message_attachments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    url        TEXT NOT NULL,
    type       TEXT NOT NULL,
    name       TEXT
  );

  CREATE TABLE IF NOT EXISTS poll_options (
    message_id   TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    option_index INTEGER NOT NULL,
    text         TEXT NOT NULL,
    PRIMARY KEY (message_id, option_index)
  );

  CREATE TABLE IF NOT EXISTS poll_votes (
    message_id   TEXT NOT NULL,
    option_index INTEGER NOT NULL,
    user_id      TEXT NOT NULL,
    PRIMARY KEY (message_id, option_index, user_id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    shard_id    TEXT,
    mini_goal_id TEXT,
    message     TEXT NOT NULL,
    type        TEXT DEFAULT '',
    trigger_at  TEXT,
    read        INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS friendships (
    id                  TEXT PRIMARY KEY,
    user_id             TEXT NOT NULL,
    friend_id           TEXT NOT NULL,
    friend_username     TEXT,
    friend_profile_pic  TEXT,
    status              TEXT NOT NULL DEFAULT 'pending',
    requested_by        TEXT NOT NULL,
    accepted_at         TEXT,
    created_at          TEXT
  );

  CREATE TABLE IF NOT EXISTS side_quests (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL,
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    difficulty      TEXT NOT NULL,
    recommended_by  TEXT DEFAULT 'ai',
    xp_reward       INTEGER NOT NULL,
    category        TEXT NOT NULL,
    completed       INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT,
    completed_at    TEXT,
    synced_at       INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS streaks (
    id                  TEXT PRIMARY KEY,
    user_id             TEXT NOT NULL,
    type                TEXT NOT NULL,
    current_streak      INTEGER DEFAULT 0,
    longest_streak      INTEGER DEFAULT 0,
    last_activity_date  TEXT,
    streak_start_date   TEXT,
    synced_at           INTEGER NOT NULL DEFAULT 0,
    UNIQUE(user_id, type)
  );

  CREATE TABLE IF NOT EXISTS challenges (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL,
    type         TEXT NOT NULL,
    title        TEXT NOT NULL,
    description  TEXT,
    shard_id     TEXT,
    target_date  TEXT NOT NULL,
    xp_reward    INTEGER DEFAULT 50,
    completed    INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT,
    completed_at TEXT,
    synced_at    INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS mutation_queue (
    id             TEXT PRIMARY KEY,
    mutation_name  TEXT NOT NULL,
    variables      TEXT NOT NULL,
    created_at     INTEGER NOT NULL,
    status         TEXT DEFAULT 'pending',
    retry_count    INTEGER DEFAULT 0,
    last_error     TEXT
  );

  CREATE TABLE IF NOT EXISTS error_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    task        TEXT NOT NULL,
    error       TEXT NOT NULL,
    severity    TEXT DEFAULT 'medium',
    userId      TEXT,
    metadata    TEXT,
    platform    TEXT,
    version     TEXT,
    created_at  TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_mini_goals_shard       ON mini_goals(shard_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_mini_goal        ON tasks(mini_goal_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_shard            ON tasks(shard_id);
  CREATE INDEX IF NOT EXISTS idx_schedule_tasks_due     ON schedule_tasks(due_date);
  CREATE INDEX IF NOT EXISTS idx_messages_chat          ON messages(chat_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_notifications_user     ON notifications(user_id, read);
  CREATE INDEX IF NOT EXISTS idx_friendships_user       ON friendships(user_id, status);
  CREATE INDEX IF NOT EXISTS idx_side_quests_user       ON side_quests(user_id, completed);
  CREATE INDEX IF NOT EXISTS idx_challenges_user        ON challenges(user_id, completed);
  CREATE INDEX IF NOT EXISTS idx_mutation_queue_status  ON mutation_queue(status, created_at);
`;
