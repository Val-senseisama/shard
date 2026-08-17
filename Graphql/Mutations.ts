import { gql } from '@apollo/client';

// Auth mutations
export const REGISTER = gql`
  mutation Register($input: SignupInput!) {
    signup(input: $input) {
      success
      message
      user {
        id
        email
        username
        profilePic
        role
        authProvider
      }
    }
  }
`;

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      success
      message
      accessToken
      refreshToken
      user {
        id
        email
        username
        role
        emailVerified
      }
    }
  }
`;

export const GOOGLE_SIGN_IN = gql`
  mutation GoogleSignIn($idToken: String!, $referralCode: String, $timezone: String) {
    googleSignIn(idToken: $idToken, referralCode: $referralCode, timezone: $timezone) {
      success
      message
      accessToken
      refreshToken
      user {
        id
        email
        username
        profilePic
        role
        emailVerified
        isNewUser
        authProvider
      }
    }
  }
`;

/**
 * Fired on every app foreground. Refreshes presence and pushes the device's
 * IANA timezone up — the server's quiet hours, streak day boundaries and
 * local-hour reminder scheduling all read that stored zone.
 */
export const SYNC_SESSION = gql`
  mutation SyncSession($timezone: String) {
    syncSession(timezone: $timezone) {
      success
    }
  }
`;

// User preferences
export const UPDATE_PROFILE_PICTURE = gql`
  mutation UpdateProfilePicture($cloudinaryUrl: String!) {
    updateProfilePicture(cloudinaryUrl: $cloudinaryUrl) {
      success
      message
      profilePic
    }
  }
`;

export const UPDATE_PREFERENCES = gql`
  mutation UpdatePreferences($input: PreferencesInput!) {
    updatePreferences(input: $input) {
      success
      message
    }
  }
`;

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      success
      message
      user {
        id
        username
        bio
        profilePic
        birthdate
        timezone
      }
    }
  }
`;

// Task management
export const DELETE_TASK = gql`
  mutation DeleteTask($miniGoalId: ID!, $taskTitle: String!) {
    deleteTask(miniGoalId: $miniGoalId, taskTitle: $taskTitle) {
      success
      message
    }
  }
`;

export const RESTORE_TASK = gql`
  mutation RestoreTask($miniGoalId: ID!, $taskTitle: String!) {
    restoreTask(miniGoalId: $miniGoalId, taskTitle: $taskTitle) {
      success
      message
    }
  }
`;

export const COMPLETE_TASK = gql`
  mutation CompleteTask($shardId: ID!, $miniGoalId: ID!, $taskIndex: Int!) {
    completeTask(shardId: $shardId, miniGoalId: $miniGoalId, taskIndex: $taskIndex) {
      success
      message
      xpEarned
      xpResult {
        newXP
        newLevel
        leveledUp
      }
    }
  }
`;

export const UNCOMPLETE_TASK = gql`
  mutation UncompleteTask($shardId: ID!, $miniGoalId: ID!, $taskIndex: Int!) {
    uncompleteTask(shardId: $shardId, miniGoalId: $miniGoalId, taskIndex: $taskIndex) {
      success
      message
      xpEarned
      xpResult {
        newXP
        newLevel
        leveledUp
      }
    }
  }
`;

export const COMPLETE_MINI_GOAL = gql`
  mutation CompleteMiniGoal($miniGoalId: ID!) {
    completeMiniGoal(miniGoalId: $miniGoalId) {
      success
      message
      xpEarned
      xpResult {
        newXP
        newLevel
        leveledUp
      }
      shardProgress
    }
  }
`;

export const COMPLETE_HABIT_CYCLE = gql`
  mutation CompleteHabitCycle($shardId: ID!) {
    completeHabitCycle(shardId: $shardId) {
      success
      message
      xpEarned
      newStreak
    }
  }
`;

export const TRIGGER_COACH_NUDGE = gql`
  mutation TriggerCoachNudge($shardId: ID!) {
    triggerCoachNudge(shardId: $shardId) {
      success
      message
      nudge
    }
  }
`;

