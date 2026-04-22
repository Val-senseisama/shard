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
  mutation GoogleSignIn($idToken: String!) {
    googleSignIn(idToken: $idToken) {
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
