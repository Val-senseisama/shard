import { Redirect } from 'expo-router';

// This screen is never shown — the tab press redirects to /new-shard
export default function NewShardTab() {
  return <Redirect href="/new-shard" />;
}
