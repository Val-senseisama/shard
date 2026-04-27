import { gql } from '@apollo/client';

export const GET_AI_USAGE = gql`
  query GetAIUsage {
    getAIUsage {
      success
      remaining
      limit
      canProceed
    }
  }
`;

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
        subscriptionTier
        emailVerified
        xp
        level
        achievements
        strength
        intelligence
        charisma
        endurance
        creativity
        preferences {
          workloadLevel
          workingDays
        }
        currentStreak
        longestStreak
        pendingAchievements
        birthdate
        timezone
      }
    }
  }
`;

export const CHECK_USERNAME = gql`
  query CheckUsername($username: String!) {
    checkUsername(username: $username) {
      success
      available
    }
  }
`;

export const SEARCH_USERS = gql`
  query SearchUsers($query: String!, $type: String) {
    searchUsers(query: $query, type: $type) {
      success
      users {
        id
        username
        profilePic
        mutualFriends
      }
    }
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
        isOnline
        lastActive
      }
    }
  }
`;

export const GET_PENDING_REQUESTS = gql`
  query GetPendingRequests {
    getPendingRequests {
      success
      incoming {
        id
        username
        profilePic
      }
      outgoing {
        id
        username
        profilePic
      }
    }
  }
`;

export const GET_FRIEND_SUGGESTIONS = gql`
  query GetFriendSuggestions {
    getFriendSuggestions {
      success
      suggestions {
        id
        username
        profilePic
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
        chatId
        isPrivate
        isAnonymous
        version
        questType
        cadence
        habitStreak
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
          username
          profilePic
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
          profilePic
        }
        minigoals {
          id
          title
          description
          progress
          completed
          version
          tasks {
            title
            dueDate
            completed
            assignedTo
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
  query GetChatMessages($chatId: ID!, $limit: Int, $skip: Int, $before: ID) {
    getChatMessages(chatId: $chatId, limit: $limit, skip: $skip, before: $before) {
      success
      message
      nextCursor
      hasMore
      messages {
        id
        content
        type
        mediaUrl
        deleted
        edited
        editedAt
        replyTo
        reactions {
          userId
          emoji
        }
        sender {
          id
          username
          profilePic
        }
        readBy
        createdAt
        mentions {
          id
          username
          profilePic
        }
        poll {
          question
          multipleAnswers
          options {
            text
            votes {
              id
              username
            }
          }
        }
        minitaskRef {
          taskId
          assignedTo {
            id
            username
          }
        }
        attachments {
          url
          type
          name
        }
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
        name
        participants {
          id
          username
          profilePic
        }
        unreadCount
        lastMessage {
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
        chatId
        participantsCount
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

export const GET_PRODUCTIVITY_DATA = gql`
  query GetProductivityData {
    getProductivityData {
      success
      message
      weeklyData {
        date
        tasksCompleted
        xpEarned
        shardsActive
      }
      monthlyData {
        date
        tasksCompleted
        xpEarned
        shardsActive
      }
      insights
      struggleAreas
      averageCompletionRate
    }
  }
`;

export const MY_SIDE_QUESTS = gql`
  query MySideQuests {
    mySideQuests {
      success
      sideQuests {
        id
        title
        description
        difficulty
        xpReward
        category
        createdAt
      }
    }
  }
`;

export const CAN_GENERATE_SIDE_QUEST = gql`
  query CanGenerateSideQuest {
    canGenerateSideQuest {
      success
      canGenerate
      reasons {
        tooManyShards
        hasRecentSideQuest
        activeShardsCount
      }
    }
  }
`;

export const GET_XP = gql`
  query GetXP {
    getXP {
      success
      xp
      level
      xpNeeded
      achievements
      pendingAchievements
    }
  }
`;

export const GET_STREAKS = gql`
  query GetStreaks {
    getStreaks {
      success
      streaks {
        type
        currentStreak
        longestStreak
        lastActivityDate
      }
    }
  }
`;

export const GET_MY_STATS = gql`
  query GetMyStats {
    getMyStats {
      success
      stats {
        activeShards
        completedShards
        activeMinigoals
        completedMinigoals
        completionRate
      }
    }
  }
`;

export const GET_ACHIEVEMENTS = gql`
  query GetAchievements {
    getAchievements {
      success
      achievements {
        id
        name
        description
        icon
        category
        rarity
        earned
        pending
      }
    }
  }
`;

export const MY_CHALLENGES = gql`
  query MyChallenges {
    myChallenges {
      success
      challenges {
        id
        type
        title
        description
        targetDate
        xpReward
      }
    }
  }
`;

export const GET_OFFERINGS = gql`
  query GetOfferings {
    listOfferings {
      identifier
      description
      packages {
        identifier
        priceString
        price
        currencyCode
      }
    }
  }
`;

export const MY_SUBSCRIPTION_HISTORY = gql`
  query MySubscriptionHistory {
    mySubscriptionHistory {
      id
      tier
      action
      amount
      currency
      details
      timestamp
    }
  }
`;

export const MY_TEAMS = gql`
  query MyTeams {
    myTeams {
      success
      teams {
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

export const GET_TEAM = gql`
  query GetTeam($teamId: ID!) {
    getTeam(teamId: $teamId) {
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
