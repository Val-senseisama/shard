import { Platform } from "react-native"

export const getClientId = () => Platform.select({
    ios: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
    android: '882989295593-6bebonafmcrn6lve6o0dcslq9a8bpmhr.apps.googleusercontent.com',
    web: '171215393981-8p8i0st4dlb7bje2nf9dgro77d195bno.apps.googleusercontent.com',
  })