// Notification mutations
export const UPDATE_NOTIFICATION_PREFERENCES = gql`
  mutation UpdateNotificationPreferences($input: NotificationPreferencesInput!) {
    updateNotificationPreferences(input: $input) {
      success
      message
      preferences {
        friendRequests
        messages
        shardInvites
        shardUpdates
        questDeadlines
        achievements
        quietHoursEnabled
        quietHoursStart
        quietHoursEnd
        pushEnabled
        emailEnabled
      }
    }
  }
`;

export const CHANGE_PASSWORD = gql`
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(currentPassword: $currentPassword, newPassword: $newPassword) {
      success
      message
    }
  }
`;

export const DELETE_SHARD = gql`
  mutation DeleteShard($id: ID!) {
    deleteShard(id: $id) {
      success
      message
    }
  }
`;

export const REMOVE_SHARD_PARTICIPANT = gql`
  mutation RemoveShardParticipant($shardId: ID!, $userId: ID!) {
    removeShardParticipant(shardId: $shardId, userId: $userId) {
      success
      message
    }
  }
`;

export const ASSIGN_MINI_GOAL = gql`
  mutation AssignMiniGoal($miniGoalId: ID!, $userId: ID!, $taskIndex: Int) {
    assignMiniGoal(miniGoalId: $miniGoalId, userId: $userId, taskIndex: $taskIndex) {
      success
      message
    }
  }
`;


// Friendship mutations
export const SEND_FRIEND_REQUEST = gql`
  mutation SendFriendRequest($friendId: ID!) {
    sendFriendRequest(friendId: $friendId) {
      success
      message
    }
  }
`;

export const UNFRIEND = gql`
  mutation Unfriend($friendId: ID!) {
    unfriend(friendId: $friendId) {
      success
      message
    }
  }
`;

export const CREATE_OR_GET_DIRECT_CHAT = gql`
  mutation CreateOrGetDirectChat($friendId: ID!) {
    createOrGetDirectChat(friendId: $friendId) {
      success
      message
      chatId
    }
  }
`;

export const ACCEPT_FRIEND_REQUEST = gql`
  mutation AcceptFriendRequest($friendId: ID!) {
    acceptFriendRequest(friendId: $friendId) {
      success
      message
    }
  }
`;

export const REJECT_FRIEND_REQUEST = gql`
  mutation RejectFriendRequest($friendId: ID!) {
    rejectFriendRequest(friendId: $friendId) {
      success
      message
    }
  }
`;

export const CANCEL_FRIEND_REQUEST = gql`
  mutation CancelFriendRequest($friendId: ID!) {
    cancelFriendRequest(friendId: $friendId) {
      success
      message
    }
  }
`;

export const BLOCK_USER = gql`
  mutation BlockUser($userId: ID!) {
    blockUser(userId: $userId) {
      success
      message
    }
  }
`;

// Shard mutations
export const CREATE_SHARD = gql`
  mutation CreateShard(
    $goal: String!
    $deadline: String
    $image: String
    $participants: [ParticipantInput!]
    $isPrivate: Boolean
    $isAnonymous: Boolean
    $questType: String
    $cadence: String
  ) {
    createShard(
      goal: $goal
      deadline: $deadline
      image: $image
      participants: $participants
      isPrivate: $isPrivate
      isAnonymous: $isAnonymous
      questType: $questType
      cadence: $cadence
    ) {
      success
      message
      needsUpgrade
      aiCallsRemaining
      shard {
        id
        title
        description
        image
        status
        progress {
          completion
          xpEarned
          level
        }
        miniGoals {
          id
          title
          taskCount
          dueDate
        }
      }
    }
  }
`;

export const CREATE_SHARD_MANUAL = gql`
  mutation CreateShardManual($input: CreateShardInput!) {
    createShardManual(input: $input) {
      success
      message
      shard {
        id
        title
        description
        image
        status
        progress {
          completion
          xpEarned
          level
        }
        miniGoals {
          id
          title
          taskCount
          dueDate
        }
      }
    }
  }
`;

