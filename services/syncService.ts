import { getDb } from './db';

const now = () => Date.now();

// ─── Users ────────────────────────────────────────────────────────────────────

export async function saveUser(user: Record<string, any>) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO users (
      id, username, email, profile_pic, bio, auth_provider, role,
      subscription_tier, email_verified, is_active, xp, ai_credits, level,
      current_streak, longest_streak, streak_freeze_tokens, previous_streak,
      strength, intelligence, charisma, endurance, creativity,
      workload_level, max_tasks_per_day, preferred_task_duration,
      birthdate, timezone, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.id, user.username, user.email, user.profilePic ?? null, user.bio ?? null,
      user.authProvider ?? 'email', user.role ?? 'user',
      user.subscriptionTier ?? 'free',
      user.emailVerified ? 1 : 0,
      1,
      user.xp ?? 0, user.aiCredits ?? 500, user.level ?? 1,
      user.currentStreak ?? 0, user.longestStreak ?? 0,
      user.streakFreezeTokens ?? 1, user.previousStreak ?? 0,
      user.strength ?? 5, user.intelligence ?? 5, user.charisma ?? 5,
      user.endurance ?? 5, user.creativity ?? 5,
      user.preferences?.workloadLevel ?? 'medium',
      user.preferences?.maxTasksPerDay ?? 4,
      user.preferences?.preferredTaskDuration ?? 'medium',
      user.birthdate ?? null, user.timezone ?? 'UTC',
      now(),
    ]
  );

  if (user.preferences?.workingDays?.length) {
    await db.runAsync('DELETE FROM user_working_days WHERE user_id = ?', [user.id]);
    for (const day of user.preferences.workingDays) {
      await db.runAsync(
        'INSERT OR IGNORE INTO user_working_days (user_id, day) VALUES (?, ?)',
        [user.id, day]
      );
    }
  }

  if (user.achievements?.length) {
    await db.runAsync('DELETE FROM user_achievements WHERE user_id = ?', [user.id]);
    for (const ach of user.achievements) {
      await db.runAsync(
        'INSERT OR IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)',
        [user.id, ach]
      );
    }
  }

  if (user.pendingAchievements?.length) {
    await db.runAsync('DELETE FROM user_pending_achievements WHERE user_id = ?', [user.id]);
    for (const ach of user.pendingAchievements) {
      await db.runAsync(
        'INSERT OR IGNORE INTO user_pending_achievements (user_id, achievement_id) VALUES (?, ?)',
        [user.id, ach]
      );
    }
  }
}

export async function getUser(userId: string) {
  const db = await getDb();
  const user = await db.getFirstAsync<Record<string, any>>(
    'SELECT * FROM users WHERE id = ?', [userId]
  );
  if (!user) return null;

  const workingDays = await db.getAllAsync<{ day: number }>(
    'SELECT day FROM user_working_days WHERE user_id = ?', [userId]
  );
  const achievements = await db.getAllAsync<{ achievement_id: string }>(
    'SELECT achievement_id FROM user_achievements WHERE user_id = ?', [userId]
  );
  const pendingAchievements = await db.getAllAsync<{ achievement_id: string }>(
    'SELECT achievement_id FROM user_pending_achievements WHERE user_id = ?', [userId]
  );

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    profilePic: user.profile_pic,
    bio: user.bio,
    authProvider: user.auth_provider,
    role: user.role,
    subscriptionTier: user.subscription_tier,
    emailVerified: !!user.email_verified,
    xp: user.xp,
    aiCredits: user.ai_credits,
    level: user.level,
    currentStreak: user.current_streak,
    longestStreak: user.longest_streak,
    streakFreezeTokens: user.streak_freeze_tokens,
    strength: user.strength,
    intelligence: user.intelligence,
    charisma: user.charisma,
    endurance: user.endurance,
    creativity: user.creativity,
    birthdate: user.birthdate,
    timezone: user.timezone,
    preferences: {
      workloadLevel: user.workload_level,
      maxTasksPerDay: user.max_tasks_per_day,
      preferredTaskDuration: user.preferred_task_duration,
      workingDays: workingDays.map((r) => r.day),
    },
    achievements: achievements.map((r) => r.achievement_id),
    pendingAchievements: pendingAchievements.map((r) => r.achievement_id),
  };
}

