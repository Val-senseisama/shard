export const CONFIG = {
  // Use local network IP for development (device must be on same WiFi network)
  // Change to your server's deployed URL for production
  GRAPHQL_ENDPOINT: 'http://10.153.102.1:4000/graphql',
  WS_ENDPOINT: 'ws://10.153.102.1:4000',
  // For development with device as hotspot, use the IP address assigned to your dev machine
  // WS_ENDPOINT: 'ws://<HOTSPOT_IP>:4000',
};


// use this for now : http://192.168.1.21:4000/graphql'

// ryn this when connected to hotspot phone
// ip addr show | grep "inet " | grep -v "127.0.0.1"