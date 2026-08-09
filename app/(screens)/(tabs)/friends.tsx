import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useColorScheme } from '~/hooks/useColorScheme';
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
  MY_TEAMS,
  GET_LEADERBOARD,
} from '~/Graphql/Queries';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useReducedMotion } from '~/helpers/motion';
import {
  UNFRIEND,
  BLOCK_USER,
  ACCEPT_FRIEND_REQUEST,
  REJECT_FRIEND_REQUEST,
  CANCEL_FRIEND_REQUEST,
  SEND_FRIEND_REQUEST,
  CREATE_TEAM,
  DELETE_TEAM,
  LEAVE_TEAM,
} from '~/Graphql/Mutations';
import { useUserStore } from '~/store/user.store';
import { useAppStore } from '~/store/app.store';
import AnimatedPressable from '~/components/AnimatedPressable';

import { hud, FONT, RADIUS } from '~/components/hud';
import { avatarUri } from '~/helpers/avatarUri';
import { useUnlocks } from '~/helpers/unlocks';
import { formatDistanceToNow } from 'date-fns';

type TabType = 'friends' | 'requests' | 'discover' | 'teams';
type RequestSubTab = 'incoming' | 'outgoing';

interface FriendRequest {
  id: string;
  username: string;
  profilePic: string;
  mutualFriends?: number;
}

interface TeamMember {
  id: string;
  username: string;
  profilePic: string | null;
}

interface Team {
  id: string;
  name: string;
  memberCount: number;
  chatId: string | null;
  createdAt: string;
  owner: TeamMember;
  members: TeamMember[];
}

// ─── Shared HUD row shell ─────────────────────────────────────────────────────
// Every list row in this screen is the same crisp obsidian panel, so friends,
// requests, discover and teams read as one system.
const cardBase = (c: ReturnType<typeof hud>) =>
  ({
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.panel,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: c.panelBorder,
    padding: 14,
    marginBottom: 10,
  }) as const;

const SectionLabel = ({ text, c, top = 0 }: { text: string; c: ReturnType<typeof hud>; top?: number }) => (
  <Text
    style={{
      fontFamily: FONT.semibold,
      fontSize: 12,
      letterSpacing: 0.2,
      color: c.textFaint,
      marginTop: top,
      marginBottom: 12,
    }}>
    {text}
  </Text>
);