// ─── Shards (list view from MY_SHARDS) ───────────────────────────────────────

export async function saveShards(shards: Record<string, any>[]) {
  const db = await getDb();
  for (const s of shards) {
    await db.runAsync(
      `INSERT OR REPLACE INTO shards (
        id, title, image, description, owner_id,
        status, quest_type,
        progress_completion, progress_xp_earned, progress_level,
        synced_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        s.id, s.title, s.image ?? null, s.description ?? null,
        s.owner?.id ?? s.owner_id ?? '',
        s.status ?? 'active', s.questType ?? 'standard',
        s.progress?.completion ?? 0,
        s.progress?.xpEarned ?? 0,
        s.progress?.level ?? 1,
        now(),
        s.updatedAt ?? s.updated_at ?? now(),
      ]
    );
  }
}

export async function getShards(): Promise<Record<string, any>[]> {
  const db = await getDb();
  // Sort by updated_at if available, otherwise synced_at
  const rows = await db.getAllAsync<Record<string, any>>(
    'SELECT * FROM shards ORDER BY COALESCE(updated_at, synced_at) DESC'
  );
  return rows.map(shardRowToGql);
}

// ─── Shard detail (GET_SHARD — includes participants, minigoals, tasks) ───────

export async function saveShardDetail(shard: Record<string, any>) {
  const db = await getDb();
  const ts = now();

  await db.withTransactionAsync(async () => {
  await db.runAsync(
    `INSERT OR REPLACE INTO shards (
      id, title, image, description,
      owner_id, owner_username, owner_profile_pic,
      chat_id, status, quest_type, cadence, habit_streak,
      is_private, is_anonymous, version,
      progress_completion, progress_xp_earned, progress_level,
      timeline_start, timeline_end,
      participants_count, synced_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      shard.id, shard.title, shard.image ?? null, shard.description ?? null,
      shard.owner?.id ?? '', shard.owner?.username ?? null, shard.owner?.profilePic ?? null,
      shard.chatId ?? null,
      shard.status ?? 'active', shard.questType ?? 'standard',
      shard.cadence ?? null, shard.habitStreak ?? 0,
      shard.isPrivate ? 1 : 0, shard.isAnonymous ? 1 : 0,
      shard.version ?? 1,
      shard.progress?.completion ?? 0,
      shard.progress?.xpEarned ?? 0,
      shard.progress?.level ?? 1,
      shard.timeline?.startDate ?? null,
      shard.timeline?.endDate ?? null,
      shard.participantsCount ?? 0,
      ts,
      shard.updatedAt ?? shard.updated_at ?? ts,
    ]
  );

  // Participants
  await db.runAsync('DELETE FROM shard_participants WHERE shard_id = ?', [shard.id]);
  for (const p of shard.participants ?? []) {
    await db.runAsync(
      `INSERT INTO shard_participants (shard_id, user_id, username, profile_pic, role)
       VALUES (?, ?, ?, ?, ?)`,
      [shard.id, p.user, p.username ?? null, p.profilePic ?? null, p.role]
    );
  }

  // Rewards
  await db.runAsync('DELETE FROM shard_rewards WHERE shard_id = ?', [shard.id]);
  for (const r of shard.rewards ?? []) {
    await db.runAsync(
      'INSERT INTO shard_rewards (shard_id, type, value) VALUES (?, ?, ?)',
      [shard.id, r.type, String(r.value)]
    );
  }

  // Mini-goals and their tasks
  for (const mg of shard.minigoals ?? []) {
    await db.runAsync(
      `INSERT OR REPLACE INTO mini_goals (
        id, shard_id, title, description, due_date,
        progress, completed, version, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        mg.id, shard.id, mg.title, mg.description ?? null, mg.dueDate ?? null,
        mg.progress ?? 0, mg.completed ? 1 : 0,
        mg.version ?? 1, ts,
      ]
    );

    // Delete stale tasks for this mini_goal before re-inserting
    await db.runAsync(
      'DELETE FROM tasks WHERE mini_goal_id = ?', [mg.id]
    );

    for (let i = 0; i < (mg.tasks ?? []).length; i++) {
      const task = mg.tasks[i];
      await db.runAsync(
        `INSERT INTO tasks (
          mini_goal_id, task_index, shard_id, title, due_date, completed,
          xp_reward, deleted, rescheduled, assigned_to, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mg.id, i, shard.id,
          task.title, task.dueDate ?? null, task.completed ? 1 : 0,
          task.xpReward ?? 20, task.deleted ? 1 : 0,
          task.rescheduled ? 1 : 0, task.assignedTo ?? null,
          ts,
        ]
      );
    }
  }
  }); // end withTransactionAsync
}

