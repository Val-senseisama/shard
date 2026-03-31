import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true
  }),
});

export interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
}

class NotificationService {
  private pushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;

  /**
   * Initialize notification service
   */
  async initialize() {
    // Register for push notifications
    await this.registerForPushNotifications();

    // Listen for notifications when app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('📬 Notification received:', notification);
      // You can handle foreground notifications here
    });

    // Listen for user interactions with notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('👆 Notification tapped:', response);
      this.handleNotificationResponse(response);
    });
  }

  /**
   * Clean up listeners
   */
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  /**
   * Register for push notifications and get token
   */
  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.warn('Push notifications only work on physical devices');
      return null;
    }

    try {
      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permission not granted');
        return null;
      }

      // Get FCM push token (native Firebase token for Firebase Admin SDK)
      // Note: Using getDevicePushTokenAsync() instead of getExpoPushTokenAsync()
      // because backend uses Firebase Admin SDK, not Expo Push API
      const tokenData = await Notifications.getDevicePushTokenAsync().catch(err => {
        console.log("FCM token error", err);
        throw err;
      });
      
      this.pushToken = tokenData.data;
      console.log('📱 FCM Push token:', this.pushToken);

      // Configure notification channels for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });

        await Notifications.setNotificationChannelAsync('shard-updates', {
          name: 'Shard Updates',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#667EEA',
        });

        await Notifications.setNotificationChannelAsync('messages', {
          name: 'Messages',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3B82F6',
        });
      }

      return this.pushToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Get the current push token
   */
  getPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * Schedule a local notification
   */
  async scheduleNotification(
    notification: NotificationData,
    trigger: Notifications.NotificationTriggerInput
  ) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
          sound: true,
        },
        trigger,
      });
      return id;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * Send immediate local notification
   */
  async sendLocalNotification(notification: NotificationData) {
    return this.scheduleNotification(notification, null);
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number) {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Handle notification tap
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse) {
    const data = response.notification.request.content.data;

    // Navigate based on notification data
    // This will be implemented in the app layout
    if (data?.shardId) {
      console.log('Navigate to shard:', data.shardId);
    } else if (data?.chatId) {
      console.log('Navigate to chat:', data.chatId);
    }
  }
}

// Export singleton instance
export default new NotificationService();
