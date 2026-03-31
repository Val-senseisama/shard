import { Platform } from 'react-native';

export const WEB_CLIENT_ID = '882989295593-6bebonafmcrn6lve6o0dcslq9a8bpmhr.apps.googleusercontent.com';

export const getClientId = () =>
  Platform.select({
    ios: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
    android: '171215393981-8p8i0st4dlb7bje2nf9dgro77d195bno.apps.googleusercontent.com',
    web: WEB_CLIENT_ID,
  });
