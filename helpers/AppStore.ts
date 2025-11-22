import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

const APPSTORE_KEYS = ['allStatuses', 'currentStatus', 'currentStatusIndex', 'alerts', 'user'];

const AppStore = {
  get: async (key: string) => {
    try {
      const value = await AsyncStorage.getItem(key);
      if (!value) return null;
      return JSON.parse(value);
    } catch (e) {
      console.error('AppStore get error:', e);
      return null;
    }
  },

  set: async (key: string, value: any) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('AppStore set error:', e);
    }
  },

  remove: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.error('AppStore remove error:', e);
    }
  },

  removeAll: async () => {
    try {
      await AsyncStorage.multiRemove(APPSTORE_KEYS);
    } catch (e) {
      console.error('AppStore removeAll error:', e);
    }
  },

  clearAll: async () => {
    try {
      await AsyncStorage.clear();
    } catch (e) {
      console.error('AppStore clearAll error:', e);
    }
  },

  saveAlert: async ({
    str,
    type = 'default',
    icon,
  }: {
    str?: string;
    type?: 'info' | 'success' | 'warning' | 'error' | 'default';
    icon?: any;
  }) => {
    try {
      const alertsStr = await AsyncStorage.getItem('alerts');
      let alerts: Record<string, any> = {};
      if (alertsStr) {
        alerts = JSON.parse(alertsStr);
      }
      if (!alerts[type]) alerts[type] = [];
      alerts[type].push({ str, icon });
      await AsyncStorage.setItem('alerts', JSON.stringify(alerts));
    } catch (e) {
      console.error('AppStore saveAlert error:', e);
    }
  },

  countAlert: async () => {
    try {
      const alertsStr = await AsyncStorage.getItem('alerts');
      if (!alertsStr) return 0;
      const alerts = JSON.parse(alertsStr);
      return Object.keys(alerts).length;
    } catch (e) {
      console.error('AppStore countAlert error:', e);
      return 0;
    }
  },

  showAlert: async ({
    str,
    type = 'default',
    icon,
  }: {
    str?: string;
    type?: 'info' | 'success' | 'warning' | 'error' | 'default';
    icon?: any;
  }) => {
    try {
      if (str?.trim()) {
        Toast.show({
          topOffset: 60,
          type: AppStore.mapToastType(type),
          text1: str,
          position: 'top',
          visibilityTime: 3000,
          props: { icon },
        });
      }
    } catch (e) {
      console.error('AppStore showAlert error:', e);
      Toast.show({ type: 'error', text1: 'Notification error' });
    }
  },

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

export default AppStore;
