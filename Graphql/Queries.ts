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
