import { gql } from '@apollo/client';

// Auth mutations
export const REGISTER = gql`
  mutation Register($input: SignUpInput!) {
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
        authProvider
        isNewUser
      }
    }
  }
`;

// User preferences
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
      username
      bio
      profilePic
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

export const CHANGE_PASSWORD = gql`
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(currentPassword: $currentPassword, newPassword: $newPassword) {
      success
      message
    }
  }
`;


export const CREATE_SHARD = gql`
  mutation CreateShard($goal: String!, $deadline: String, $image: String, $participants: [ParticipantInput!]) {
    createShard(goal: $goal, deadline: $deadline, image: $image, participants: $participants) {
      success
      message
      needsUpgrade
      shard {
        id
        title
        description
        status
        progress {
          completion
          xpEarned
          level
        }
        aiUsed
        aiCallsRemaining
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
        status
      }
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

export const MARK_MESSAGES_READ = gql`
  mutation MarkMessagesRead($chatId: ID!, $messageIds: [ID!]!) {
    markMessagesRead(chatId: $chatId, messageIds: $messageIds) {
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

export const GENERATE_WEEKLY_TASKS = gql`
  mutation GenerateWeeklyTasks($miniGoalId: ID!, $weekNumber: Int!) {
    generateWeeklyTasks(miniGoalId: $miniGoalId, weekNumber: $weekNumber) {
      success
      message
      tasks {
        title
        dueDate
        completed
      }
      aiCallsRemaining
      needsUpgrade
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
      achievements
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
        timeline {
          startDate
          endDate
        }
        participants {
          user {
            id
            username
            profilePic
          }
          role
        }
      }
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
