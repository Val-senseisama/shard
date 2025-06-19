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

// export const COMPLETE_PROFILE = gql`
//   mutation CompleteProfile($username: String!, $gender: Gender!, $profile: String) {
//     completeProfile(username: $username, gender: $gender, profile: $profile) {
//       id
//       username
//       gender
//       profile
//     }
//   }
// `;
