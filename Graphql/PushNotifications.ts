import { gql } from '@apollo/client';

export const REGISTER_PUSH_TOKEN = gql`
  mutation RegisterPushToken($token: String!, $platform: String!) {
    registerPushToken(token: $token, platform: $platform) {
      success
      message
    }
  }
`;

export const UNREGISTER_PUSH_TOKEN = gql`
  mutation UnregisterPushToken($token: String!) {
    unregisterPushToken(token: $token) {
      success
      message
    }
  }
`;

export const SEND_TEST_NOTIFICATION = gql`
  mutation SendTestNotification {
    sendTestNotification {
      success
      message
    }
  }
`;
