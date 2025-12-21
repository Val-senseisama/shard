
import { useLocalSearchParams } from 'expo-router';
import Notifications from '~/app/(screens)/notifications';

// This is a wrapper that passes the shardId from the route params
// to the existing notifications screen
const ShardNotifications = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  
  // The notifications screen already supports shardId filtering
  // We just need to pass it through
  return <Notifications />;
};

export default ShardNotifications;
