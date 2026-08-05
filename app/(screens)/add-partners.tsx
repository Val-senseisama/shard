import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Image,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client';
import Animated, { FadeIn, FadeInDown, FadeOutRight } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { GET_FRIENDS, GET_SHARD, SEARCH_USERS } from '~/Graphql/Queries';
import { ADD_SHARD_PARTICIPANT } from '~/Graphql/Mutations';
import { ACCENT, t } from '~/components/shard/constants';
import AnimatedPressable from '~/components/AnimatedPressable';
import { avatarUri } from '~/helpers/avatarUri';
import { useFriendsStore } from '~/store/friends.store';

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'collaborator' | 'accountability';

interface Candidate {
  id: string;
  username: string;
  profilePic: string;
  mutualFriends?: number;
}

interface Selected extends Candidate {
  role: Role;
}

// ─── Role chip ────────────────────────────────────────────────────────────────

const ROLE_META: Record<Role, { label: string; color: string; icon: string }> = {
  collaborator: { label: 'Collaborator', color: '#8b5cf6', icon: 'people' },
  accountability: { label: 'Accountability', color: '#f59e0b', icon: 'shield-checkmark' },
};

const RoleToggle = ({
  role,
  onToggle,
  isDark,
}: {
  role: Role;
  onToggle: () => void;
  isDark: boolean;
}) => {
  const meta = ROLE_META[role];
  return (
    <AnimatedPressable
      onPress={onToggle}
      scaleDown={0.9}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: `${meta.color}20`,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: `${meta.color}40`,
      }}>
      <Ionicons name={meta.icon as any} size={11} color={meta.color} />
      <Text style={{ fontSize: 10, fontWeight: '700', color: meta.color }}>
        {role === 'collaborator' ? 'Collab' : 'Acct.'}
      </Text>
      <Ionicons name="swap-horizontal" size={9} color={meta.color} />
    </AnimatedPressable>
  );
};

// ─── Selected chip ────────────────────────────────────────────────────────────

const SelectedChip = ({
  user,
  onRemove,
  onToggleRole,
  isDark,
}: {
  user: Selected;
  onRemove: (id: string) => void;
  onToggleRole: (id: string) => void;
  isDark: boolean;
}) => (
  <Animated.View
    entering={FadeIn.duration(200)}
    exiting={FadeOutRight.duration(180)}
    style={{ alignItems: 'center', width: 76, marginRight: 12 }}>
    <View style={{ position: 'relative' }}>
      <Image
        source={{ uri: avatarUri(user.profilePic, user.username) }}
        style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: ACCENT, borderWidth: 2, borderColor: ROLE_META[user.role].color }}
      />
      <AnimatedPressable
        onPress={() => onRemove(user.id)}
        scaleDown={0.85}
        style={{
          position: 'absolute', top: -4, right: -4,
          width: 20, height: 20, borderRadius: 10,
          backgroundColor: '#ef4444',
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 2, borderColor: isDark ? '#0f0f0f' : '#fff',
        }} accessibilityLabel="Close">
        <Ionicons name="close" size={11} color="#fff" />
      </AnimatedPressable>
    </View>
    <Text
      style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#fff' : '#1a1a1a', marginTop: 6, textAlign: 'center' }}
      numberOfLines={1}>
      {user.username}
    </Text>
    <View style={{ marginTop: 4 }}>
      <RoleToggle role={user.role} onToggle={() => onToggleRole(user.id)} isDark={isDark} />
    </View>
  </Animated.View>
);

// ─── Candidate row ────────────────────────────────────────────────────────────

