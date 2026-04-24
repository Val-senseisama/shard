import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  ScrollView,
  useColorScheme,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import ConfirmModal from '~/components/ConfirmModal';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client';
import { useFriendsStore, Friend } from '~/store/friends.store';
import {
  GET_FRIENDS,
  GET_PENDING_REQUESTS,
  GET_FRIEND_SUGGESTIONS,
  SEARCH_USERS,
} from '~/Graphql/Queries';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useMutation as useApolloMutation } from '@apollo/client';
import Toast from 'react-native-toast-message';
import {
  UNFRIEND,
  BLOCK_USER,
  ACCEPT_FRIEND_REQUEST,
  REJECT_FRIEND_REQUEST,
  CANCEL_FRIEND_REQUEST,
  SEND_FRIEND_REQUEST,
} from '~/Graphql/Mutations';
import { useUserStore } from '~/store/user.store';
import AnimatedPressable from '~/components/AnimatedPressable';
import { ACCENT, t } from '~/components/shard/constants';
import { avatarUri } from '~/helpers/avatarUri';
import { formatDistanceToNow } from 'date-fns';

type TabType = 'friends' | 'requests' | 'discover';
type RequestSubTab = 'incoming' | 'outgoing';

interface FriendRequest {
  id: string;
  username: string;
  profilePic: string;
  mutualFriends?: number;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const FriendSkeleton = ({ isDark }: { isDark: boolean }) => {
  const opacity = useSharedValue(0.35);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.8, { duration: 700 }), withTiming(0.35, { duration: 700 })),
      -1,
      true
    );
  }, []);
  const anim = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const bg = isDark ? '#2a2a2a' : '#e5e7eb';
  const cardBg = isDark ? '#1e1e1e' : '#fff';

  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: cardBg,
            borderRadius: 16,
            padding: 14,
            marginBottom: 10,
          }}>
          <Animated.View style={[{ width: 48, height: 48, borderRadius: 24, backgroundColor: bg }, anim]} />
          <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
            <Animated.View style={[{ height: 14, borderRadius: 5, backgroundColor: bg, width: '50%' }, anim]} />
            <Animated.View style={[{ height: 11, borderRadius: 4, backgroundColor: bg, width: '35%' }, anim]} />
          </View>
        </View>
      ))}
    </>
  );
};

// ─── Friend Card ──────────────────────────────────────────────────────────────

const FriendCard = ({
  friend,
  isDark,
  onMenuPress,
}: {
  friend: Friend;
  isDark: boolean;
  onMenuPress: (friend: Friend) => void;
}) => {
  const theme = t(isDark);

  const renderRight = () => (
    <View style={{ flexDirection: 'row' }}>
      <AnimatedPressable
        scaleDown={0.94}
        onPress={() => onMenuPress(friend)}
        style={{
          backgroundColor: '#ef4444',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 20,
          marginBottom: 10,
          borderRadius: 12,
          marginLeft: 6,
        }}>
        <Ionicons name="person-remove-outline" size={20} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', marginTop: 3 }}>Remove</Text>
      </AnimatedPressable>
    </View>
  );

  const lastActiveText = friend.lastActive
    ? formatDistanceToNow(new Date(parseInt(friend.lastActive)), { addSuffix: true })
    : null;

  return (
    <Swipeable renderRightActions={renderRight} overshootRight={false} friction={2}>
      <AnimatedPressable
        scaleDown={0.98}
        onPress={() =>
          router.push({
            pathname: '/friend-profile',
            params: {
              friendId: friend.id,
              username: friend.username,
              profilePic: friend.profilePic || '',
              email: friend.email || '',
              isOnline: friend.isOnline ? '1' : '0',
            },
          })
        }
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.card,
          borderRadius: 16,
          padding: 14,
          marginBottom: 10,
        }}>
        <View style={{ position: 'relative' }}>
          <Image
            source={{ uri: avatarUri(friend.profilePic, friend.username) }}
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: ACCENT }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: 1,
              right: 1,
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: friend.isOnline ? '#10b981' : '#9ca3af',
              borderWidth: 2,
              borderColor: theme.card,
            }}
          />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>{friend.username}</Text>
          <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
            {friend.isOnline ? 'Online now' : lastActiveText ? `Active ${lastActiveText}` : friend.email}
          </Text>
        </View>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: friend.isOnline ? '#10b981' : 'transparent',
          }}
        />
      </AnimatedPressable>
    </Swipeable>
  );
};