export async function getShardDetail(shardId: string): Promise<Record<string, any> | null> {
  const db = await getDb();
  const shard = await db.getFirstAsync<Record<string, any>>(
    'SELECT * FROM shards WHERE id = ?', [shardId]
  );
  if (!shard) return null;

  const participants = await db.getAllAsync<Record<string, any>>(
    'SELECT * FROM shard_participants WHERE shard_id = ?', [shardId]
  );
  const rewards = await db.getAllAsync<Record<string, any>>(
    'SELECT type, value FROM shard_rewards WHERE shard_id = ?', [shardId]
  );
  const miniGoals = await db.getAllAsync<Record<string, any>>(
    'SELECT * FROM mini_goals WHERE shard_id = ? ORDER BY rowid', [shardId]
  );

  const minigoals = await Promise.all(
    miniGoals.map(async (mg) => {
      const tasks = await db.getAllAsync<Record<string, any>>(
        'SELECT * FROM tasks WHERE mini_goal_id = ? AND deleted = 0 ORDER BY task_index',
        [mg.id]
      );
      return {
        id: mg.id,
        title: mg.title,
        description: mg.description,
        dueDate: mg.due_date,
        progress: mg.progress,
        completed: !!mg.completed,
        version: mg.version,
        tasks: tasks.map((t) => ({
          title: t.title,
          dueDate: t.due_date,
          completed: !!t.completed,
          assignedTo: t.assigned_to,
          xpReward: t.xp_reward,
        })),
      };
    })
  );

  return {
    ...shardRowToGql(shard),
    chatId: shard.chat_id,
    isPrivate: !!shard.is_private,
    isAnonymous: !!shard.is_anonymous,
    version: shard.version,
    questType: shard.quest_type,
    cadence: shard.cadence,
    habitStreak: shard.habit_streak,
    timeline: { startDate: shard.timeline_start, endDate: shard.timeline_end },
    owner: {
      id: shard.owner_id,
      username: shard.owner_username,
      profilePic: shard.owner_profile_pic,
    },
    participants: participants.map((p) => ({
      user: p.user_id,
      username: p.username,
      profilePic: p.profile_pic,
      role: p.role,
    })),
    participantsCount: shard.participants_count,
    rewards: rewards.map((r) => ({ type: r.type, value: r.value })),
    minigoals,
  };
}

// ─── Schedule (GET_MY_SCHEDULE) ───────────────────────────────────────────────

