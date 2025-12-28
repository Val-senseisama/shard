import Constants from 'expo-constants';

// Automatically detect environment
const ENV = {
  dev: {
    GRAPHQL_ENDPOINT: 'http://10.153.102.1:4000/graphql', // USB tethering
    WS_ENDPOINT: 'ws://10.153.102.1:4000',
  },
  staging: {
    GRAPHQL_ENDPOINT: 'https://your-staging-server.com/graphql',
    WS_ENDPOINT: 'wss://your-staging-server.com',
  },
  prod: {
    GRAPHQL_ENDPOINT: 'https://your-production-server.com/graphql',
    WS_ENDPOINT: 'wss://your-production-server.com',
  },
};

const getEnvVars = () => {
  // You can use __DEV__ or Constants to determine environment
  if (__DEV__) {
    return ENV.dev;
  }
  // Add logic for staging vs prod based on your release channels
  return ENV.prod;
};

export const CONFIG = getEnvVars();
