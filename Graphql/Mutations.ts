import { gql } from '@apollo/client';

export const REGISTER = gql`
  mutation Register($email: String!, $password: String!) {
    register(email: $email, password: $password)
  }
`;

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      accessToken
      refreshToken
    }
  }
`;

export const COMPLETE_PROFILE = gql`
  mutation CompleteProfile($username: String!, $gender: Gender!, $profile: String) {
    completeProfile(username: $username, gender: $gender, profile: $profile) {
      id
      username
      gender
      profile
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