export const UPDATE_SHARD = gql`
  mutation UpdateShard($id: ID!, $input: UpdateShardInput!) {
    updateShard(id: $id, input: $input) {
      success
      message
      shard {
        id
        title
        description
        image
        status
        isPrivate
        isAnonymous
        version
        progress {
          completion
          xpEarned
          level
        }
      }
    }
  }
`;

export const GENERATE_WEEKLY_TASKS = gql`
  mutation GenerateWeeklyTasks($miniGoalId: ID!, $weekNumber: Int, $action: String) {
    generateWeeklyTasks(miniGoalId: $miniGoalId, weekNumber: $weekNumber, action: $action) {
      success
      message
      tasks {
        title
        dueDate
      }
    }
  }
`;

export const SCHEDULE_TASKS = gql`
  mutation ScheduleTasks($shardId: ID!) {
    scheduleTasks(shardId: $shardId) {
      success
      message
      tasks {
        title
        dueDate
      }
    }
  }
`;

export const CREATE_SHARD_CHAT = gql`
  mutation CreateOrGetShardChat($shardId: ID!) {
    createOrGetShardChat(shardId: $shardId) {
      success
      message
      chatId
    }
  }
`;

// Chat mutations
export const SEND_MESSAGE = gql`
  mutation SendMessage($chatId: ID!, $content: String!, $type: String, $replyTo: ID, $attachments: [AttachmentInput!]) {
    sendMessage(chatId: $chatId, content: $content, type: $type, replyTo: $replyTo, attachments: $attachments) {
      success
      message
      messageData {
        id
        content
        type
        sender {
          id
          username
          profilePic
        }
        createdAt
      }
    }
  }
`;

export const CREATE_POLL = gql`
  mutation CreatePoll($chatId: ID!, $question: String!, $options: [String!]!) {
    createPoll(chatId: $chatId, question: $question, options: $options) {
      success
      message
      messageData {
        id
        content
        type
        poll {
          question
          options {
            text
            votes {
              id
            }
          }
        }
        sender {
          id
          username
        }
        createdAt
      }
    }
  }
`;

export const VOTE_POLL = gql`
  mutation VotePoll($messageId: ID!, $optionIndex: Int!) {
    votePoll(messageId: $messageId, optionIndex: $optionIndex) {
      success
      message
    }
  }
`;

export const ASSIGN_TASK_FROM_CHAT = gql`
  mutation AssignTaskFromChat($chatId: ID!, $taskId: ID, $assigneeId: ID!) {
    assignTaskFromChat(chatId: $chatId, taskId: $taskId, assigneeId: $assigneeId) {
      success
      message
      messageData {
        id
        type
        minitaskRef {
          taskId
          assignedTo {
            id
            username
          }
        }
      }
    }
  }
`;

export const SUMMON_SUMMARY = gql`
  mutation SummonSummary($chatId: ID!) {
    summonSummary(chatId: $chatId) {
      success
      message
      messageData {
        id
        content
        type
        createdAt
      }
    }
  }
`;

export const MARK_MESSAGES_READ = gql`
  mutation MarkMessagesRead($chatId: ID!, $messageIds: [ID!]!) {
    markMessagesRead(chatId: $chatId, messageIds: $messageIds) {
      success
      message
    }
  }
`;

export const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($notificationId: ID!) {
    markNotificationRead(notificationId: $notificationId) {
      success
      message
    }
  }
`;

export const MARK_ALL_NOTIFICATIONS_READ = gql`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead {
      success
      message
    }
  }
`;

// Side Quest mutations
export const GENERATE_SIDE_QUEST = gql`
  mutation GenerateSideQuest($category: String) {
    generateSideQuest(category: $category) {
      success
      message
      needsToComplete
      activeShardsCount
      sideQuest {
        id
        title
        description
        difficulty
        xpReward
        category
        createdAt
      }
      existingSideQuest {
        id
        title
      }
    }
  }
`;

export const COMPLETE_SIDE_QUEST = gql`
  mutation CompleteSideQuest($sideQuestId: ID!) {
    completeSideQuest(sideQuestId: $sideQuestId) {
      success
      message
      xpEarned
      xpResult {
        newXP
        newLevel
        leveledUp
      }
    }
  }