// ─── Request Card ─────────────────────────────────────────────────────────────

const RequestCard = ({
  request,
  isDark,
  onAccept,
  onDecline,
  onBlock,
  processing,
}: {
  request: FriendRequest;
  isDark: boolean;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onBlock?: (id: string) => void;
  processing: boolean;
}) => {
  const theme = t(isDark);

  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.card,
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
      }}>
      <Image
        source={{ uri: avatarUri(request.profilePic, request.username) }}
        style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: ACCENT }}
      />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>{request.username}</Text>
        {(request.mutualFriends ?? 0) > 0 && (
          <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
            {request.mutualFriends} mutual friend{request.mutualFriends !== 1 ? 's' : ''}
          </Text>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <AnimatedPressable
          onPress={() => !processing && onDecline(request.id)}
          scaleDown={0.92}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="close" size={18} color="#ef4444" />
        </AnimatedPressable>
        <AnimatedPressable
          onPress={() => !processing && onAccept(request.id)}
          scaleDown={0.92}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.08)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {processing ? (
            <ActivityIndicator size="small" color="#10b981" />
          ) : (
            <Ionicons name="checkmark" size={18} color="#10b981" />
          )}
        </AnimatedPressable>
      </View>
    </Animated.View>
  );
};

// ─── User Row (search / suggestions / outgoing) ───────────────────────────────

const UserRow = ({
  user,
  isDark,
  actionLabel,
  actionColor,
  onAction,
  loading,
  onPress,
  disabled,
}: {
  user: FriendRequest;
  isDark: boolean;
  actionLabel: string;
  actionColor: string;
  onAction: (id: string) => void;
  loading: boolean;
  onPress?: () => void;
  disabled?: boolean;
}) => {
  const theme = t(isDark);
  return (
    <AnimatedPressable
      scaleDown={0.98}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.card,
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
      }}>
      <Image
        source={{ uri: avatarUri(user.profilePic, user.username) }}
        style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: ACCENT }}
      />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>{user.username}</Text>
        {(user.mutualFriends ?? 0) > 0 && (
          <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
            {user.mutualFriends} mutual
          </Text>
        )}
      </View>
      <AnimatedPressable
        onPress={() => onAction(user.id)}
        scaleDown={0.9}
        disabled={disabled || loading}
        style={{
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 20,
          backgroundColor: disabled ? (isDark ? '#2a2a2a' : '#e5e7eb') : actionColor,
          minWidth: 72,
          alignItems: 'center',
        }}>
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={{ fontSize: 13, fontWeight: '700', color: disabled ? theme.textSecondary : '#fff' }}>
            {disabled ? 'Sent' : actionLabel}
          </Text>
        )}
      </AnimatedPressable>
    </AnimatedPressable>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState = ({ icon, text, isDark }: { icon: string; text: string; isDark: boolean }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
    <Ionicons name={icon as any} size={56} color={isDark ? '#374151' : '#d1d5db'} />
    <Text style={{ marginTop: 14, fontSize: 15, color: isDark ? '#4b5563' : '#9ca3af', textAlign: 'center' }}>
      {text}
    </Text>
  </View>
);

// ─── Main ─────────────────────────────────────────────────────────────────────

