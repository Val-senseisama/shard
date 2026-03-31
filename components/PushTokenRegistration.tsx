import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useMutation } from '@apollo/client';
import { REGISTER_PUSH_TOKEN } from '~/Graphql/PushNotifications';
import notificationService from '~/services/notificationService';
import { useUserStore } from '~/store/user.store';

/**
 * Component to register push token with backend
 * Must be rendered inside ApolloProvider
 */
export default function PushTokenRegistration() {
  const user = useUserStore((state) => state.user);
  const [hasRegistered, setHasRegistered] = useState(false);

  const [registerPushToken] = useMutation(REGISTER_PUSH_TOKEN, {
    onCompleted: (data) => {
      if (data?.registerPushToken?.success) {
        console.log('✅ Push token registered with backend');
        setHasRegistered(true);
      } else {
        console.error('❌ Failed to register push token:', data?.registerPushToken?.message);
      }
    },
    onError: (error) => {
      console.error('❌ Error sending push token to backend:', error);
    },
  });

  useEffect(() => {
    // Only register if user is logged in and we haven't registered yet
    if (!user || hasRegistered) return;

    const registerToken = async () => {
      try {
        // Wait for the token directly instead of polling
        let token = notificationService.getPushToken();
        if (!token) {
          token = await notificationService.registerForPushNotifications();
        }

        if (token) {
          console.log('📱 Registering push token with backend:', token.substring(0, 30) + '...');
          registerPushToken({
            variables: {
              token,
              platform: Platform.OS,
            },
          });
        } else {
          console.warn('⚠️ Push token not available');
        }
      } catch (error) {
        console.error('❌ Error getting push token:', error);
      }
    };

    registerToken();
  }, [user, hasRegistered]);

  return null; // This component has no UI
}