`;

export const UPDATE_MINI_GOAL = gql`
  mutation UpdateMiniGoal($miniGoalId: ID!, $input: UpdateMiniGoalInput!) {
    updateMiniGoal(miniGoalId: $miniGoalId, input: $input) {
      success
      message
    }
  }
`;

export const DELETE_MINI_GOAL = gql`
  mutation DeleteMiniGoal($miniGoalId: ID!) {
    deleteMiniGoal(miniGoalId: $miniGoalId) {
      success
      message
    }
  }
`;

export const ADD_SHARD_PARTICIPANT = gql`
  mutation AddShardParticipant($shardId: ID!, $userId: ID!, $role: String!) {
    addShardParticipant(shardId: $shardId, userId: $userId, role: $role) {
      success
      message
    }
  }
`;

export const CREATE_CHALLENGE = gql`
  mutation CreateChallenge($input: CreateChallengeInput!) {
    createChallenge(input: $input) {
      success
      message
      challenge {
        id
        title
        type
        targetDate
        xpReward
      }
    }
  }
`;

export const COMPLETE_CHALLENGE = gql`
  mutation CompleteChallenge($challengeId: ID!) {
    completeChallenge(challengeId: $challengeId) {
      success
      message
      xpEarned
      xpResult {
        newXP
        newLevel
        leveledUp
      }
    }
  }
`;

export const ADD_MINI_GOAL = gql`
  mutation AddMiniGoal($shardId: ID!, $input: AddMiniGoalInput!) {
    addMiniGoal(shardId: $shardId, input: $input) {
      success
      message
      miniGoal {
        id
        title
        description
        dueDate
        tasks {
          title
          dueDate
          completed
          assignedTo
        }
      }
    }
  }
`;

export const ADD_TASK = gql`
  mutation AddTask($miniGoalId: ID!, $title: String!, $dueDate: String) {
    addTask(miniGoalId: $miniGoalId, title: $title, dueDate: $dueDate) {
      success
      message
    }
  }
`;

export const UPDATE_TASK = gql`
  mutation UpdateTask($miniGoalId: ID!, $taskIndex: Int!, $title: String!, $dueDate: String) {
    updateTask(miniGoalId: $miniGoalId, taskIndex: $taskIndex, title: $title, dueDate: $dueDate) {
      success
      message
    }
  }
`;

export const REGENERATE_SHARD = gql`
  mutation RegenerateShard($shardId: ID!) {
    regenerateShard(shardId: $shardId) {
      success
      message
      warning
      needsUpgrade
      aiCallsRemaining
      miniGoals {
        id
        title
        taskCount
        dueDate
      }
    }
  }
`;

export const CLEAR_PENDING_ACHIEVEMENTS = gql`
  mutation ClearPendingAchievements {
    clearPendingAchievements {
      success
      message
    }
  }
`;

export const ADD_REACTION = gql`
  mutation AddReaction($messageId: ID!, $emoji: String!) {
    addReaction(messageId: $messageId, emoji: $emoji) {
      success
      message
    }
  }
`;

export const REMOVE_REACTION = gql`
  mutation RemoveReaction($messageId: ID!, $emoji: String!) {
    removeReaction(messageId: $messageId, emoji: $emoji) {
      success
      message
    }
  }
`;

export const EDIT_MESSAGE = gql`
  mutation EditMessage($messageId: ID!, $content: String!) {
    editMessage(messageId: $messageId, content: $content) {
      success
      message
    }
  }
`;

export const DELETE_MESSAGE = gql`
  mutation DeleteMessage($messageId: ID!) {
    deleteMessage(messageId: $messageId) {
      success
      message
    }
  }
`;

// ─── Team mutations ───────────────────────────────────────────────────

export const CREATE_TEAM = gql`
  mutation CreateTeam($name: String!, $memberIds: [ID!]!) {
    createTeam(name: $name, memberIds: $memberIds) {
      success
      message
      team {
        id
        name
        memberCount
        chatId
        createdAt
        owner {
          id
          username
          profilePic
        }
        members {
          id
          username
          profilePic
        }
      }
    }
  }