// Long lists shouldn't trickle in — cap the entrance stagger so row 200
// doesn't animate 8 seconds after row 1. Capped to the app-wide entrance budget
// (see helpers/motion.ts): a delayed row is a row that can't be tapped yet.
const stagger = (i: number) => Math.min(i, 5) * 30;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const FriendSkeleton = ({ isDark }: { isDark: boolean }) => {
  const c = hud(isDark);
  const opacity = useSharedValue(0.35);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // Decorative loop — hold still when the user asked for less motion.
    if (reducedMotion) return;
    opacity.value = withRepeat(
      withSequence(withTiming(0.8, { duration: 700 }), withTiming(0.35, { duration: 700 })),
      -1,
      true
    );
  }, [reducedMotion]);
  const anim = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={[cardBase(c), { padding: 14 }]}>
          <Animated.View
            style={[{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.track }, anim]}
          />
          <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
            <Animated.View
              style={[{ height: 14, borderRadius: RADIUS.xs, backgroundColor: c.track, width: '50%' }, anim]}
            />
            <Animated.View
              style={[{ height: 11, borderRadius: RADIUS.xs, backgroundColor: c.track, width: '35%' }, anim]}
            />
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
  const c = hud(isDark);

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
          borderRadius: RADIUS.sm,
          marginLeft: 6,
        }}>
        <Ionicons name="person-remove-outline" size={20} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 10, fontFamily: FONT.bold, marginTop: 3 }}>Remove</Text>
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
        style={cardBase(c)}>
        <View style={{ position: 'relative' }}>
          <Image
            source={{ uri: avatarUri(friend.profilePic, friend.username) }}
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.violet }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: 1,
              right: 1,
              width: 12,
              height: 12,
              borderRadius: RADIUS.sm,
              backgroundColor: friend.isOnline ? '#10b981' : c.textFaint,
              borderWidth: 2,
              borderColor: c.panel,
            }}
          />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 15, fontFamily: FONT.bold, color: c.text }}>
            {friend.username}
          </Text>
          <Text style={{ fontSize: 12, fontFamily: FONT.regular, color: friend.isOnline ? '#10b981' : c.textDim, marginTop: 2 }}>
            {friend.isOnline
              ? 'Online now'
              : lastActiveText
                ? `Active ${lastActiveText}`
                : friend.email}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.textFaint} />
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
  processing,
}: {
  request: FriendRequest;
  isDark: boolean;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  processing: boolean;
}) => {
  const c = hud(isDark);
  return (
    <Animated.View entering={FadeInDown.duration(300)} style={cardBase(c)}>
      <Image
        source={{ uri: avatarUri(request.profilePic, request.username) }}
        style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.violet }}
      />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontSize: 15, fontFamily: FONT.bold, color: c.text }}>
          {request.username}
        </Text>
        {(request.mutualFriends ?? 0) > 0 && (
          <Text style={{ fontSize: 12, fontFamily: FONT.regular, color: c.textDim, marginTop: 2 }}>
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
            borderRadius: RADIUS.sm,
            backgroundColor: 'rgba(239,68,68,0.14)',
            borderWidth: 1,
            borderColor: 'rgba(239,68,68,0.28)',
            alignItems: 'center',
            justifyContent: 'center',
          }} accessibilityLabel="Close">
          <Ionicons name="close" size={18} color="#ef4444" />
        </AnimatedPressable>
        <AnimatedPressable
          onPress={() => !processing && onAccept(request.id)}
          scaleDown={0.92}
          style={{
            width: 36,
            height: 36,
            borderRadius: RADIUS.sm,
            backgroundColor: 'rgba(16,185,129,0.14)',
            borderWidth: 1,
            borderColor: 'rgba(16,185,129,0.30)',
            alignItems: 'center',
            justifyContent: 'center',
          }} accessibilityLabel="Confirm">
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
  onAction: (id: string, user: FriendRequest) => void;
  loading: boolean;
  onPress?: () => void;
  disabled?: boolean;
}) => {
  const c = hud(isDark);
  return (
    <AnimatedPressable scaleDown={0.98} onPress={onPress} style={cardBase(c)}>
      <Image
        source={{ uri: avatarUri(user.profilePic, user.username) }}
        style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.violet }}
      />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontSize: 15, fontFamily: FONT.bold, color: c.text }}>{user.username}</Text>
        {(user.mutualFriends ?? 0) > 0 && (
          <Text style={{ fontSize: 12, fontFamily: FONT.regular, color: c.textDim, marginTop: 2 }}>
            {user.mutualFriends} mutual
          </Text>
        )}
      </View>
      <AnimatedPressable
        onPress={() => onAction(user.id, user)}
        scaleDown={0.9}
        disabled={disabled || loading}
        style={{
          paddingHorizontal: 16,
          paddingVertical: 9,
          borderRadius: RADIUS.sm,
          backgroundColor: disabled ? c.track : actionColor,
          minWidth: 76,
          alignItems: 'center',
        }}>
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={{ fontSize: 13, fontFamily: FONT.bold, color: disabled ? c.textDim : '#fff' }}>
            {disabled ? 'Sent' : actionLabel}
          </Text>
        )}
      </AnimatedPressable>
    </AnimatedPressable>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState = ({ icon, text, isDark }: { icon: string; text: string; isDark: boolean }) => {
  const c = hud(isDark);
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: RADIUS.sm,
          borderWidth: 1,
          borderColor: c.panelBorder,
          backgroundColor: c.panel,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ rotate: '45deg' }],
        }}>
        <View style={{ transform: [{ rotate: '-45deg' }] }}>
          <Ionicons name={icon as any} size={26} color={c.textFaint} />
        </View>
      </View>
      <Text
        style={{
          marginTop: 20,
          fontSize: 14,
          lineHeight: 21,
          fontFamily: FONT.regular,
          color: c.textDim,
          textAlign: 'center',
        }}>
        {text}
      </Text>
    </View>
  );
};

// ─── Team Card ────────────────────────────────────────────────────────────────