export async function saveSchedule(tasks: Record<string, any>[]) {
  const db = await getDb();
  const ts = now();
  for (const task of tasks) {
    await db.runAsync(
      `INSERT OR REPLACE INTO schedule_tasks (
        id, shard_id, mini_goal_id, shard_title, mini_goal_title,
        title, due_date, completed, xp_reward, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id, task.shardId, task.miniGoalId,
        task.shardTitle ?? null, task.miniGoalTitle ?? null,
        task.title, task.dueDate ?? null, task.completed ? 1 : 0,
        task.xpReward ?? 20, ts,
      ]
    );
  }
}

export async function getSchedule(): Promise<{
  tasks: Record<string, any>[];
  todaysTasks: Record<string, any>[];
  tasksByDate: Record<string, Record<string, any>[]>;
}> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, any>>(
    'SELECT * FROM schedule_tasks ORDER BY due_date ASC'
  );

  const todayKey = toDateKey(new Date());
  const tasks = rows.map(scheduleRowToGql);
  const todaysTasks = tasks.filter((t) => t.dueDate?.startsWith(todayKey));
  const tasksByDate: Record<string, Record<string, any>[]> = {};
  for (const t of tasks) {
    const key = t.dueDate?.slice(0, 10) ?? 'undated';
    if (!tasksByDate[key]) tasksByDate[key] = [];
    tasksByDate[key].push(t);
  }

  return { tasks, todaysTasks, tasksByDate };
}

export async function markScheduleTaskComplete(taskId: string) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE schedule_tasks SET completed = 1 WHERE id = ?', [taskId]
  );
}

export async function markTaskComplete(miniGoalId: string, taskIndex: number) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE tasks SET completed = 1 WHERE mini_goal_id = ? AND task_index = ?',
    [miniGoalId, taskIndex]
  );
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function saveChat(chat: Record<string, any>) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO chats (id, type, shard_id, name, synced_at)
     VALUES (?, ?, ?, ?, ?)`,
    [chat.id, chat.type, chat.shardId ?? null, chat.name ?? null, now()]
  );
  await db.runAsync('DELETE FROM chat_participants WHERE chat_id = ?', [chat.id]);
  for (const pid of chat.participants ?? []) {
    await db.runAsync(
      'INSERT OR IGNORE INTO chat_participants (chat_id, user_id) VALUES (?, ?)',
      [chat.id, typeof pid === 'string' ? pid : pid.id]
    );
  }
}

export async function saveMessages(chatId: string, messages: Record<string, any>[]) {
  const db = await getDb();
  for (const msg of messages) {
    if (msg.deleted) continue;
    await db.runAsync(
      `INSERT OR REPLACE INTO messages (
        id, chat_id, sender_id, sender_username, sender_profile_pic,
        content, type, reply_to, edited, edited_at, deleted, created_at, pending
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        msg.id, chatId,
        msg.sender?.id ?? msg.senderId,
        msg.sender?.username ?? null,
        msg.sender?.profilePic ?? null,
        msg.content, msg.type ?? 'text',
        msg.replyTo ?? null,
        msg.edited ? 1 : 0, msg.editedAt ?? null,
        msg.deleted ? 1 : 0,
        msg.createdAt, 0,
      ]
    );

    for (const r of msg.reactions ?? []) {
      await db.runAsync(
        `INSERT OR IGNORE INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)`,
        [msg.id, r.userId, r.emoji]
      );
    }

    for (const a of msg.attachments ?? []) {
      await db.runAsync(
        `INSERT OR IGNORE INTO message_attachments (message_id, url, type, name) VALUES (?, ?, ?, ?)`,
        [msg.id, a.url, a.type, a.name ?? null]
      );
    }

    if (msg.poll) {
      for (let i = 0; i < msg.poll.options.length; i++) {
        const opt = msg.poll.options[i];
        await db.runAsync(
          `INSERT OR REPLACE INTO poll_options (message_id, option_index, text) VALUES (?, ?, ?)`,
          [msg.id, i, opt.text]
        );
        for (const vote of opt.votes ?? []) {
          await db.runAsync(
            `INSERT OR IGNORE INTO poll_votes (message_id, option_index, user_id) VALUES (?, ?, ?)`,
            [msg.id, i, typeof vote === 'string' ? vote : vote.id]
          );
        }
      }
    }
  }
}

export async function getMessages(chatId: string, limit = 50): Promise<Record<string, any>[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, any>>(
    `SELECT * FROM messages WHERE chat_id = ? AND deleted = 0
     ORDER BY created_at DESC LIMIT ?`,
    [chatId, limit]
  );

  return Promise.all(
    rows.reverse().map(async (msg) => {
      const reactions = await db.getAllAsync<Record<string, any>>(
        'SELECT user_id, emoji FROM message_reactions WHERE message_id = ?', [msg.id]
      );
      const attachments = await db.getAllAsync<Record<string, any>>(
        'SELECT url, type, name FROM message_attachments WHERE message_id = ?', [msg.id]
      );
      const pollOptions = await db.getAllAsync<Record<string, any>>(
        'SELECT option_index, text FROM poll_options WHERE message_id = ? ORDER BY option_index',
        [msg.id]
      );
      const poll = pollOptions.length
        ? {
            options: await Promise.all(
              pollOptions.map(async (opt) => {
                const votes = await db.getAllAsync<{ user_id: string }>(
                  'SELECT user_id FROM poll_votes WHERE message_id = ? AND option_index = ?',
                  [msg.id, opt.option_index]
                );
                return { text: opt.text, votes: votes.map((v) => ({ id: v.user_id })) };
              })
            ),
          }
        : null;

      return {
        id: msg.id,
        chatId: msg.chat_id,
        sender: {
          id: msg.sender_id,
          username: msg.sender_username,
          profilePic: msg.sender_profile_pic,
        },
        content: msg.content,
        type: msg.type,
        replyTo: msg.reply_to,
        edited: !!msg.edited,
        editedAt: msg.edited_at,
        createdAt: msg.created_at,
        pending: !!msg.pending,
        reactions: reactions.map((r) => ({ userId: r.user_id, emoji: r.emoji })),
        attachments: attachments.map((a) => ({ url: a.url, type: a.type, name: a.name })),
        poll,
      };
    })
  );
}

export async function savePendingMessage(msg: {
  id: string;
  chatId: string;
  senderId: string;
  senderUsername: string;
  senderProfilePic: string;
  content: string;
  type: string;
  createdAt: string;
}) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO messages (
      id, chat_id, sender_id, sender_username, sender_profile_pic,
      content, type, edited, deleted, created_at, pending
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 1)`,
    [
      msg.id, msg.chatId, msg.senderId, msg.senderUsername, msg.senderProfilePic,
      msg.content, msg.type, msg.createdAt,
    ]
  );
}

export async function confirmPendingMessage(tempId: string, realId: string) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE messages SET id = ?, pending = 0 WHERE id = ?', [realId, tempId]
  );
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function saveNotifications(notifications: Record<string, any>[]) {
  const db = await getDb();
  for (const n of notifications) {
    await db.runAsync(
      `INSERT OR REPLACE INTO notifications (
        id, user_id, shard_id, mini_goal_id, message, type, trigger_at, read, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        n.id, n.userId ?? '', n.shardId ?? null, n.miniGoalId ?? null,
        n.message, n.type ?? '', n.triggerAt ?? null,
        n.read ? 1 : 0, n.createdAt,
      ]
    );
  }
}

export async function getNotifications(userId: string): Promise<Record<string, any>[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, any>>(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
    [userId]
  );
  return rows.map((n) => ({
    id: n.id,
    shardId: n.shard_id,
    miniGoalId: n.mini_goal_id,
    message: n.message,
    type: n.type,
    triggerAt: n.trigger_at,
    read: !!n.read,
    createdAt: n.created_at,
  }));
}

export async function markNotificationRead(notificationId: string) {
  const db = await getDb();
  await db.runAsync('UPDATE notifications SET read = 1 WHERE id = ?', [notificationId]);
}

export async function markAllNotificationsRead(userId: string) {
  const db = await getDb();
  await db.runAsync('UPDATE notifications SET read = 1 WHERE user_id = ?', [userId]);
}

// ─── Friendships ──────────────────────────────────────────────────────────────

export async function saveFriends(userId: string, friends: Record<string, any>[]) {
  const db = await getDb();
  // Only replace accepted friends; don't touch pending/blocked
  await db.runAsync(
    "DELETE FROM friendships WHERE user_id = ? AND status = 'accepted'", [userId]
  );
  for (const f of friends) {
    await db.runAsync(
      `INSERT OR REPLACE INTO friendships (
        id, user_id, friend_id, friend_username, friend_profile_pic,
        status, requested_by, accepted_at
      ) VALUES (?, ?, ?, ?, ?, 'accepted', ?, ?)`,
      [
        `${userId}_${f.id}`, userId, f.id,
        f.username ?? null, f.profilePic ?? null,
        userId, new Date().toISOString(),
      ]
    );
  }
}

export async function getFriends(userId: string): Promise<Record<string, any>[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, any>>(
    "SELECT * FROM friendships WHERE user_id = ? AND status = 'accepted'", [userId]
  );
  return rows.map((f) => ({
    id: f.friend_id,
    username: f.friend_username,
    profilePic: f.friend_profile_pic,
  }));
}

// ─── Side quests ──────────────────────────────────────────────────────────────

export async function saveSideQuests(userId: string, quests: Record<string, any>[]) {
  const db = await getDb();
  for (const q of quests) {
    await db.runAsync(
      `INSERT OR REPLACE INTO side_quests (
        id, user_id, title, description, difficulty, recommended_by,
        xp_reward, category, completed, created_at, completed_at, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        q.id, userId, q.title, q.description, q.difficulty,
        q.recommendedBy ?? 'ai', q.xpReward, q.category,
        q.completed ? 1 : 0, q.createdAt ?? null, q.completedAt ?? null, now(),
      ]
    );
  }
}

