export const CONFIG = {
  // --- Option 1: Android Emulator (host machine localhost) ---
  // GRAPHQL_ENDPOINT: 'http://10.0.2.2:4000/graphql',
  // WS_ENDPOINT: 'ws://10.0.2.2:4000',

  // --- Option 2: Remote server (production / public URL) ---
  GRAPHQL_ENDPOINT: 'https://shard-server-production.up.railway.app/graphql',
  WS_ENDPOINT: 'wss://shard-server-production.up.railway.app',

  // --- Option 3: Phone hotspot (laptop connected to phone's hotspot) ---
  // GRAPHQL_ENDPOINT: 'http://10.84.67.1:4000/graphql',
  // WS_ENDPOINT: 'ws://10.84.67.1:4000',

  // --- Option 4: Same WiFi network (laptop + physical phone on same LAN) ---
  // Run `ip addr show | grep "inet " | grep -v "127.0.0.1"` to get your LAN IP
  // GRAPHQL_ENDPOINT: 'http://192.168.1.75:4000/graphql',
  // WS_ENDPOINT: 'ws://192.168.1.75:4000',

  REVENUECAT_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY,
};