const TeamCard = ({
  team,
  isDark,
  currentUserId,
  onPress,
  onChat,
  onLeave,
  onDelete,
}: {
  team: Team;
  isDark: boolean;
  currentUserId: string;
  onPress: () => void;
  onChat: () => void;
  onLeave: () => void;
  onDelete: () => void;
}) => {
  const c = hud(isDark);
  const isOwner = team.owner.id === currentUserId;
  const preview = team.members.slice(0, 3);
  const extra = team.memberCount - 3;

  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <AnimatedPressable
        scaleDown={0.98}
        onPress={onPress}
        style={{
          backgroundColor: c.panel,
          borderRadius: RADIUS.sm,
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: c.panelBorder,
        }}>
        {/* Top row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: RADIUS.sm,
              backgroundColor: 'rgba(139,92,246,0.14)',
              borderWidth: 1,
              borderColor: 'rgba(139,92,246,0.30)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}>
            <Ionicons name="people" size={20} color={c.violet} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontFamily: FONT.bold, color: c.text }}>{team.name}</Text>
            <Text style={{ fontSize: 12, fontFamily: FONT.regular, color: c.textDim, marginTop: 3 }}>
              {team.memberCount} member{team.memberCount !== 1 ? 's' : ''}
              {isOwner ? '  ·  Owner' : ''}
            </Text>
          </View>
          {/* action buttons */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {team.chatId && (
              <AnimatedPressable
                onPress={onChat}
                scaleDown={0.9}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: RADIUS.sm,
                  backgroundColor: 'rgba(16,185,129,0.14)',
                  borderWidth: 1,
                  borderColor: 'rgba(16,185,129,0.28)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
            accessibilityLabel="Open chat">
                <Ionicons name="chatbubble-outline" size={16} color="#10b981" />
              </AnimatedPressable>
            )}
            <AnimatedPressable
              onPress={isOwner ? onDelete : onLeave}
              scaleDown={0.9}
              style={{
                width: 34,
                height: 34,
                borderRadius: RADIUS.sm,
                backgroundColor: 'rgba(239,68,68,0.12)',
                borderWidth: 1,
                borderColor: 'rgba(239,68,68,0.26)',
                alignItems: 'center',
                justifyContent: 'center',
              }} accessibilityRole="button" accessibilityLabel={isOwner ? 'Delete' : 'Leave'}>
              <Ionicons
                name={isOwner ? 'trash-outline' : 'exit-outline'}
                size={16}
                color="#ef4444"
              />
            </AnimatedPressable>
          </View>
        </View>

        {/* Members avatars */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {preview.map((m, i) => (
            <View
              key={m.id}
              style={{
                marginLeft: i > 0 ? -10 : 0,
                borderWidth: 2,
                borderColor: c.panel,
                borderRadius: 13,
                zIndex: 3 - i,
              }}>
              <Image
                source={{ uri: avatarUri(m.profilePic, m.username) }}
                style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.violet }}
              />
            </View>
          ))}
          {extra > 0 && (
            <View
              style={{
                marginLeft: -10,
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: c.track,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: c.panel,
              }}>
              <Text style={{ fontSize: 9, fontFamily: FONT.mono, color: c.textDim }}>+{extra}</Text>
            </View>
          )}
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
};

// ─── Create Team Modal ────────────────────────────────────────────────────────

