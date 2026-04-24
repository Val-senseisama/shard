import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Image,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AddImageInput from '~/components/AddImageInput';
import { useAppStore } from '~/store/app.store';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import { GET_SHARD, GET_SIGNED_UPLOAD_URL, GET_FRIENDS } from '~/Graphql/Queries';
import {
  UPDATE_SHARD,
  DELETE_SHARD,
  UPDATE_MINI_GOAL,
  DELETE_MINI_GOAL,
  ADD_MINI_GOAL,
  ADD_TASK,
  UPDATE_TASK,
  DELETE_TASK,
  REGENERATE_SHARD,
} from '~/Graphql/Mutations';
import { useFriendsStore } from '~/store/friends.store';

interface SelectedFriend {
  userId: string;
  role: 'collaborator' | 'accountability_partner';
}

interface EditingTask {
  miniGoalId: string;
  taskIndex: number;
  title: string;
}

const formatDate = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const parseDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const FALLBACK_AVATAR = 'https://ui-avatars.com/api/?background=7c3aed&color=fff&size=40&name=U';

const EditShard = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { addAlert } = useAppStore();
  const { friends, setFriends } = useFriendsStore();

  const { data: shardData, loading: shardLoading, refetch } = useQuery(GET_SHARD, {
    variables: { id },
    skip: !id,
  });

  useQuery(GET_FRIENDS, {
    onCompleted: (data) => {
      if (data?.getFriends?.success) setFriends(data.getFriends.friends);
    },
  });

  const shard = shardData?.getShard?.shard;

  // ── Shard meta state ──────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<SelectedFriend[]>([]);
  const [showParticipantSelector, setShowParticipantSelector] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ── Mini-goal state ───────────────────────────────────────────────────────
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [miniGoalEdits, setMiniGoalEdits] = useState<Record<string, { title: string; description: string }>>({});
  const [newTaskText, setNewTaskText] = useState<Record<string, string>>({});
  const [editingTask, setEditingTask] = useState<EditingTask | null>(null);
  const [showAddMiniGoal, setShowAddMiniGoal] = useState(false);
  const [newMiniGoalTitle, setNewMiniGoalTitle] = useState('');
  const [newMiniGoalDesc, setNewMiniGoalDesc] = useState('');

  const [fetchSignedUrl] = useLazyQuery(GET_SIGNED_UPLOAD_URL);
  const [updateShardMutation, { loading: saving }] = useMutation(UPDATE_SHARD);
  const [deleteShardMutation, { loading: deleting }] = useMutation(DELETE_SHARD);
  const [updateMiniGoalMutation] = useMutation(UPDATE_MINI_GOAL);
  const [deleteMiniGoalMutation] = useMutation(DELETE_MINI_GOAL);
  const [addMiniGoalMutation] = useMutation(ADD_MINI_GOAL);
  const [addTaskMutation] = useMutation(ADD_TASK);
  const [updateTaskMutation] = useMutation(UPDATE_TASK);
  const [deleteTaskMutation] = useMutation(DELETE_TASK);
  const [regenerateShardMutation, { loading: regenerating }] = useMutation(REGENERATE_SHARD);

  useEffect(() => {
    if (shard) {
      setTitle(shard.title || '');
      setDescription(shard.description || '');
      setDeadline(parseDate(shard.timeline?.endDate));
      setIsPrivate(shard.isPrivate || false);
      setIsAnonymous(shard.isAnonymous || false);
      setUploadedImageUrl(shard.image || null);
      setSelectedParticipants(
        shard.participants?.map((p: any) => ({
          userId: typeof p.user === 'object' ? p.user.id : p.user,
          role: p.role,
        })) || []
      );
    }
  }, [shard]);

  // Populate mini-goal edit state when expanded
  const toggleGoal = useCallback((goalId: string, goalTitle: string, goalDesc: string) => {
    setExpandedGoals((prev) => {
      const next = new Set(prev);
      if (next.has(goalId)) {
        next.delete(goalId);
      } else {
        next.add(goalId);
        setMiniGoalEdits((e) => ({
          ...e,
          [goalId]: { title: goalTitle, description: goalDesc || '' },
        }));
      }
      return next;
    });
  }, []);

  // ── Image upload ──────────────────────────────────────────────────────────
  const uploadImageToCloudinary = async (localUri: string) => {
    try {
      const { data } = await fetchSignedUrl();
      const uploadInfo = data?.getSignedUploadUrl;
      if (!uploadInfo?.success || !uploadInfo?.params) throw new Error('Failed to get signed upload URL');

      const { uploadUrl, params } = uploadInfo;
      const fileName = localUri.split('/').pop() || 'upload.jpg';
      const form = new FormData();
      form.append('file', { uri: localUri, name: fileName, type: 'image/jpeg' } as any);
      form.append('api_key', params.apiKey);
      form.append('timestamp', params.timestamp.toString());
      form.append('signature', params.signature);
      form.append('public_id', params.publicId);
      form.append('folder', params.folder);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: form,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = await response.json();
      if (result.secure_url) {
        setUploadedImageUrl(result.secure_url);
        return result.secure_url;
      }
      throw new Error('Upload failed');
    } catch (e: any) {
      addAlert({ str: `Image upload failed: ${e.message}`, type: 'error' });
      return null;
    }
  };

  // ── Shard meta save ───────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim()) {
      addAlert({ str: 'Title is required', type: 'error' });
      return;
    }
    try {
      let finalImageUrl = uploadedImageUrl;
      if (selectedImageUri && !uploadedImageUrl) {
        finalImageUrl = await uploadImageToCloudinary(selectedImageUri);
      }

      const { data } = await updateShardMutation({
        variables: {
          id,
          input: {
            title: title.trim(),
            description: description.trim(),
            image: finalImageUrl,
            isPrivate,
            isAnonymous,
            timeline: deadline ? { startDate: shard?.timeline?.startDate || new Date().toISOString(), endDate: deadline.toISOString() } : undefined,
            participants: selectedParticipants.map((p) => ({ user: p.userId, role: p.role })),
          },
        },
      });

      if (data?.updateShard?.success) {
        addAlert({ str: 'Shard updated!', type: 'success' });
        router.back();
      } else {
        addAlert({ str: data?.updateShard?.message || 'Failed to update', type: 'error' });
      }
    } catch {
      addAlert({ str: 'Failed to update shard', type: 'error' });
    }
  };

  // ── Delete shard ──────────────────────────────────────────────────────────
  const handleDelete = () => {
    Alert.alert('Delete Shard', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { data } = await deleteShardMutation({ variables: { id } });
            if (data?.deleteShard?.success) {
              addAlert({ str: 'Shard deleted', type: 'success' });
              router.dismissAll();
              router.replace('/(screens)/(tabs)/Home');
            } else {
              addAlert({ str: data?.deleteShard?.message || 'Failed to delete', type: 'error' });
            }
          } catch {
            addAlert({ str: 'Failed to delete shard', type: 'error' });
          }
        },
      },
    ]);
  };

  // ── Mini-goal mutations ───────────────────────────────────────────────────
  const handleSaveMiniGoal = async (miniGoalId: string, original: { title: string; description: string }) => {
    const edits = miniGoalEdits[miniGoalId];
    if (!edits) return;
    const titleChanged = edits.title.trim() !== original.title;
    const descChanged = edits.description !== (original.description || '');
    if (!titleChanged && !descChanged) return;
    if (!edits.title.trim()) {
      addAlert({ str: 'Mini-goal title cannot be empty', type: 'error' });
      return;
    }
    const { data } = await updateMiniGoalMutation({
      variables: { miniGoalId, input: { title: edits.title.trim(), description: edits.description } },
    });
    if (data?.updateMiniGoal?.success) {
      refetch();
    } else {
      addAlert({ str: data?.updateMiniGoal?.message || 'Failed to update', type: 'error' });
    }
  };

  const handleDeleteMiniGoal = (miniGoalId: string, miniGoalTitle: string) => {
    Alert.alert('Delete Mini-Goal', `Delete "${miniGoalTitle}"? All its tasks will be lost.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { data } = await deleteMiniGoalMutation({ variables: { miniGoalId } });
          if (data?.deleteMiniGoal?.success) {
            setExpandedGoals((prev) => { const n = new Set(prev); n.delete(miniGoalId); return n; });
            refetch();
          } else {
            addAlert({ str: data?.deleteMiniGoal?.message || 'Failed to delete', type: 'error' });
          }
        },
      },
    ]);
  };

  const handleAddMiniGoal = async () => {
    if (!newMiniGoalTitle.trim()) {
      addAlert({ str: 'Title is required', type: 'error' });
      return;
    }
    const { data } = await addMiniGoalMutation({
      variables: { shardId: id, input: { title: newMiniGoalTitle.trim(), description: newMiniGoalDesc.trim() || undefined } },
    });
    if (data?.addMiniGoal?.success) {
      setNewMiniGoalTitle('');
      setNewMiniGoalDesc('');
      setShowAddMiniGoal(false);
      refetch();
    } else {
      addAlert({ str: data?.addMiniGoal?.message || 'Failed to add', type: 'error' });
    }
  };

  const handleAddTask = async (miniGoalId: string) => {
    const text = (newTaskText[miniGoalId] || '').trim();
    if (!text) return;
    const { data } = await addTaskMutation({ variables: { miniGoalId, title: text } });
    if (data?.addTask?.success) {
      setNewTaskText((prev) => ({ ...prev, [miniGoalId]: '' }));
      refetch();
    } else {
      addAlert({ str: data?.addTask?.message || 'Failed to add task', type: 'error' });
    }
  };

  const handleSaveTask = async () => {
    if (!editingTask) return;
    if (!editingTask.title.trim()) {
      addAlert({ str: 'Task title cannot be empty', type: 'error' });
      return;
    }
    const { data } = await updateTaskMutation({
      variables: { miniGoalId: editingTask.miniGoalId, taskIndex: editingTask.taskIndex, title: editingTask.title.trim() },
    });
    if (data?.updateTask?.success) {
      setEditingTask(null);
      refetch();
    } else {
      addAlert({ str: data?.updateTask?.message || 'Failed to update task', type: 'error' });
    }
  };

  const handleDeleteTask = (miniGoalId: string, taskTitle: string) => {
    Alert.alert('Delete Task', `Delete "${taskTitle}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { data } = await deleteTaskMutation({ variables: { miniGoalId, taskTitle } });
          if (data?.deleteTask?.success) {
            refetch();
          } else {
            addAlert({ str: data?.deleteTask?.message || 'Failed to delete task', type: 'error' });
          }
        },
      },
    ]);
  };

  const handleRegenerate = () => {
    Alert.alert(
      'Regenerate Plan',
      'This will replace all incomplete mini-goals with a fresh AI-generated plan. Completed mini-goals are kept. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          onPress: async () => {
            const { data } = await regenerateShardMutation({ variables: { shardId: id } });
            if (data?.regenerateShard?.success) {
              if (data.regenerateShard.warning) {
                addAlert({ str: data.regenerateShard.warning, type: 'warning' });
              } else {
                addAlert({ str: 'Plan regenerated!', type: 'success' });
              }
              setExpandedGoals(new Set());
              refetch();
            } else if (data?.regenerateShard?.needsUpgrade) {
              addAlert({ str: "You've reached your AI limit. Upgrade to Pro!", type: 'error' });
            } else {
              addAlert({ str: data?.regenerateShard?.message || 'Regeneration failed', type: 'error' });
            }
          },
        },
      ]
    );
  };

  // ── Participants ──────────────────────────────────────────────────────────
  const toggleParticipant = (userId: string, role: 'collaborator' | 'accountability_partner' | null) => {
    if (!role) {
      setSelectedParticipants((prev) => prev.filter((p) => p.userId !== userId));
    } else {
      setSelectedParticipants((prev) => [...prev.filter((p) => p.userId !== userId), { userId, role }]);
    }
  };

  // ── Loading / error states ────────────────────────────────────────────────
  if (shardLoading || !shard) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background-paper dark:bg-background-dark-default">
        <ActivityIndicator size="large" color="#8b5cf6" />
      </SafeAreaView>
    );
  }

  const miniGoals: any[] = shard.minigoals || [];
  const inputClass = `rounded-xl border px-4 py-3 text-base ${
    isDark
      ? 'border-gray-700 bg-background-dark-paper text-white'
      : 'border-gray-300 bg-background-default text-gray-900'
  }`;
  const labelClass = `mb-2 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`;

  return (
    <SafeAreaView className="flex-1 bg-background-paper dark:bg-background-dark-default">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} hitSlop={20}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text-primary dark:text-text-dark">Edit Shard</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving || deleting} hitSlop={20}>
          {saving ? (
            <ActivityIndicator size="small" color="#3b82f6" />
          ) : (
            <Text className={`text-base font-semibold ${saving || deleting ? 'text-gray-400' : 'text-blue-500'}`}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
        {/* Image */}
        <View className="mb-4 mt-2">
          <AddImageInput
            initialImage={uploadedImageUrl}
            onImage={(uri) => {
              setSelectedImageUri(uri);
              if (uri) uploadImageToCloudinary(uri);
            }}
          />
        </View>

        {/* Title */}
        <View className="mb-4">
          <Text className={labelClass}>Title</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="Shard title"
            placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'} className={inputClass} />
        </View>

        {/* Description */}
        <View className="mb-4">
          <Text className={labelClass}>Description</Text>
          <TextInput value={description} onChangeText={setDescription}
            placeholder="Describe your shard..." placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
            multiline numberOfLines={4} textAlignVertical="top" className={inputClass} />
        </View>

        {/* Deadline */}
        <View className="mb-4">
          <Text className={labelClass}>Deadline</Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            className={`flex-row items-center justify-between rounded-xl border px-4 py-3 ${
              isDark ? 'border-gray-700 bg-background-dark-paper' : 'border-gray-300 bg-background-default'
            }`}>
            <Text className={deadline ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-gray-500' : 'text-gray-400')}>
              {deadline ? formatDate(deadline) : 'Set deadline (optional)'}
            </Text>
            <View className="flex-row items-center gap-2">
              {deadline && (
                <TouchableOpacity onPress={() => setDeadline(null)} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color="#9ca3af" />
                </TouchableOpacity>
              )}
              <Ionicons name="calendar-outline" size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
            </View>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={deadline || new Date()}
              mode="date"
              minimumDate={new Date()}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(_, date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (date) setDeadline(date);
              }}
            />
          )}
        </View>

        {/* Privacy toggles */}
        <View className="mb-4 rounded-xl border border-gray-300 bg-background-default p-4 dark:border-gray-700 dark:bg-background-dark-paper">
          <View className="flex-row items-center justify-between py-2">
            <View>
              <Text className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Private Quest</Text>
              <Text className="text-xs text-gray-500">Only you and participants can see this</Text>
            </View>
            <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ true: '#7c3aed' }} />
          </View>
          <View className="my-1 border-t border-gray-200 dark:border-gray-700" />
          <View className="flex-row items-center justify-between py-2">
            <View>
              <Text className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Anonymous</Text>
              <Text className="text-xs text-gray-500">Hide your identity from other participants</Text>
            </View>
            <Switch value={isAnonymous} onValueChange={setIsAnonymous} trackColor={{ true: '#7c3aed' }} />
          </View>
        </View>

        {/* Participants */}
        <View className="mb-4">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className={labelClass}>Participants ({selectedParticipants.length})</Text>
            <TouchableOpacity
              onPress={() => setShowParticipantSelector(!showParticipantSelector)}
              className="rounded-lg bg-purple-600 px-3 py-1">
              <Text className="text-xs font-semibold text-white">
                {showParticipantSelector ? 'Done' : 'Manage'}
              </Text>
            </TouchableOpacity>
          </View>

          {selectedParticipants.length > 0 && (
            <View className="mb-3 space-y-2">
              {selectedParticipants.map((participant) => {
                const friend = friends.find((f) => f.id === participant.userId);
                return (
                  <View key={participant.userId}
                    className="flex-row items-center justify-between rounded-xl bg-background-default p-3 dark:bg-background-dark-paper">
                    <View className="flex-row items-center">
                      <Image source={{ uri: friend?.profilePic || FALLBACK_AVATAR }}
                        className="mr-3 h-10 w-10 rounded-full bg-gray-200" />
                      <View>
                        <Text className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {friend?.username || participant.userId}
                        </Text>
                        <Text className="text-xs text-gray-500">
                          {participant.role === 'collaborator' ? 'Collaborator' : 'Accountability Partner'}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => toggleParticipant(participant.userId, null)}>
                      <Ionicons name="close-circle" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {showParticipantSelector && (
            <View className="rounded-xl border border-gray-300 bg-background-default p-4 dark:border-gray-700 dark:bg-background-dark-paper">
              <Text className={`mb-3 text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Add from Friends
              </Text>
              {friends
                .filter((f) => !selectedParticipants.some((p) => p.userId === f.id))
                .map((friend) => (
                  <View key={friend.id} className="mb-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                    <View className="mb-2 flex-row items-center">
                      <Image source={{ uri: friend.profilePic || FALLBACK_AVATAR }}
                        className="mr-3 h-10 w-10 rounded-full bg-gray-200" />
                      <Text className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{friend.username}</Text>
                    </View>
                    <View className="flex-row gap-2">
                      <TouchableOpacity onPress={() => toggleParticipant(friend.id, 'collaborator')}
                        className="flex-1 items-center rounded-lg bg-purple-600 py-2">
                        <Text className="text-xs font-semibold text-white">Collaborator</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => toggleParticipant(friend.id, 'accountability_partner')}
                        className="flex-1 items-center rounded-lg bg-blue-600 py-2">
                        <Text className="text-xs font-semibold text-white">Accountability</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
            </View>
          )}
        </View>

        {/* ── Mini-Goals ────────────────────────────────────────────────── */}
        <View className="mb-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Mini-Goals ({miniGoals.length})
            </Text>
            <TouchableOpacity
              onPress={handleRegenerate}
              disabled={regenerating}
              className="flex-row items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5">
              {regenerating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="sparkles" size={14} color="#fff" />
              )}
              <Text className="text-xs font-semibold text-white">
                {regenerating ? 'Regenerating…' : 'Regenerate AI'}
              </Text>
            </TouchableOpacity>
          </View>

          {miniGoals.map((mg: any) => {
            const isExpanded = expandedGoals.has(mg.id);
            const edits = miniGoalEdits[mg.id] || { title: mg.title, description: mg.description || '' };
            const activeTasks = (mg.tasks || []).filter((t: any) => !t.deleted && !t.completed);

            return (
              <View key={mg.id}
                className="mb-3 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                {/* Mini-goal header */}
                <TouchableOpacity
                  onPress={() => toggleGoal(mg.id, mg.title, mg.description || '')}
                  className="flex-row items-center justify-between bg-background-default p-3 dark:bg-background-dark-paper">
                  <View className="flex-1 flex-row items-center gap-2">
                    <Ionicons
                      name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                      size={16}
                      color={isDark ? '#9ca3af' : '#6b7280'}
                    />
                    <Text className={`flex-1 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`} numberOfLines={1}>
                      {mg.title}
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-500">
                    {activeTasks.length} task{activeTasks.length !== 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>

                {/* Expanded content */}
                {isExpanded && (
                  <View className="border-t border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
                    {/* Edit title */}
                    <Text className="mb-1 text-xs font-medium text-gray-500">Title</Text>
                    <TextInput
                      value={edits.title}
                      onChangeText={(v) => setMiniGoalEdits((prev) => ({ ...prev, [mg.id]: { ...edits, title: v } }))}
                      onBlur={() => handleSaveMiniGoal(mg.id, { title: mg.title, description: mg.description || '' })}
                      className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
                        isDark ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300 bg-white text-gray-900'
                      }`}
                    />

                    {/* Edit description */}
                    <Text className="mb-1 text-xs font-medium text-gray-500">Description</Text>
                    <TextInput
                      value={edits.description}
                      onChangeText={(v) => setMiniGoalEdits((prev) => ({ ...prev, [mg.id]: { ...edits, description: v } }))}
                      onBlur={() => handleSaveMiniGoal(mg.id, { title: mg.title, description: mg.description || '' })}
                      placeholder="Optional description…"
                      placeholderTextColor="#9ca3af"
                      multiline
                      className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
                        isDark ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300 bg-white text-gray-900'
                      }`}
                    />

                    {/* Tasks */}
                    <Text className="mb-2 text-xs font-medium text-gray-500">Tasks</Text>
                    {activeTasks.map((task: any, idx: number) => {
                      const isEditingThis =
                        editingTask?.miniGoalId === mg.id && editingTask?.taskIndex === idx;
                      return (
                        <View key={idx}
                          className="mb-2 flex-row items-center gap-2 rounded-lg bg-white px-3 py-2 dark:bg-gray-800">
                          <Ionicons name="ellipse-outline" size={14} color="#9ca3af" />
                          {isEditingThis ? (
                            <TextInput
                              value={editingTask.title}
                              onChangeText={(v) => setEditingTask({ ...editingTask, title: v })}
                              onBlur={handleSaveTask}
                              onSubmitEditing={handleSaveTask}
                              autoFocus
                              className="flex-1 text-sm text-gray-900 dark:text-white"
                            />
                          ) : (
                            <TouchableOpacity
                              className="flex-1"
                              onPress={() => setEditingTask({ miniGoalId: mg.id, taskIndex: idx, title: task.title })}>
                              <Text className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{task.title}</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            onPress={() => handleDeleteTask(mg.id, task.title)}
                            hitSlop={8}>
                            <Ionicons name="close" size={16} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      );
                    })}

                    {/* Add task */}
                    <View className="mb-3 flex-row items-center gap-2">
                      <TextInput
                        value={newTaskText[mg.id] || ''}
                        onChangeText={(v) => setNewTaskText((prev) => ({ ...prev, [mg.id]: v }))}
                        onSubmitEditing={() => handleAddTask(mg.id)}
                        placeholder="Add a task…"
                        placeholderTextColor="#9ca3af"
                        returnKeyType="done"
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                          isDark ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300 bg-white text-gray-900'
                        }`}
                      />
                      <TouchableOpacity
                        onPress={() => handleAddTask(mg.id)}
                        className="rounded-lg bg-purple-600 px-3 py-2">
                        <Ionicons name="add" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>

                    {/* Delete mini-goal */}
                    <TouchableOpacity
                      onPress={() => handleDeleteMiniGoal(mg.id, mg.title)}
                      className="flex-row items-center justify-center gap-1 rounded-lg border border-red-300 py-2 dark:border-red-800">
                      <Ionicons name="trash-outline" size={14} color="#ef4444" />
                      <Text className="text-xs font-medium text-red-500">Delete Mini-Goal</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

          {/* Add new mini-goal */}
          {showAddMiniGoal ? (
            <View className="rounded-xl border border-purple-300 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
              <Text className={`mb-2 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>New Mini-Goal</Text>
              <TextInput
                value={newMiniGoalTitle}
                onChangeText={setNewMiniGoalTitle}
                placeholder="Title"
                placeholderTextColor="#9ca3af"
                className={`mb-2 rounded-lg border px-3 py-2 text-sm ${
                  isDark ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300 bg-white text-gray-900'
                }`}
              />
              <TextInput
                value={newMiniGoalDesc}
                onChangeText={setNewMiniGoalDesc}
                placeholder="Description (optional)"
                placeholderTextColor="#9ca3af"
                className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
                  isDark ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300 bg-white text-gray-900'
                }`}
              />
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => { setShowAddMiniGoal(false); setNewMiniGoalTitle(''); setNewMiniGoalDesc(''); }}
                  className="flex-1 items-center rounded-lg border border-gray-300 py-2 dark:border-gray-600">
                  <Text className="text-sm font-medium text-gray-500">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAddMiniGoal}
                  className="flex-1 items-center rounded-lg bg-purple-600 py-2">
                  <Text className="text-sm font-semibold text-white">Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setShowAddMiniGoal(true)}
              className="flex-row items-center justify-center gap-2 rounded-xl border-2 border-dashed border-purple-400 py-3">
              <Ionicons name="add-circle-outline" size={18} color="#7c3aed" />
              <Text className="text-sm font-medium text-purple-600">Add Mini-Goal</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Danger Zone */}
        <View className="mb-8 mt-4 rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <Text className="mb-2 text-base font-bold text-red-600 dark:text-red-400">Danger Zone</Text>
          <Text className="mb-4 text-sm text-red-600 dark:text-red-400">
            Once you delete a shard, there is no going back. Please be certain.
          </Text>
          <TouchableOpacity
            onPress={handleDelete}
            disabled={deleting}
            className="items-center rounded-xl bg-red-500 py-3">
            {deleting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="font-semibold text-white">Delete Shard</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EditShard;
