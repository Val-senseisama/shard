import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  useColorScheme,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@apollo/client';
import { GET_TEAM } from '~/Graphql/Queries';
import { UPDATE_TEAM, DELETE_TEAM, LEAVE_TEAM } from '~/Graphql/Mutations';
import { useUserStore } from '~/store/user.store';
import { useAppStore } from '~/store/app.store';
import { useFriendsStore } from '~/store/friends.store';
import AnimatedPressable from '~/components/AnimatedPressable';
import ConfirmModal from '~/components/ConfirmModal';
import { ACCENT, t } from '~/components/shard/constants';
import { avatarUri } from '~/helpers/avatarUri';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function TeamDetail() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = t(isDark);
  const { user } = useUserStore();
  const { addAlert } = useAppStore();
  const currentUserId = user?.id ?? '';
  const { friends } = useFriendsStore();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [confirmAction, setConfirmAction] = useState<'delete' | 'leave' | null>(null);
  const [addingMode, setAddingMode] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [savingName, setSavingName] = useState(false);

  const { data, loading, refetch } = useQuery(GET_TEAM, {
    variables: { teamId },
    fetchPolicy: 'cache-and-network',
  });

  const team = data?.getTeam?.team;
  const isOwner = team?.owner?.id === currentUserId;

  const [updateTeam] = useMutation(UPDATE_TEAM);
  const [deleteTeam] = useMutation(DELETE_TEAM);
  const [leaveTeam] = useMutation(LEAVE_TEAM);

  const memberIds = (team?.members || []).map((m: any) => m.id);

  // Friends not already in team
  const eligibleFriends = friends.filter((f) => !memberIds.includes(f.id));
  const filteredEligible = eligibleFriends.filter((f) =>
    f.username.toLowerCase().includes(addSearch.toLowerCase())
  );

  const handleSaveName = useCallback(async () => {
    if (!nameInput.trim() || nameInput.trim() === team?.name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      const { data: res } = await updateTeam({ variables: { teamId, name: nameInput.trim() } });
      if (res?.updateTeam?.success) {
        addAlert({ type: 'success', str: 'Team name updated' });
        refetch();
      } else {
        addAlert({ type: 'error', str: res?.updateTeam?.message || 'Failed' });
      }
    } catch {
      addAlert({ type: 'error', str: 'Something went wrong' });
    } finally {
      setSavingName(false);
      setEditingName(false);
    }
  }, [nameInput, team, teamId]);

  const handleAddMember = useCallback(
    async (friendId: string) => {
      try {
        const { data: res } = await updateTeam({ variables: { teamId, addMemberIds: [friendId] } });
        if (res?.updateTeam?.success) {
          addAlert({ type: 'success', str: 'Member added!' });
          refetch();
        } else {
          addAlert({ type: 'error', str: res?.updateTeam?.message || 'Failed to add member' });
        }
      } catch {
        addAlert({ type: 'error', str: 'Something went wrong' });
      }
    },
    [teamId]
  );

  const handleRemoveMember = useCallback(
    async (memberId: string) => {
      try {
        const { data: res } = await updateTeam({
          variables: { teamId, removeMemberIds: [memberId] },
        });
        if (res?.updateTeam?.success) {
          addAlert({ type: 'success', str: 'Member removed' });
          refetch();
        } else {
          addAlert({ type: 'error', str: res?.updateTeam?.message || 'Failed to remove member' });
        }
      } catch {
        addAlert({ type: 'error', str: 'Something went wrong' });
      }
    },
    [teamId]
  );

  const handleConfirm = useCallback(async () => {
    try {
      if (confirmAction === 'delete') {
        const { data: res } = await deleteTeam({ variables: { teamId } });
        if (res?.deleteTeam?.success) {
          addAlert({ type: 'success', str: 'Team deleted' });
          router.back();
        }
      } else if (confirmAction === 'leave') {
        const { data: res } = await leaveTeam({ variables: { teamId } });
        if (res?.leaveTeam?.success) {
          addAlert({ type: 'success', str: 'Left team' });
          router.back();
        }
      }
    } catch {
      addAlert({ type: 'error', str: 'Something went wrong' });
    } finally {
      setConfirmAction(null);
    }
  }, [confirmAction, teamId]);

  if (loading && !team) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: theme.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <ActivityIndicator color={ACCENT} size="large" />
      </SafeAreaView>
    );
  }

  if (!team) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: theme.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Text style={{ color: theme.textSecondary }}>Team not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 14,
        }}>
        <AnimatedPressable onPress={() => router.back()} scaleDown={0.9} style={{ padding: 4 }} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </AnimatedPressable>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          {editingName ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                style={{
                  flex: 1,
                  fontSize: 18,
                  fontWeight: '700',
                  color: theme.text,
                  borderBottomWidth: 2,
                  borderBottomColor: ACCENT,
                  paddingVertical: 2,
                }}
                onSubmitEditing={handleSaveName}
              />
              {savingName ? (
                <ActivityIndicator size="small" color={ACCENT} />
              ) : (
                <AnimatedPressable onPress={handleSaveName} scaleDown={0.9}
            accessibilityLabel="Confirm">
                  <Ionicons name="checkmark-circle" size={24} color={ACCENT} />
                </AnimatedPressable>
              )}
            </View>
          ) : (
            <AnimatedPressable
              onPress={() => {
                if (isOwner) {
                  setNameInput(team.name);
                  setEditingName(true);
                }
              }}
              scaleDown={0.98}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text }}>
                {team.name}
              </Text>
              {isOwner && <Ionicons name="pencil-outline" size={14} color={theme.textSecondary} />}
            </AnimatedPressable>
          )}
          <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
            {team.memberCount} member{team.memberCount !== 1 ? 's' : ''}
          </Text>
        </View>
        {/* Chat button */}
        {team.chatId && (
          <AnimatedPressable
            onPress={() => router.push(`/shard/${team.chatId}/chat` as any)}
            scaleDown={0.9}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(16,185,129,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 8,
            }} accessibilityLabel="Open chat">
            <Ionicons name="chatbubble-outline" size={20} color="#10b981" />
          </AnimatedPressable>
        )}
        {/* Delete / Leave */}
        <AnimatedPressable
          onPress={() => setConfirmAction(isOwner ? 'delete' : 'leave')}
          scaleDown={0.9}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(239,68,68,0.12)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name={isOwner ? 'trash-outline' : 'exit-outline'} size={18} color="#ef4444" />
        </AnimatedPressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}>
        {/* Members section */}
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: theme.textSecondary,
            letterSpacing: 0.2,
            marginBottom: 12,
          }}>
          Members
        </Text>

        {team.members.map((member: any, i: number) => {
          const isMe = member.id === currentUserId;
          const isTeamOwner = member.id === team.owner.id;
          return (
            <Animated.View
              key={member.id}
              entering={FadeInDown.delay(i * 30).duration(260)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.card,
                borderRadius: 16,
                padding: 14,
                marginBottom: 10,
              }}>
              <Image
                source={{ uri: avatarUri(member.profilePic, member.username) }}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: ACCENT }}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>
                  {member.username}
                  {isMe ? ' (You)' : ''}
                </Text>
                {isTeamOwner && (
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Ionicons name="shield-checkmark" size={12} color={ACCENT} />
                    <Text style={{ fontSize: 11, color: ACCENT, fontWeight: '600' }}>Owner</Text>
                  </View>
                )}
              </View>
              {/* Owner can remove others (not themselves) */}
              {isOwner && !isMe && (
                <AnimatedPressable
                  onPress={() => handleRemoveMember(member.id)}
                  scaleDown={0.9}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: 'rgba(239,68,68,0.1)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }} accessibilityLabel="Remove friend">
                  <Ionicons name="person-remove-outline" size={15} color="#ef4444" />
                </AnimatedPressable>
              )}
            </Animated.View>
          );
        })}

        {/* Add member section (owner only) */}
        {isOwner && (
          <>
            <AnimatedPressable
              onPress={() => setAddingMode(!addingMode)}
              scaleDown={0.97}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: isDark ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.25)',
                borderRadius: 14,
                paddingVertical: 14,
                marginBottom: addingMode ? 14 : 24,
              }}>
              <Ionicons
                name={addingMode ? 'chevron-up' : 'person-add-outline'}
                size={18}
                color={ACCENT}
              />
              <Text style={{ color: ACCENT, fontWeight: '600', fontSize: 13 }}>
                {addingMode ? 'Hide' : 'Add Member'}
              </Text>
            </AnimatedPressable>

            {addingMode && (
              <Animated.View entering={FadeInDown.duration(300)}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: theme.card,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: isDark ? '#2a2a2a' : 'rgba(0,0,0,0.06)',
                  }}>
                  <Ionicons
                    name="search"
                    size={16}
                    color={theme.textSecondary}
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    value={addSearch}
                    onChangeText={setAddSearch}
                    placeholder="Search friends to add…"
                    placeholderTextColor={theme.textSecondary}
                    style={{ flex: 1, fontSize: 14, color: theme.text }}
                    autoCorrect={false}
                  />
                </View>

                {filteredEligible.length === 0 ? (
                  <Text
                    style={{
                      textAlign: 'center',
                      color: theme.textSecondary,
                      paddingVertical: 16,
                      fontSize: 13,
                    }}>
                    {eligibleFriends.length === 0
                      ? 'All friends are already in this team'
                      : 'No matching friends'}
                  </Text>
                ) : (
                  filteredEligible.map((f) => (
                    <AnimatedPressable
                      key={f.id}
                      scaleDown={0.97}
                      onPress={() => handleAddMember(f.id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: theme.card,
                        borderRadius: 14,
                        padding: 12,
                        marginBottom: 8,
                      }}>
                      <Image
                        source={{ uri: avatarUri(f.profilePic, f.username) }}
                        style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: ACCENT }}
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>
                          {f.username}
                        </Text>
                        {f.email && (
                          <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                            {f.email}
                          </Text>
                        )}
                      </View>
                      <View
                        style={{
                          borderRadius: 16,
                          backgroundColor: 'rgba(139,92,246,0.12)',
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                        }}>
                        <Text style={{ color: ACCENT, fontSize: 12, fontWeight: '700' }}>Add</Text>
                      </View>
                    </AnimatedPressable>
                  ))
                )}
              </Animated.View>
            )}
          </>
        )}

        {/* Chat shortcut card */}
        {team.chatId && (
          <View style={{ marginTop: 8 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: theme.textSecondary,
                letterSpacing: 0.2,
                marginBottom: 12,
              }}>
              Team Chat
            </Text>
            <AnimatedPressable
              onPress={() => router.push(`/shard/${team.chatId}/chat` as any)}
              scaleDown={0.97}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)',
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.15)',
              }}>
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: 'rgba(16,185,129,0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                }}>
                <Ionicons name="chatbubbles" size={22} color="#10b981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>
                  Team Chat
                </Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                  Chat with all {team.memberCount} members
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </AnimatedPressable>
          </View>
        )}
      </ScrollView>

      <ConfirmModal
        visible={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        title={confirmAction === 'delete' ? 'Delete Team?' : 'Leave Team?'}
        message={
          confirmAction === 'delete'
            ? `Delete "${team.name}"? This will also delete the team chat.`
            : `Leave "${team.name}"?`
        }
        confirmLabel={confirmAction === 'delete' ? 'Delete' : 'Leave'}
        icon={confirmAction === 'delete' ? 'trash-outline' : 'exit-outline'}
        destructive
      />
    </SafeAreaView>
  );
}