const CreateTeamModal = ({
  visible,
  isDark,
  friends,
  onClose,
  onCreate,
  loading,
}: {
  visible: boolean;
  isDark: boolean;
  friends: Friend[];
  onClose: () => void;
  onCreate: (name: string, memberIds: string[]) => void;
  loading: boolean;
}) => {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const c = hud(isDark);

  const filtered = friends.filter(
    (f) =>
      f.username.toLowerCase().includes(search.toLowerCase()) ||
      f.email?.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim(), [...selected]);
  };

  // Reset on open
  useEffect(() => {
    if (visible) {
      setName('');
      setSelected(new Set());
      setSearch('');
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 18,
            borderBottomWidth: 1,
            borderBottomColor: c.panelBorder,
          }}>
          <AnimatedPressable onPress={onClose} scaleDown={0.9}
            accessibilityLabel="Close">
            <Ionicons name="close" size={22} color={c.textDim} />
          </AnimatedPressable>
          <Text style={{ fontSize: 16, fontFamily: FONT.bold, color: c.text }}>Create Team</Text>
          <AnimatedPressable
            onPress={handleCreate}
            scaleDown={0.92}
            disabled={loading || !name.trim()}
            style={{
              backgroundColor: name.trim() ? c.violet : c.track,
              paddingHorizontal: 16,
              paddingVertical: 9,
              borderRadius: RADIUS.sm,
            }}>
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={{ color: name.trim() ? '#fff' : c.textDim, fontFamily: FONT.bold, fontSize: 14 }}>
                Create
              </Text>
            )}
          </AnimatedPressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
          {/* Team name */}
          <SectionLabel text="Team name" c={c} />
          <View
            style={{
              backgroundColor: c.bgElev,
              borderRadius: RADIUS.sm,
              paddingHorizontal: 16,
              paddingVertical: 14,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: c.panelBorder,
            }}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Study Squad, Dev Team…"
              placeholderTextColor={c.textFaint}
              style={{ fontSize: 16, fontFamily: FONT.regular, color: c.text }}
              autoFocus
              maxLength={50}
            />
          </View>

          {/* Member selection */}
          <SectionLabel
            text={`Add members ${selected.size > 0 ? `(${selected.size} selected)` : ''}`}
            c={c}
          />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: c.bgElev,
              borderRadius: RADIUS.sm,
              paddingHorizontal: 12,
              paddingVertical: 10,
              marginBottom: 14,
              borderWidth: 1,
              borderColor: c.panelBorder,
            }}>
            <Ionicons name="search" size={16} color={c.textFaint} style={{ marginRight: 8 }} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search friends…"
              placeholderTextColor={c.textFaint}
              style={{ flex: 1, fontSize: 14, fontFamily: FONT.regular, color: c.text }}
              autoCorrect={false}
            />
          </View>

          {filtered.length === 0 ? (
            <Text
              style={{
                textAlign: 'center',
                fontFamily: FONT.regular,
                color: c.textDim,
                marginTop: 20,
              }}>
              No friends to add
            </Text>
          ) : (
            filtered.map((f) => {
              const checked = selected.has(f.id);
              return (
                <AnimatedPressable
                  key={f.id}
                  scaleDown={0.97}
                  onPress={() => toggle(f.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: checked ? 'rgba(139,92,246,0.12)' : c.panel,
                    borderRadius: RADIUS.sm,
                    padding: 12,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: checked ? c.violet : c.panelBorder,
                  }}>
                  <Image
                    source={{ uri: avatarUri(f.profilePic, f.username) }}
                    style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.violet }}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontSize: 14, fontFamily: FONT.semibold, color: c.text }}>
                      {f.username}
                    </Text>
                    {f.email && (
                      <Text style={{ fontSize: 12, fontFamily: FONT.regular, color: c.textDim }}>
                        {f.email}
                      </Text>
                    )}
                  </View>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: RADIUS.xs,
                      borderWidth: 2,
                      borderColor: checked ? c.violet : c.track,
                      backgroundColor: checked ? c.violet : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    {checked && <Ionicons name="checkmark" size={13} color="#fff" />}
                  </View>
                </AnimatedPressable>
              );
            })
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const Friends = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const unlocks = useUnlocks();
  const c = hud(isDark);
  const { user } = useUserStore();
  const { addAlert } = useAppStore();
  const currentUserId = user?.id ?? '';

  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [requestSubTab, setRequestSubTab] = useState<RequestSubTab>('incoming');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);

  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [suggestions, setSuggestions] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<FriendRequest[]>([]);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [loadingAddId, setLoadingAddId] = useState<string | null>(null);

  // Confirm modals
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmTeamAction, setConfirmTeamAction] = useState<{
    teamId: string;
    action: 'delete' | 'leave';
    name: string;
  } | null>(null);

  const { friends, setFriends } = useFriendsStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mutations
  const [unfriend] = useMutation(UNFRIEND);
  const [blockUser] = useMutation(BLOCK_USER);
  const [acceptFriendRequest] = useMutation(ACCEPT_FRIEND_REQUEST);
  const [rejectFriendRequest] = useMutation(REJECT_FRIEND_REQUEST);
  const [cancelFriendRequest] = useMutation(CANCEL_FRIEND_REQUEST);
  const [sendFriendRequest] = useMutation(SEND_FRIEND_REQUEST);
  const [createTeamMut, { loading: creatingTeam }] = useMutation(CREATE_TEAM);
  const [deleteTeamMut] = useMutation(DELETE_TEAM);
  const [leaveTeamMut] = useMutation(LEAVE_TEAM);

  // Queries
  const {
    data: friendsData,
    loading: friendsLoading,
    refetch: refetchFriends,
  } = useQuery(GET_FRIENDS, {
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
  const { refetch: refetchTeams } = useQuery(MY_TEAMS, {
    fetchPolicy: 'cache-and-network',
    onCompleted: (data) => {
      if (data?.myTeams?.success) setTeams(data.myTeams.teams || []);
    },
  });

  const [searchUsers, { loading: searchLoading }] = useLazyQuery(SEARCH_USERS);

  // Same variables as Home's RankCard and /leaderboard, so all three share one
  // normalized cache entry — this banner costs no extra network round-trip.
  const { data: boardData } = useQuery(GET_LEADERBOARD, {
    variables: { scope: 'friends', limit: 50 },
    fetchPolicy: 'cache-first',
  });
  const myRank: number | null = boardData?.getLeaderboard?.myRank ?? null;

  useEffect(() => {
    if (friendsData?.getFriends?.success) {
      setFriends(friendsData.getFriends.friends);
    }
  }, [friendsData]);

  function applyRequests(data: any) {
    if (data?.getPendingRequests?.success) {
      setIncomingRequests(
        (data.getPendingRequests.incoming || []).map((u: any) => ({
          id: u.id,
          username: u.username,
          profilePic: u.profilePic,
        }))
      );
      setOutgoingRequests(
        (data.getPendingRequests.outgoing || []).map((u: any) => ({
          id: u.id,
          username: u.username,
          profilePic: u.profilePic,
        }))
      );
    }
  }

  function applySuggestions(data: any) {
    if (data?.getFriendSuggestions?.success) {
      setSuggestions(
        (data.getFriendSuggestions.suggestions || []).map((u: any) => ({
          id: u.id,
          username: u.username,
          profilePic: u.profilePic,
          mutualFriends: u.mutualFriends || 0,
        }))
      );
    }
  }

  // Debounced server search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await searchUsers({ variables: { query: searchQuery.trim() } });
        if (data?.searchUsers?.success) {
          setSearchResults(
            (data.searchUsers.users || []).map((u: any) => ({
              id: u.id,
              username: u.username,
              profilePic: u.profilePic,
              mutualFriends: u.mutualFriends || 0,
            }))
          );
        }
      } catch {
        /* silent */
      }
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const [result] = await Promise.all([
      refetchFriends(),
      refetchRequests().then((r) => applyRequests(r.data)),
      refetchSuggestions().then((r) => applySuggestions(r.data)),
      refetchTeams().then((r) => {
        if (r.data?.myTeams?.success) setTeams(r.data.myTeams.teams || []);
      }),
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
        setIncomingRequests((p) => p.filter((r) => r.id !== id));
        refetchFriends().then((r) => {
          if (r.data?.getFriends?.success) setFriends(r.data.getFriends.friends);
        });
        addAlert({ type: 'success', str: 'Friend request accepted!' });
      } else {
        addAlert({ type: 'error', str: data?.acceptFriendRequest?.message || 'Failed' });
      }
    } catch {
      addAlert({ type: 'error', str: 'Something went wrong' });
    } finally {
      setProcessingId(null);
    }
  }, []);

  const handleDecline = useCallback(async (id: string) => {
    try {
      const { data } = await rejectFriendRequest({ variables: { friendId: id } });
      if (data?.rejectFriendRequest?.success) {
        setIncomingRequests((p) => p.filter((r) => r.id !== id));
        addAlert({ type: 'success', str: 'Request declined' });
      }
    } catch {
      /* silent */
    }
  }, []);

  const handleCancel = useCallback(async (id: string) => {
    try {
      const { data } = await cancelFriendRequest({ variables: { friendId: id } });
      if (data?.cancelFriendRequest?.success) {
        setOutgoingRequests((p) => p.filter((r) => r.id !== id));
        addAlert({ type: 'success', str: 'Request cancelled' });
      }
    } catch {
      /* silent */
    }
  }, []);

  const handleUnfriend = useCallback(
    async (friendId: string) => {
      try {
        const { data } = await unfriend({ variables: { friendId } });
        if (data?.unfriend?.success) {
          setFriends(friends.filter((f) => f.id !== friendId));
          addAlert({ type: 'success', str: 'Friend removed' });
        }
      } catch {
        addAlert({ type: 'error', str: 'Failed to remove friend' });
      } finally {
        setConfirmRemoveId(null);
      }
    },
    [friends]
  );

  const handleSend = useCallback(async (userId: string, userObj?: FriendRequest) => {
    setLoadingAddId(userId);
    try {
      const { data } = await sendFriendRequest({ variables: { friendId: userId } });
      if (data?.sendFriendRequest?.success) {
        setSentIds((p) => new Set(p).add(userId));
        // Instantly move user from discover/search to outgoing requests list
        if (userObj) {
          setOutgoingRequests((prev) => [userObj, ...prev]);
          setSuggestions((prev) => prev.filter((s) => s.id !== userId));
          setSearchResults((prev) => prev.filter((s) => s.id !== userId));
        }
        addAlert({ type: 'success', str: 'Friend request sent!' });
      } else {
        addAlert({ type: 'error', str: data?.sendFriendRequest?.message || 'Failed' });
      }
    } catch {
      addAlert({ type: 'error', str: 'Something went wrong' });
    } finally {
      setLoadingAddId(null);
    }
  }, []);

  // Team actions
  const handleCreateTeam = useCallback(async (name: string, memberIds: string[]) => {
    try {
      const { data } = await createTeamMut({ variables: { name, memberIds } });
      if (data?.createTeam?.success) {
        setTeams((prev) => [data.createTeam.team, ...prev]);
        setShowCreateTeam(false);
        addAlert({ type: 'success', str: 'Team created!' + ' - ' + data.createTeam.team.name });
      } else {
        addAlert({ type: 'error', str: data?.createTeam?.message || 'Failed' });
      }
    } catch {
      addAlert({ type: 'error', str: 'Something went wrong' });
    }
  }, []);

  const handleTeamConfirm = useCallback(async () => {
    if (!confirmTeamAction) return;
    const { teamId, action } = confirmTeamAction;
    try {
      if (action === 'delete') {
        const { data } = await deleteTeamMut({ variables: { teamId } });
        if (data?.deleteTeam?.success) {
          setTeams((prev) => prev.filter((t) => t.id !== teamId));
          addAlert({ type: 'success', str: 'Team deleted' });
        }
      } else {
        const { data } = await leaveTeamMut({ variables: { teamId } });
        if (data?.leaveTeam?.success) {
          setTeams((prev) => prev.filter((t) => t.id !== teamId));
          addAlert({ type: 'success', str: 'Left team' });
        }
      }
    } catch {
      addAlert({ type: 'error', str: 'Something went wrong' });
    } finally {
      setConfirmTeamAction(null);
    }
  }, [confirmTeamAction]);

  // Derived lists
  const isSearching = searchQuery.trim().length > 0;
  const localFiltered = isSearching
    ? friends.filter(
        (f) =>
          f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : friends;
  const serverResults = searchResults.filter((u) => !friends.some((f) => f.id === u.id));
  const filteredSuggestions = suggestions.filter((s) => !friends.some((f) => f.id === s.id));

  const TABS: { key: TabType; label: string; badge?: number }[] = [
    { key: 'friends', label: 'Friends' },
    { key: 'requests', label: 'Requests', badge: incomingRequests.length },
    { key: 'discover', label: 'Discover' },
    { key: 'teams', label: 'Teams', badge: teams.length },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 14,
        }}>
        <View>
          <Text style={{ fontFamily: FONT.semibold, fontSize: 12, letterSpacing: 0.2, color: c.textFaint, marginBottom: 2 }}>
            Your party
          </Text>
          <Text style={{ fontSize: 24, fontFamily: FONT.extrabold, color: c.text, letterSpacing: -0.5 }}>
            Friends
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {activeTab === 'teams' && (
            <AnimatedPressable
              onPress={() => setShowCreateTeam(true)}
              scaleDown={0.92}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: c.violet,
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: RADIUS.sm,
              }}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={{ color: '#fff', fontFamily: FONT.bold, fontSize: 13 }}>New team</Text>
            </AnimatedPressable>
          )}
        </View>
      </View>

      {/* Leaderboard — a labelled row, not an unlabelled trophy icon nobody tapped.
          Hidden until there's someone on it: an empty board is worse than no
          board. See helpers/unlocks.ts. */}
      {unlocks.leaderboard && (
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <AnimatedPressable
          onPress={() => router.push('/(screens)/leaderboard')}
          scaleDown={0.98}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(139,92,246,0.10)',
            borderWidth: 1,
            borderColor: 'rgba(139,92,246,0.28)',
            borderRadius: RADIUS.md,
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}>
          <Text style={{ fontSize: 18, marginRight: 10 }}>🏆</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontFamily: FONT.semibold, color: c.text }}>Leaderboard</Text>
            <Text style={{ fontSize: 12, fontFamily: FONT.regular, color: c.textDim, marginTop: 1 }}>
              {myRank ? `You're #${myRank} among friends` : 'See how you rank against friends'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.violet} />
        </AnimatedPressable>
      </View>
      )}

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: c.bgElev,
            borderRadius: RADIUS.sm,
            paddingHorizontal: 14,
            paddingVertical: 11,
            borderWidth: 1,
            borderColor: c.panelBorder,
          }}>
          {searchLoading ? (
            <ActivityIndicator size="small" color={c.violet} style={{ marginRight: 10 }} />
          ) : (
            <Ionicons name="search" size={18} color={c.textFaint} style={{ marginRight: 10 }} />
          )}
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search friends or find new people…"
            placeholderTextColor={c.textFaint}
            style={{ flex: 1, fontSize: 15, fontFamily: FONT.regular, color: c.text }}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <AnimatedPressable onPress={() => setSearchQuery('')} hitSlop={12} scaleDown={0.85} accessibilityLabel="Clear">
              <Ionicons name="close-circle" size={18} color={c.textFaint} />
            </AnimatedPressable>
          )}
        </View>
      </View>

      {/* Tabs — hidden when actively searching */}
      {!isSearching && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 14, gap: 8 }}
          style={{ flexGrow: 0 }}>
          {TABS.map(({ key, label, badge }) => {
            const active = activeTab === key;
            return (
              <AnimatedPressable
                key={key}
                onPress={() => setActiveTab(key)}
                scaleDown={0.95}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 9,
                  paddingHorizontal: 14,
                  borderRadius: RADIUS.pill,
                  backgroundColor: active ? 'rgba(139,92,246,0.16)' : c.bgElev,
                  borderWidth: 1,
                  borderColor: active ? 'rgba(139,92,246,0.45)' : c.panelBorder,
                }}>
                <Text style={{ fontSize: 13, fontFamily: FONT.semibold, color: active ? c.violet : c.textDim }}>
                  {label}
                </Text>
                {!!badge && badge > 0 && (
                  <View
                    style={{
                      backgroundColor: active ? c.violet : '#ef4444',
                      borderRadius: RADIUS.pill,
                      minWidth: 16,
                      height: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 4,
                    }}>
                    <Text style={{ color: '#fff', fontSize: 9, fontFamily: FONT.mono }}>{badge}</Text>
                  </View>
                )}
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.violet}
            colors={[c.violet]}
          />
        }>
        {/* ── Search results ── */}
        {isSearching ? (
          <>
            {localFiltered.length > 0 && (
              <>
                <SectionLabel text="Your friends" c={c} />
                {localFiltered.map((f) => (
                  <FriendCard
                    key={f.id}
                    friend={f}
                    isDark={isDark}
                    onMenuPress={(fr) => setConfirmRemoveId(fr.id)}
                  />
                ))}
              </>
            )}
            {searchQuery.trim().length >= 3 && (
              <>
                {serverResults.length > 0 && (
                  <>
                    <SectionLabel text="Add people" c={c} top={12} />
                    {serverResults.map((u) => (
                      <UserRow
                        key={u.id}
                        user={u}
                        isDark={isDark}
                        actionLabel="Add"
                        actionColor={c.violet}
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
              <EmptyState
                icon="search-outline"
                text="Type at least 3 characters to search"
                isDark={isDark}
              />
            )}
          </>
        ) : activeTab === 'friends' ? (
          <>
            {friendsLoading && friends.length === 0 ? (
              <FriendSkeleton isDark={isDark} />
            ) : friends.length === 0 ? (
              <EmptyState
                icon="people-outline"
                text={'No friends yet\nDiscover people in the Discover tab'}
                isDark={isDark}
              />
            ) : (
              friends.map((f, i) => (
                <Animated.View key={f.id} entering={FadeInDown.delay(stagger(i)).duration(260)}>
                  <FriendCard
                    friend={f}
                    isDark={isDark}
                    onMenuPress={(fr) => setConfirmRemoveId(fr.id)}
                  />
                </Animated.View>
              ))
            )}
          </>
        ) : activeTab === 'requests' ? (
          <>
            {/* Sub-tabs */}
            <View
              style={{
                flexDirection: 'row',
                gap: 16,
                marginBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: c.panelBorder,
              }}>
              {(['incoming', 'outgoing'] as const).map((sub) => {
                const count =
                  sub === 'incoming' ? incomingRequests.length : outgoingRequests.length;
                const active = requestSubTab === sub;
                return (
                  <AnimatedPressable
                    key={sub}
                    scaleDown={0.95}
                    onPress={() => setRequestSubTab(sub)}
                    style={{
                      alignItems: 'center',
                      paddingVertical: 10,
                      paddingHorizontal: 8,
                      borderBottomWidth: 2,
                      borderBottomColor: active ? c.violet : 'transparent',
                    }}>
                    <Text style={{ fontSize: 14, fontFamily: FONT.semibold, color: active ? c.violet : c.textDim }}>
                      {sub === 'incoming' ? 'Incoming' : 'Sent'} {count > 0 ? `(${count})` : ''}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>

            {requestSubTab === 'incoming' ? (
              incomingRequests.length > 0 ? (
                incomingRequests.map((r) => (
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
            ) : outgoingRequests.length > 0 ? (
              outgoingRequests.map((r) => (
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
            )}
          </>
        ) : activeTab === 'teams' ? (
          /* ── Teams tab ── */
          teams.length === 0 ? (
            <View style={{ alignItems: 'center' }}>
              <EmptyState
                icon="people-circle-outline"
                text={'No teams yet\nCreate one to work with friends'}
                isDark={isDark}
              />
              <AnimatedPressable
                onPress={() => setShowCreateTeam(true)}
                scaleDown={0.94}
                style={{
                  marginTop: -24,
                  backgroundColor: c.violet,
                  paddingHorizontal: 24,
                  paddingVertical: 13,
                  borderRadius: RADIUS.sm,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontFamily: FONT.bold, fontSize: 15 }}>Create team</Text>
              </AnimatedPressable>
            </View>
          ) : (
            <>
              {teams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  isDark={isDark}
                  currentUserId={currentUserId}
                  onPress={() =>
                    router.push({ pathname: '/team-detail', params: { teamId: team.id } })
                  }
                  onChat={() => team.chatId && router.push(`/shard/${team.chatId}/chat` as any)}
                  onLeave={() =>
                    setConfirmTeamAction({ teamId: team.id, action: 'leave', name: team.name })
                  }
                  onDelete={() =>
                    setConfirmTeamAction({ teamId: team.id, action: 'delete', name: team.name })
                  }
                />
              ))}
            </>
          )
        ) : /* Discover */
        filteredSuggestions.length > 0 ? (
          <>
            <SectionLabel text="People you may know" c={c} />
            {filteredSuggestions.map((s, i) => (
              <Animated.View key={s.id} entering={FadeInDown.delay(stagger(i)).duration(260)}>
                <UserRow
                  user={s}
                  isDark={isDark}
                  actionLabel="Add"
                  actionColor={c.violet}
                  onAction={handleSend}
                  loading={loadingAddId === s.id}
                  disabled={sentIds.has(s.id)}
                />
              </Animated.View>
            ))}
          </>
        ) : (
          <EmptyState
            icon="compass-outline"
            text={'No suggestions right now\nAdd friends to get recommendations'}
            isDark={isDark}
          />
        )}
      </ScrollView>

      {/* Remove confirmation */}
      <ConfirmModal
        visible={!!confirmRemoveId}
        onClose={() => setConfirmRemoveId(null)}
        onConfirm={() => confirmRemoveId && handleUnfriend(confirmRemoveId)}
        title="Remove Friend?"
        message={`Remove ${friends.find((f) => f.id === confirmRemoveId)?.username ?? ''} from your friends?`}
        confirmLabel="Remove"
        icon="person-remove-outline"
        destructive
      />

      {/* Team action confirmation */}
      <ConfirmModal
        visible={!!confirmTeamAction}
        onClose={() => setConfirmTeamAction(null)}
        onConfirm={handleTeamConfirm}
        title={confirmTeamAction?.action === 'delete' ? 'Delete Team?' : 'Leave Team?'}
        message={
          confirmTeamAction?.action === 'delete'
            ? `Delete "${confirmTeamAction?.name}"? This will also delete the team chat.`
            : `Leave "${confirmTeamAction?.name}"?`
        }
        confirmLabel={confirmTeamAction?.action === 'delete' ? 'Delete' : 'Leave'}
        icon={confirmTeamAction?.action === 'delete' ? 'trash-outline' : 'exit-outline'}
        destructive
      />

      {/* Create Team Sheet */}
      <CreateTeamModal
        visible={showCreateTeam}
        isDark={isDark}
        friends={friends}
        onClose={() => setShowCreateTeam(false)}
        onCreate={handleCreateTeam}
        loading={creatingTeam}
      />
    </SafeAreaView>
  );
};

export default Friends;