export async function getSideQuests(userId: string): Promise<Record<string, any>[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, any>>(
    'SELECT * FROM side_quests WHERE user_id = ? ORDER BY created_at DESC', [userId]
  );
  return rows.map((q) => ({
    id: q.id,
    title: q.title,
    description: q.description,
    difficulty: q.difficulty,
    recommendedBy: q.recommended_by,
    xpReward: q.xp_reward,
    category: q.category,
    completed: !!q.completed,
    createdAt: q.created_at,
    completedAt: q.completed_at,
  }));
}

// ─── Streaks ──────────────────────────────────────────────────────────────────

export async function saveStreaks(userId: string, streaks: Record<string, any>[]) {
  const db = await getDb();
  for (const s of streaks) {
    await db.runAsync(
      `INSERT OR REPLACE INTO streaks (
        id, user_id, type, current_streak, longest_streak,
        last_activity_date, streak_start_date, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        s.id ?? `${userId}_${s.type}`, userId, s.type,
        s.currentStreak ?? 0, s.longestStreak ?? 0,
        s.lastActivityDate ?? null, s.streakStartDate ?? null, now(),
      ]
    );
  }
}

// ─── Challenges ───────────────────────────────────────────────────────────────

export async function saveChallenges(userId: string, challenges: Record<string, any>[]) {
  const db = await getDb();
  for (const c of challenges) {
    await db.runAsync(
      `INSERT OR REPLACE INTO challenges (
        id, user_id, type, title, description, shard_id, target_date,
        xp_reward, completed, created_at, completed_at, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        c.id, userId, c.type, c.title, c.description ?? null,
        c.shardId ?? null, c.targetDate, c.xpReward ?? 50,
        c.completed ? 1 : 0, c.createdAt ?? null, c.completedAt ?? null, now(),
      ]
    );
  }
}

export async function getChallenges(userId: string): Promise<Record<string, any>[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, any>>(
    'SELECT * FROM challenges WHERE user_id = ? ORDER BY target_date ASC', [userId]
  );
  return rows.map((c) => ({
    id: c.id,
    type: c.type,
    title: c.title,
    description: c.description,
    shardId: c.shard_id,
    targetDate: c.target_date,
    xpReward: c.xp_reward,
    completed: !!c.completed,
    createdAt: c.created_at,
    completedAt: c.completed_at,
  }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shardRowToGql(s: Record<string, any>) {
  return {
    id: s.id,
    title: s.title,
    image: s.image,
    description: s.description,
    status: s.status,
    questType: s.quest_type,
    cadence: s.cadence,
    progress: {
      completion: s.progress_completion,
      xpEarned: s.progress_xp_earned,
      level: s.progress_level,
    },
  };
}

function scheduleRowToGql(t: Record<string, any>) {
  return {
    id: t.id,
    shardId: t.shard_id,
    miniGoalId: t.mini_goal_id,
    shardTitle: t.shard_title,
    miniGoalTitle: t.mini_goal_title,
    title: t.title,
    dueDate: t.due_date,
    completed: !!t.completed,
    xpReward: t.xp_reward,
  };
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