const Friends = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = t(isDark);

  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [requestSubTab, setRequestSubTab] = useState<RequestSubTab>('incoming');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [suggestions, setSuggestions] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<FriendRequest[]>([]);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [loadingAddId, setLoadingAddId] = useState<string | null>(null);

  // Confirm modals
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmBlockId, setConfirmBlockId] = useState<string | null>(null);
  const confirmRemoveFriend = incomingRequests.find(r => r.id === confirmRemoveId) ??
    suggestions.find(r => r.id === confirmRemoveId) ??
    { username: '' };

  const { friends, setFriends } = useFriendsStore();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mutations
  const [unfriend] = useMutation(UNFRIEND);
  const [blockUser] = useMutation(BLOCK_USER);
  const [acceptFriendRequest] = useMutation(ACCEPT_FRIEND_REQUEST);
  const [rejectFriendRequest] = useMutation(REJECT_FRIEND_REQUEST);
  const [cancelFriendRequest] = useMutation(CANCEL_FRIEND_REQUEST);
  const [sendFriendRequest] = useMutation(SEND_FRIEND_REQUEST);

  // Queries
  const { data: friendsData, loading: friendsLoading, refetch: refetchFriends } = useQuery(GET_FRIENDS, {
    fetchPolicy: 'cache-and-network',
  });
  const { refetch: refetchRequests } = useQuery(GET_PENDING_REQUESTS, {
    fetchPolicy: 'cache-and-network',
    onCompleted: applyRequests,
  });
  const { refetch: refetchSuggestions } = useQuery(GET_FRIEND_SUGGESTIONS, {
    fetchPolicy: 'cache-and-network',
    onCompleted: applySuggestions,
  });

  const [searchUsers, { loading: searchLoading }] = useLazyQuery(SEARCH_USERS);

  useEffect(() => {
    if (friendsData?.getFriends?.success) {
      setFriends(friendsData.getFriends.friends);
    }
  }, [friendsData]);

  function applyRequests(data: any) {
    if (data?.getPendingRequests?.success) {
      setIncomingRequests((data.getPendingRequests.incoming || []).map((u: any) => ({
        id: u.id, username: u.username, profilePic: u.profilePic,
      })));
      setOutgoingRequests((data.getPendingRequests.outgoing || []).map((u: any) => ({
        id: u.id, username: u.username, profilePic: u.profilePic,
      })));
    }
  }

  function applySuggestions(data: any) {
    if (data?.getFriendSuggestions?.success) {
      setSuggestions((data.getFriendSuggestions.suggestions || []).map((u: any) => ({
        id: u.id, username: u.username, profilePic: u.profilePic,
        mutualFriends: u.mutualFriends || 0,
      })));
    }
  }

  // Debounced server search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.trim().length < 3) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await searchUsers({ variables: { query: searchQuery.trim() } });
        if (data?.searchUsers?.success) {
          setSearchResults((data.searchUsers.users || []).map((u: any) => ({
            id: u.id, username: u.username, profilePic: u.profilePic,
            mutualFriends: u.mutualFriends || 0,
          })));
        }
      } catch { /* silent */ }
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const [result] = await Promise.all([
      refetchFriends(),
      refetchRequests().then(r => applyRequests(r.data)),
      refetchSuggestions().then(r => applySuggestions(r.data)),
    ]);
    if (result.data?.getFriends?.success) setFriends(result.data.getFriends.friends);
    setRefreshing(false);
  }, []);

  // Friend actions
  const handleAccept = useCallback(async (id: string) => {
    setProcessingId(id);
    try {
      const { data } = await acceptFriendRequest({ variables: { friendId: id } });
      if (data?.acceptFriendRequest?.success) {
        setIncomingRequests(p => p.filter(r => r.id !== id));
        refetchFriends().then(r => { if (r.data?.getFriends?.success) setFriends(r.data.getFriends.friends); });
        Toast.show({ type: 'success', text1: 'Friend request accepted!' });
      } else {
        Toast.show({ type: 'error', text1: data?.acceptFriendRequest?.message || 'Failed' });
      }
    } catch { Toast.show({ type: 'error', text1: 'Something went wrong' }); }
    finally { setProcessingId(null); }
  }, []);

  const handleDecline = useCallback(async (id: string) => {
    try {
      const { data } = await rejectFriendRequest({ variables: { friendId: id } });
      if (data?.rejectFriendRequest?.success) {
        setIncomingRequests(p => p.filter(r => r.id !== id));
        Toast.show({ type: 'success', text1: 'Request declined' });
      }
    } catch { /* silent */ }
  }, []);

  const handleCancel = useCallback(async (id: string) => {
    try {
      const { data } = await cancelFriendRequest({ variables: { friendId: id } });
      if (data?.cancelFriendRequest?.success) {
        setOutgoingRequests(p => p.filter(r => r.id !== id));
        Toast.show({ type: 'success', text1: 'Request cancelled' });
      }
    } catch { /* silent */ }
  }, []);

  const handleUnfriend = useCallback(async (friendId: string) => {
    try {
      const { data } = await unfriend({ variables: { friendId } });
      if (data?.unfriend?.success) {
        setFriends(friends.filter(f => f.id !== friendId));
        Toast.show({ type: 'success', text1: 'Friend removed' });
      }
    } catch { Toast.show({ type: 'error', text1: 'Failed to remove friend' }); }
    finally { setConfirmRemoveId(null); }
  }, [friends]);

  const handleBlock = useCallback(async (userId: string) => {
    try {
      const { data } = await blockUser({ variables: { userId } });
      if (data?.blockUser?.success) {
        setFriends(friends.filter(f => f.id !== userId));
        setIncomingRequests(p => p.filter(r => r.id !== userId));
        setSuggestions(p => p.filter(s => s.id !== userId));
        Toast.show({ type: 'success', text1: 'User blocked' });
      }
    } catch { Toast.show({ type: 'error', text1: 'Failed to block user' }); }
    finally { setConfirmBlockId(null); }
  }, [friends]);

  const handleSend = useCallback(async (userId: string) => {
    setLoadingAddId(userId);
    try {
      const { data } = await sendFriendRequest({ variables: { friendId: userId } });
      if (data?.sendFriendRequest?.success) {
        setSentIds(p => new Set(p).add(userId));
        Toast.show({ type: 'success', text1: 'Friend request sent!' });
      } else {
        Toast.show({ type: 'error', text1: data?.sendFriendRequest?.message || 'Failed' });
      }
    } catch { Toast.show({ type: 'error', text1: 'Something went wrong' }); }
    finally { setLoadingAddId(null); }
  }, []);

  // Derived lists
  const isSearching = searchQuery.trim().length > 0;
  const localFiltered = isSearching
    ? friends.filter(f =>
        f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : friends;
  const serverResults = searchResults.filter(u => !friends.some(f => f.id === u.id));
  const filteredSuggestions = suggestions.filter(s => !friends.some(f => f.id === s.id));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: ACCENT, letterSpacing: -0.5 }}>Friends</Text>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: theme.card, borderRadius: 14,
          paddingHorizontal: 14, paddingVertical: 11,
          borderWidth: 1, borderColor: isDark ? theme.border : 'rgba(0,0,0,0.06)',
        }}>
          {searchLoading
            ? <ActivityIndicator size="small" color={ACCENT} style={{ marginRight: 10 }} />
            : <Ionicons name="search" size={18} color={theme.textSecondary} style={{ marginRight: 10 }} />
          }
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search friends or find new people…"
            placeholderTextColor={theme.textSecondary}
            style={{ flex: 1, fontSize: 15, color: theme.text }}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <AnimatedPressable onPress={() => setSearchQuery('')} hitSlop={12} scaleDown={0.85}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </AnimatedPressable>
          )}
        </View>
      </View>

      {/* Tabs — hidden when actively searching */}
      {!isSearching && (
        <View style={{ flexDirection: 'row', marginHorizontal: 16, marginBottom: 14, backgroundColor: isDark ? '#1a1a1a' : '#f3f4f6', borderRadius: 12, padding: 4 }}>
          {(['friends', 'requests', 'discover'] as const).map((tab) => {
            const badge = tab === 'requests' ? incomingRequests.length : 0;
            return (
              <AnimatedPressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                scaleDown={0.95}
                style={{
                  flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10,
                  backgroundColor: activeTab === tab ? ACCENT : 'transparent',
                  flexDirection: 'row', justifyContent: 'center', gap: 5,
                }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: activeTab === tab ? '#fff' : theme.textSecondary, textTransform: 'capitalize' }}>
                  {tab === 'friends' ? 'Friends' : tab === 'requests' ? 'Requests' : 'Discover'}
                </Text>
                {badge > 0 && (
                  <View style={{ backgroundColor: '#ef4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{badge}</Text>
                  </View>
                )}
              </AnimatedPressable>
            );
          })}
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} colors={[ACCENT]} />}>

        {/* ── Search results ── */}
        {isSearching ? (
          <>
            {/* Local matches */}
            {localFiltered.length > 0 && (
              <>
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                  Your Friends
                </Text>
                {localFiltered.map(f => (
                  <FriendCard key={f.id} friend={f} isDark={isDark} onMenuPress={(fr) => setConfirmRemoveId(fr.id)} />
                ))}
              </>
            )}
            {/* Server results (non-friends) */}
            {searchQuery.trim().length >= 3 && (
              <>
                {serverResults.length > 0 && (
                  <>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary, letterSpacing: 1, textTransform: 'uppercase', marginTop: 12, marginBottom: 10 }}>
                      Add People
                    </Text>
                    {serverResults.map(u => (
                      <UserRow
                        key={u.id}
                        user={u}
                        isDark={isDark}
                        actionLabel="Add"
                        actionColor={ACCENT}
                        onAction={handleSend}
                        loading={loadingAddId === u.id}
                        disabled={sentIds.has(u.id)}
                      />
                    ))}
                  </>
                )}
                {!searchLoading && localFiltered.length === 0 && serverResults.length === 0 && (
                  <EmptyState icon="search-outline" text="No results found" isDark={isDark} />
                )}
              </>
            )}
            {localFiltered.length === 0 && searchQuery.trim().length < 3 && (
              <EmptyState icon="search-outline" text="Type at least 3 characters to search" isDark={isDark} />
            )}
          </>
        ) : activeTab === 'friends' ? (
          <>
            {friendsLoading && friends.length === 0 ? (
              <FriendSkeleton isDark={isDark} />
            ) : friends.length === 0 ? (
              <EmptyState icon="people-outline" text={"No friends yet\nDiscover people in the Discover tab"} isDark={isDark} />
            ) : (
              friends.map((f, i) => (
                <Animated.View key={f.id} entering={FadeInDown.delay(i * 40).duration(300)}>
                  <FriendCard friend={f} isDark={isDark} onMenuPress={(fr) => setConfirmRemoveId(fr.id)} />
                </Animated.View>
              ))
            )}
          </>
        ) : activeTab === 'requests' ? (
          <>
            {/* Sub-tabs */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              {(['incoming', 'outgoing'] as const).map((sub) => {
                const count = sub === 'incoming' ? incomingRequests.length : outgoingRequests.length;
                const active = requestSubTab === sub;
                return (
                  <AnimatedPressable
                    key={sub}
                    scaleDown={0.95}
                    onPress={() => setRequestSubTab(sub)}
                    style={{
                      flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: active ? ACCENT : isDark ? '#374151' : '#e5e7eb',
                      backgroundColor: active ? isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.08)' : 'transparent',
                    }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: active ? ACCENT : theme.textSecondary }}>
                      {sub === 'incoming' ? 'Incoming' : 'Sent'} {count > 0 ? `(${count})` : ''}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>

            {requestSubTab === 'incoming' ? (
              incomingRequests.length > 0 ? (
                incomingRequests.map(r => (
                  <RequestCard
                    key={r.id}
                    request={r}
                    isDark={isDark}
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                    processing={processingId === r.id}
                  />
                ))
              ) : (
                <EmptyState icon="mail-outline" text="No incoming requests" isDark={isDark} />
              )
            ) : (
              outgoingRequests.length > 0 ? (
                outgoingRequests.map(r => (
                  <UserRow
                    key={r.id}
                    user={r}
                    isDark={isDark}
                    actionLabel="Cancel"
                    actionColor="#6b7280"
                    onAction={handleCancel}
                    loading={false}
                  />
                ))
              ) : (
                <EmptyState icon="paper-plane-outline" text="No outgoing requests" isDark={isDark} />
              )
            )}
          </>
        ) : (
          /* Discover */
          filteredSuggestions.length > 0 ? (
            <>
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
                People You May Know
              </Text>
              {filteredSuggestions.map((s, i) => (
                <Animated.View key={s.id} entering={FadeInDown.delay(i * 50).duration(300)}>
                  <UserRow
                    user={s}
                    isDark={isDark}
                    actionLabel="Add"
                    actionColor={ACCENT}
                    onAction={handleSend}
                    loading={loadingAddId === s.id}
                    disabled={sentIds.has(s.id)}
                  />
                </Animated.View>
              ))}
            </>
          ) : (
            <EmptyState icon="compass-outline" text={"No suggestions right now\nAdd friends to get recommendations"} isDark={isDark} />
          )
        )}
      </ScrollView>

      {/* Remove confirmation */}
      <ConfirmModal
        visible={!!confirmRemoveId}
        onClose={() => setConfirmRemoveId(null)}
        onConfirm={() => confirmRemoveId && handleUnfriend(confirmRemoveId)}
        title="Remove Friend?"
        message={`Remove ${friends.find(f => f.id === confirmRemoveId)?.username ?? ''} from your friends?`}
        confirmLabel="Remove"
        icon="person-remove-outline"
        destructive
      />
      {/* Block confirmation */}
      <ConfirmModal
        visible={!!confirmBlockId}
        onClose={() => setConfirmBlockId(null)}
        onConfirm={() => confirmBlockId && handleBlock(confirmBlockId)}
        title="Block User?"
        message="They won't be able to see your profile or send you requests."
        confirmLabel="Block"
        icon="ban-outline"
        confirmColor="#991b1b"
        destructive
      />
    </SafeAreaView>
  );
};

export default Friends;