`;

export const UPDATE_TEAM = gql`
  mutation UpdateTeam($teamId: ID!, $name: String, $addMemberIds: [ID!], $removeMemberIds: [ID!]) {
    updateTeam(teamId: $teamId, name: $name, addMemberIds: $addMemberIds, removeMemberIds: $removeMemberIds) {
      success
      message
      team {
        id
        name
        memberCount
        chatId
        owner {
          id
          username
          profilePic
        }
        members {
          id
          username
          profilePic
        }
      }
    }
  }
`;

export const DELETE_TEAM = gql`
  mutation DeleteTeam($teamId: ID!) {
    deleteTeam(teamId: $teamId) {
      success
      message
    }
  }
`;

export const LEAVE_TEAM = gql`
  mutation LeaveTeam($teamId: ID!) {
    leaveTeam(teamId: $teamId) {
      success
      message
    }
  }
`;

/**
 * Finish a quest and collect its rewards. Completion used to be a bare
 * `updateShard(status: 'completed')`, which paid nothing.
 */
export const COMPLETE_SHARD = gql`
  mutation CompleteShard($shardId: ID!) {
    completeShard(shardId: $shardId) {
      success
      message
      xpEarned
      completion
      onTime
      shareId
      isFirstCompletion
      alreadyComplete
      xpResult {
        newXP
        newLevel
        leveledUp
      }
    }
  }
`;

/** Restore a streak broken within the repair window. */
export const REPAIR_STREAK = gql`
  mutation RepairStreak {
    repairStreak {
      success
      message
      restored
    }
  }
`;

/** Resolve an overdue task: action is "reschedule" or "drop". */
export const RESOLVE_OVERDUE_TASK = gql`
  mutation ResolveOverdueTask(
    $miniGoalId: ID!
    $taskIndex: Int!
    $action: String!
    $newDueDate: String
  ) {
    resolveOverdueTask(
      miniGoalId: $miniGoalId
      taskIndex: $taskIndex
      action: $action
      newDueDate: $newDueDate
    ) {
      success
      message
    }
  }
`;

/**
 * Move a whole mini-goal, carrying its open tasks with it.
 *
 * Distinct from `updateMiniGoal`, which writes a `dueDate` on the mini-goal and
 * moves nothing — the schedule is built from task due dates, so that alone
 * changes a label and no work. This shifts every open task by the same delta,
 * so the spacing the plan encodes survives the move.
 */
export const RESCHEDULE_MINI_GOAL = gql`
  mutation RescheduleMiniGoal($miniGoalId: ID!, $newDueDate: String!) {
    rescheduleMiniGoal(miniGoalId: $miniGoalId, newDueDate: $newDueDate) {
      success
      message
    }
  }
`;

/** Records that a completion card actually went out — measures the growth loop. */
export const RECORD_SHARE = gql`
  mutation RecordShare($shareId: ID!, $platform: String!) {
    recordShare(shareId: $shareId, platform: $platform) {
      success
      message
    }
  }
`;

// ─── Quest drafts ────────────────────────────────────────────────────
//
// A draft is a quest that isn't real yet. Nothing appears in the user's quest
// list until COMMIT_QUEST_DRAFT, which is what lets the review step actually
// edit the plan — and what stops "regenerate" abandoning a quest that still
// counts against the free-tier cap.

const DRAFT_FIELDS = `
  id
  goal
  deadline
  refinements
  refinementsRemaining
  canUndo
  plan {
    mainQuest { title description estimatedDuration xpReward }
    miniQuests {
      id
      title
      description
      estimatedDuration
      xpReward
      searchHint
      dueDate
      steps { id text estimatedDuration xpReward }
    }
    warning
  }
`;

export const START_QUEST_INTAKE = gql`
  mutation StartQuestIntake($goal: String!, $deadline: String) {
    startQuestIntake(goal: $goal, deadline: $deadline) {
      success
      message
      questions {
        slot
        prompt
        inputKind
        placeholder
        suggestions
      }
    }
  }
