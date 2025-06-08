import { gql } from "@apollo/client";

export const CURRENT_USER = gql`
query Query {
  currentUser {
    id
    username
    email
    XP
    level
    coins
    gender
    status
    refresh_token
    strength
    intelligence
    endurance
    dexterity
    luck
    profile
    created_at
    updated_at
  }
}
`;