const CandidateRow = ({
  user,
  isDark,
  isSelected,
  isExisting,
  onAdd,
}: {
  user: Candidate;
  isDark: boolean;
  isSelected: boolean;
  isExisting: boolean;
  onAdd: (user: Candidate) => void;
}) => {
  const theme = t(isDark);
  const disabled = isSelected || isExisting;

  return (
    <Animated.View
      entering={FadeInDown.duration(250)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.card,
        borderRadius: 14,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: isSelected
          ? `${ACCENT}40`
          : isDark ? theme.border : 'rgba(0,0,0,0.05)',
      }}>
      <Image
        source={{ uri: avatarUri(user.profilePic, user.username) }}
        style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: ACCENT }}
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
        onPress={() => !disabled && onAdd(user)}
        scaleDown={0.88}
        disabled={disabled}
        style={{
          width: 36, height: 36, borderRadius: 18,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: isExisting
            ? isDark ? '#1a1a1a' : '#f3f4f6'
            : isSelected
              ? `${ACCENT}20`
              : ACCENT,
        }} accessibilityLabel="Confirm">
        {isExisting ? (
          <Ionicons name="checkmark-circle" size={20} color={isDark ? '#4b5563' : '#9ca3af'} />
        ) : isSelected ? (
          <Ionicons name="checkmark-circle" size={20} color={ACCENT} />
        ) : (
          <Ionicons name="add" size={20} color="#fff" />
        )}
      </AnimatedPressable>
    </Animated.View>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const AddPartners = () => {
  const { shardId } = useLocalSearchParams<{ shardId: string }>();
  const isDark = useColorScheme() === 'dark';
  const theme = t(isDark);

  const [selected, setSelected] = useState<Selected[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Candidate[]>([]);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { friends, setFriends } = useFriendsStore();

  // Fetch friends list
  const { data: friendsData, loading: friendsLoading } = useQuery(GET_FRIENDS, {
    fetchPolicy: 'cache-and-network',
  });
  useEffect(() => {
    if (friendsData?.getFriends?.success) {
      setFriends(friendsData.getFriends.friends);
    }
  }, [friendsData]);

  // Fetch current shard participants to disable already-added ones
  const { data: shardData } = useQuery(GET_SHARD, {
    variables: { id: shardId },
    skip: !shardId,
    fetchPolicy: 'cache-and-network',
  });
  const existingParticipantIds = useMemo<Set<string>>(() => {
    const participants = shardData?.getShard?.shard?.participants || [];
    return new Set(participants.map((p: any) => p.user));
  }, [shardData]);

  // Server search for non-friends
  const [searchUsers, { loading: searchLoading }] = useLazyQuery(SEARCH_USERS);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
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
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  const [addShardParticipant] = useMutation(ADD_SHARD_PARTICIPANT);

  const handleAdd = useCallback((user: Candidate) => {
    setSelected(prev => {
      if (prev.some(s => s.id === user.id)) return prev;
      return [...prev, { ...user, role: 'collaborator' }];
    });
  }, []);

  const handleRemove = useCallback((id: string) => {
    setSelected(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleToggleRole = useCallback((id: string) => {
    setSelected(prev =>
      prev.map(s =>
        s.id === id
          ? { ...s, role: s.role === 'collaborator' ? 'accountability' : 'collaborator' }
          : s
      )
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (!shardId) { Toast.show({ type: 'error', text1: 'No shard selected' }); return; }
    if (selected.length === 0) { Toast.show({ type: 'error', text1: 'Select at least one partner' }); return; }

    setSaving(true);
    try {
      const results = await Promise.all(
        selected.map(u =>
          addShardParticipant({ variables: { shardId, userId: u.id, role: u.role } })
        )
      );
      const failed = results.filter(r => !r.data?.addShardParticipant?.success);
      if (failed.length === 0) {
        Toast.show({ type: 'success', text1: `Added ${selected.length} partner${selected.length > 1 ? 's' : ''}!` });
        router.replace(`/(screens)/shard/${shardId}`);
      } else {
        Toast.show({ type: 'error', text1: `${selected.length - failed.length} added, ${failed.length} failed` });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to add partners' });
    } finally {
      setSaving(false);
    }
  }, [selected, shardId]);

  // Friend list filtered by search (client-side)
  const filteredFriends = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return friends.filter(f =>
      f.username.toLowerCase().includes(q) || f.email?.toLowerCase().includes(q)
    );
  }, [friends, searchQuery]);

  // Non-friend server results
  const nonFriendResults = useMemo(
    () => searchResults.filter(u => !friends.some(f => f.id === u.id)),
    [searchResults, friends]
  );

  const selectedIds = useMemo(() => new Set(selected.map(s => s.id)), [selected]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
        <AnimatedPressable onPress={() => router.back()} hitSlop={20} scaleDown={0.88} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </AnimatedPressable>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: theme.text }}>
          Add Partners
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Selected chips */}
      {selected.length > 0 && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={{
            backgroundColor: isDark ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.05)',
            borderTopWidth: 1, borderBottomWidth: 1,
            borderColor: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.1)',
            paddingVertical: 14,
          }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary, letterSpacing: 0.2, marginLeft: 16, marginBottom: 12 }}>
            Selected ({selected.length}) — tap role to switch
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {selected.map(u => (
              <SelectedChip
                key={u.id}
                user={u}
                isDark={isDark}
                onRemove={handleRemove}
                onToggleRole={handleToggleRole}
              />
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* Search bar */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
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
            placeholder="Search your friends…"
            placeholderTextColor={theme.textSecondary}
            style={{ flex: 1, fontSize: 15, color: theme.text }}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <AnimatedPressable onPress={() => setSearchQuery('')} hitSlop={12} scaleDown={0.85} accessibilityLabel="Clear">
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </AnimatedPressable>
          )}
        </View>
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: 16, paddingBottom: 12 }}>
        {(['collaborator', 'accountability'] as const).map(role => {
          const m = ROLE_META[role];
          return (
            <View key={role} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name={m.icon as any} size={12} color={m.color} />
              <Text style={{ fontSize: 11, color: theme.textSecondary, fontWeight: '600' }}>{m.label}</Text>
            </View>
          );
        })}
      </View>

      {/* List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {friendsLoading && friends.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={ACCENT} />
        ) : (
          <>
            {/* Friends (filtered) */}
            {filteredFriends.length > 0 && (
              <>
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary, letterSpacing: 0.2, marginBottom: 10 }}>
                  Friends
                </Text>
                {filteredFriends.map(f => (
                  <CandidateRow
                    key={f.id}
                    user={f}
                    isDark={isDark}
                    isSelected={selectedIds.has(f.id)}
                    isExisting={existingParticipantIds.has(f.id)}
                    onAdd={handleAdd}
                  />
                ))}
              </>
            )}

            {/* Non-friend search results */}
            {nonFriendResults.length > 0 && (
              <>
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary, letterSpacing: 0.2, marginTop: 16, marginBottom: 10 }}>
                  Other Users
                </Text>
                {nonFriendResults.map(u => (
                  <CandidateRow
                    key={u.id}
                    user={u}
                    isDark={isDark}
                    isSelected={selectedIds.has(u.id)}
                    isExisting={existingParticipantIds.has(u.id)}
                    onAdd={handleAdd}
                  />
                ))}
              </>
            )}

            {/* Empty state */}
            {filteredFriends.length === 0 && nonFriendResults.length === 0 && !friendsLoading && (
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <Ionicons name="people-outline" size={52} color={isDark ? '#374151' : '#d1d5db'} />
                <Text style={{ marginTop: 12, fontSize: 15, color: theme.textSecondary, textAlign: 'center' }}>
                  {searchQuery ? 'No users found' : 'No friends yet\nAdd friends to invite them to shards'}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Save button */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28,
        backgroundColor: theme.bg,
        borderTopWidth: 1,
        borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      }}>
        <AnimatedPressable
          onPress={handleSave}
          scaleDown={0.96}
          disabled={saving || selected.length === 0}
          style={{
            backgroundColor: selected.length === 0 ? (isDark ? '#2a2a2a' : '#e5e7eb') : ACCENT,
            borderRadius: 16,
            paddingVertical: 15,
            alignItems: 'center',
            opacity: saving ? 0.7 : 1,
          }}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{
              fontSize: 16, fontWeight: '700',
              color: selected.length === 0 ? theme.textSecondary : '#fff',
            }}>
              {selected.length === 0
                ? 'Select partners to add'
                : `Add ${selected.length} Partner${selected.length > 1 ? 's' : ''}`}
            </Text>
          )}
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );
};

export default AddPartners;
