import { gql } from '@apollo/client';

export const CURRENT_USER = gql`
  query Query {
    currentUser {
      success
      message
      user {
        id
        username
        email
        bio
        profilePic
        role
        emailVerified
        xp
        level
        achievements
        strength
        intelligence
        charisma
        endurance
        creativity
      }
    }
  }
`;

export const CHECK_USERNAME = gql`
  query CheckUsername($username: String!) {
    checkUsername(username: $username)
  }
`;

export const GET_FRIENDS = gql`
  query GetFriends {
    getFriends {
      success
      friends {
        id
        username
        profilePic
        email
      }
    }
  }
`;


export const GET_SIGNED_UPLOAD_URL = gql`
    query GetSignedUploadUrl {
      getSignedUploadUrl {
        success
        message
        uploadUrl
        params {
          apiKey
          timestamp
          publicId
          signature
          folder
          cloudName
        }
      }
    }
  `;

export const GET_SHARD = gql`
  query GetShard($id: ID!) {
    getShard(id: $id) {
      success
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
        timeline {
          startDate
          endDate
        }
        participants {
          user
          role
        }
        participantsCount
        rewards {
          type
          value
        }
        owner {
          id
          username
        }
        minigoals {
          id
          title
          description
          progress
          completed
          tasks {
            title
            dueDate
            completed
          }
        }
      }
    }
  }
`;

export const GET_SHARD_SCHEDULE = gql`
  query GetShardSchedule($shardId: ID!) {
    getShardSchedule(shardId: $shardId) {
      success
      message
      tasksByDate
      tasks {
        id
        title
        dueDate
        completed
        xpReward
        miniGoalId
        miniGoalTitle
      }
    }
  }
`;

export const GET_MY_SCHEDULE = gql`
  query GetMySchedule {
    getMySchedule {
      success
      message
      tasksByDate
      tasks {
        id
        title
        dueDate
        completed
        xpReward
        miniGoalId
        miniGoalTitle
        shardId
        shardTitle
      }
      todaysTasks {
        id
        title
        dueDate
        completed
        xpReward
        miniGoalId
        miniGoalTitle
        shardId
        shardTitle
      }
    }
  }
`;

export const GET_NOTIFICATIONS = gql`
  query GetNotifications($limit: Int, $skip: Int, $shardId: ID) {
    getNotifications(limit: $limit, skip: $skip, shardId: $shardId) {
      success
      notifications {
        id
        message
        shardId
        miniGoalId
        read
        triggerAt
        createdAt
      }
    }
  }
`;


export const GET_UNREAD_NOTIFICATION_COUNT = gql`
  query GetUnreadNotificationCount {
    getUnreadNotificationCount {
      success
      count
    }
  }
`;

export const GET_NOTIFICATION_PREFERENCES = gql`
  query GetNotificationPreferences {
    getNotificationPreferences {
      success
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

export const GET_CHAT = gql`
  query GetChat($chatId: ID!) {
    getChat(chatId: $chatId) {
      success
      message
      chat {
        id
        type
        name
        participants {
          id
          username
          profilePic
        }
        shard {
          id
          title
        }
        createdAt
      }
    }
  }
`;

export const GET_CHAT_MESSAGES = gql`
  query GetChatMessages($chatId: ID!, $limit: Int, $skip: Int) {
    getChatMessages(chatId: $chatId, limit: $limit, skip: $skip) {
      success
      message
      messages {
        id
        content
        type
        sender {
          id
          username
          profilePic
        }
        readBy
        createdAt
      }
    }
  }
`;

export const MY_CHATS = gql`
  query MyChats {
    myChats {
      success
      chats {
        id
        type
        participants {
          id
          username
          profilePic
        }
        createdAt
        updatedAt
      }
    }
  }
`;

export const MY_SHARDS = gql`
  query MyShards {
    myShards {
      success
      shards {
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
      }
    }
  }
`;

export const GET_SHARD_ANALYTICS = gql`
  query GetShardAnalytics($shardId: ID!) {
    getShardAnalytics(shardId: $shardId) {
      success
      message
      weeklyCompletion
      dailyProgress {
        date
        tasksCompleted
        tasksTotal
      }
      totalTasks
      completedTasks
    }
  }
`;
