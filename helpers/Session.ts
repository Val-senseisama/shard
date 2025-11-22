import Toast from 'react-native-toast-message';
import { Validate } from './Validate';
import * as SecureStore from 'expo-secure-store';

// List of keys we use for session management
const SESSION_KEYS = ['x-access-token', 'x-refresh-token', 'x-force-token', 'alerts'];

const Session = {
  setCookie: async (cname: string, cvalue: string) => {
    try {
      if (cvalue === '') {
        await SecureStore.deleteItemAsync(cname);
      } else {
        // Don't stringify again if it's already a string
        const valueToStore = typeof cvalue === 'string' ? cvalue : JSON.stringify(cvalue);
        await SecureStore.setItemAsync(cname, valueToStore);
      }
    } catch (e) {
      console.error('Error setting cookie:', e);
    }
  },

  getCookie: async (cname: string): Promise<string> => {
    try {
      const value = await SecureStore.getItemAsync(cname);
      if (!value) return '';

      // Try to parse if it's JSON, otherwise return as is
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (e) {
      console.error('Error getting cookie:', e);
      return '';
    }
  },

  clearAllCookies: async () => {
    try {
      await Promise.all(SESSION_KEYS.map((key) => SecureStore.deleteItemAsync(key)));
    } catch (e) {
      console.error('Error clearing cookies:', e);
    }
  },

  get: async (key: string) => {
    try {
      const value = await SecureStore.getItemAsync(key);
      if (!value) return null;
      return JSON.parse(value);
    } catch (e) {
      console.error('Error getting item:', e);
      return null;
    }
  },

  set: async (key: string, value: any) => {
    try {
      await SecureStore.setItemAsync(key, JSON.stringify(value));
    } catch (e) {
      console.error('Error setting item:', e);
    }
  },

  remove: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.error('Error removing item:', e);
    }
  },

  removeAll: async () => {
    try {
      await Promise.all(SESSION_KEYS.map((key) => SecureStore.deleteItemAsync(key)));
    } catch (e) {
      console.error('Error removing all items:', e);
    }
  },

  removeAllExcept: async (key: string) => {
    try {
      const keysToRemove = SESSION_KEYS.filter((k) => k !== key);
      await Promise.all(keysToRemove.map((k) => SecureStore.deleteItemAsync(k)));
    } catch (e) {
      console.error('Error removing items except:', e);
    }
  },

  saveAlert: async ({
    str,
    type = 'default',
  }: {
    str?: string;
    type?: 'info' | 'success' | 'warning' | 'error' | 'default';
  }) => {
    try {
      const alertsStr = await SecureStore.getItemAsync('alerts');
      let alerts: Record<string, any> = {};

      if (alertsStr) {
        alerts = JSON.parse(alertsStr);
      }

      if (!alerts[type]) alerts[type] = [];
      alerts[type].push(str);

      await SecureStore.setItemAsync('alerts', JSON.stringify(alerts));
    } catch (e) {
      console.error('Error saving alert:', e);
    }
  },

  countAlert: async () => {
    try {
      const alertsStr = await SecureStore.getItemAsync('alerts');
      if (!alertsStr) {
        return 0;
      }
      const alerts = JSON.parse(alertsStr);
      return Object.keys(alerts).length;
    } catch (e) {
      console.error('Error counting alerts:', e);
      return 0;
    }
  },

  showAlert: async ({
    str,
    type = 'default',
  }: {
    str?: string;
    type?: 'info' | 'success' | 'warning' | 'error' | 'default';
  }) => {
    try {
      const alertsStr = await SecureStore.getItemAsync('alerts');
      let alerts: Record<string, string[]> = {}; // Initialize with empty object

      if (alertsStr) {
        try {
          alerts = JSON.parse(alertsStr) || {};
        } catch (e) {
          console.error('Error parsing alerts:', e);
        }
      }

      if (str?.trim()) {
        alerts[type] = alerts[type] || [];
        alerts[type].push(str);
      }

      Object.entries(alerts).forEach(([alertType, messages]) => {
        messages.forEach((message) => {
          Toast.show({
            topOffset: 60,
            type: Session.mapToastType(alertType), // Use Session reference
            text1: message,
            position: 'top',
            visibilityTime: 3000,
          });
        });
      });

      await SecureStore.deleteItemAsync('alerts');

      if (str?.trim()) {
        await SecureStore.setItemAsync('alerts', JSON.stringify(alerts));
      }
    } catch (e) {
      console.error('Error handling alerts:', e);
      Toast.show({ type: 'error', text1: 'Notification error' });
    }
  },

  // Fixed method declaration
  mapToastType: (type: string) => {
    const typeMap: Record<string, 'success' | 'error' | 'info'> = {
      success: 'success',
      error: 'error',
      warning: 'error',
      info: 'info',
      default: 'info',
    };
    return typeMap[type] || 'info';
  },
};

export default Session;