`;

export const START_QUEST_DRAFT = gql`
  mutation StartQuestDraft(
    $goal: String!
    $deadline: String
    $image: String
    $participants: [ParticipantInput!]
    $questType: String
    $cadence: String
    $brief: QuestBriefInput
  ) {
    startQuestDraft(
      goal: $goal
      deadline: $deadline
      image: $image
      participants: $participants
      questType: $questType
      cadence: $cadence
      brief: $brief
    ) {
      success
      message
      needsUpgrade
      isCrisis
      draft { ${DRAFT_FIELDS} }
    }
  }
`;

export const EDIT_QUEST_DRAFT = gql`
  mutation EditQuestDraft($draftId: ID!, $edit: DraftEditInput!) {
    editQuestDraft(draftId: $draftId, edit: $edit) {
      success
      message
      draft { ${DRAFT_FIELDS} }
    }
  }
`;

export const COMMIT_QUEST_DRAFT = gql`
  mutation CommitQuestDraft($draftId: ID!) {
    commitQuestDraft(draftId: $draftId) {
      success
      message
      needsUpgrade
      warning
      shard { id title }
    }
  }
`;

export const REFINE_QUEST_DRAFT = gql`
  mutation RefineQuestDraft($draftId: ID!, $instruction: String!) {
    refineQuestDraft(draftId: $draftId, instruction: $instruction) {
      success
      message
      refinementsRemaining
      changes { kind phaseId title }
      draft { ${DRAFT_FIELDS} }
    }
  }
`;

export const UNDO_QUEST_DRAFT = gql`
  mutation UndoQuestDraft($draftId: ID!) {
    undoQuestDraft(draftId: $draftId) {
      success
      message
      draft { ${DRAFT_FIELDS} }
    }
  }
`;

export const UPDATE_SHARD_BRIEF = gql`
  mutation UpdateShardBrief($shardId: ID!, $brief: QuestBriefInput!) {
    updateShardBrief(shardId: $shardId, brief: $brief) {
      success
      message
    }
  }
`;

// ─── Course import mutations ──────────────────────────────────────────────────

export const IMPORT_CURRICULUM = gql`
  mutation ImportCurriculum($input: ImportCurriculumInput!) {
    importCurriculum(input: $input) {
      success
      message
      draftId
      needsUpgrade
      notice
      curriculum {
        provider
        fidelity
        title
        author
        url
        thumbnail
        totalSeconds
        fetchedAt
        sections {
          title
          items {
            kind
            title
            durationSeconds
            url
            externalId
            optional
            synthesized
          }
        }
      }
    }
  }
`;

export const PACE_CURRICULUM = gql`
  mutation PaceCurriculum($input: PaceCurriculumInput!) {
    paceCurriculum(input: $input) {
      sessionCount
      projectedEndDate
      warning
      miniGoals {
        title
        dueDate
        taskCount
        totalSeconds
      }
    }
  }
`;

export const CREATE_SHARD_FROM_CURRICULUM = gql`
  mutation CreateShardFromCurriculum($input: CreateFromCurriculumInput!) {
    createShardFromCurriculum(input: $input) {
      success
      message
      needsUpgrade
      warning
      shard {
        id
        title
      }
    }
  }
`;

export const CATCH_UP_TO_TASK = gql`
  mutation CatchUpToTask($shardId: ID!, $miniGoalId: ID!, $taskIndex: Int!) {
    catchUpToTask(shardId: $shardId, miniGoalId: $miniGoalId, taskIndex: $taskIndex) {
      success
      message
      tasksCompleted
      xpAwarded
      batchId
    }
  }
`;

export const UNDO_CATCH_UP = gql`
  mutation UndoCatchUp($batchId: ID!) {
    undoCatchUp(batchId: $batchId) {
      success
      message
      tasksCompleted
      xpAwarded
      batchId
    }
  }
`;

export const REFLOW_SCHEDULE = gql`
  mutation ReflowSchedule($shardId: ID!, $rhythm: RhythmInput) {
    reflowSchedule(shardId: $shardId, rhythm: $rhythm) {
      success
      message
      warning
      shard {
        id
        title
      }
    }
  }
`;

