import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AntDesign, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useMutation, useLazyQuery, useQuery } from '@apollo/client';
import { useUserStore } from '~/store/user.store';
import { useAppStore } from '~/store/app.store';
import { CREATE_SHARD, CREATE_SHARD_MANUAL } from '~/Graphql/Mutations';
import { GET_FRIENDS, GET_SIGNED_UPLOAD_URL } from '~/Graphql/Queries';
import { useFriendsStore, Friend } from '~/store/friends.store';
import AddImageInput from '~/components/AddImageInput';
import AnimatedPressable from '~/components/AnimatedPressable';

type CreationMode = 'ai' | 'manual';

interface SelectedFriend {
  userId: string;
  role: 'collaborator' | 'accountability_partner';
}

// ─── Segmented Control ───────────────────────────────────────────────

const ModeSelector = ({
  mode,
  onSelect,
}: {
  mode: CreationMode;
  onSelect: (m: CreationMode) => void;
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View
      className="mb-6 flex-row gap-3 rounded-2xl p-1.5"
      style={{ backgroundColor: isDark ? '#131313' : '#f0f0f0' }}>
      <AnimatedPressable
        onPress={() => onSelect('ai')}
        className="flex-1 flex-row items-center justify-center rounded-xl px-4 py-3.5"
        style={
          mode === 'ai'
            ? {
                backgroundColor: isDark ? '#2c2c2c' : '#fff',
                shadowColor: '#8b5cf6',
                shadowOpacity: 0.1,
                shadowRadius: 15,
                elevation: 3,
              }
            : {}
        }>
        <Ionicons
          name="sparkles"
          size={16}
          color={mode === 'ai' ? '#8b5cf6' : '#767575'}
          style={{ marginRight: 6 }}
        />
        <Text
          style={{
            fontSize: 13,
            fontWeight: '600',
            color: mode === 'ai' ? '#8b5cf6' : isDark ? '#adaaaa' : '#666',
          }}>
          AI-Assisted
        </Text>
      </AnimatedPressable>

      <AnimatedPressable
        onPress={() => onSelect('manual')}
        className="flex-1 flex-row items-center justify-center rounded-xl px-4 py-3.5"
        style={
          mode === 'manual'
            ? {
                backgroundColor: isDark ? '#2c2c2c' : '#fff',
                shadowColor: '#8b5cf6',
                shadowOpacity: 0.1,
                shadowRadius: 15,
                elevation: 3,
              }
            : {}
        }>
        <MaterialIcons
          name="edit"
          size={16}
          color={mode === 'manual' ? '#8b5cf6' : '#767575'}
          style={{ marginRight: 6 }}
        />
        <Text
          style={{
            fontSize: 13,
            fontWeight: '600',
            color: mode === 'manual' ? '#8b5cf6' : isDark ? '#adaaaa' : '#666',
          }}>
          Manual
        </Text>
      </AnimatedPressable>
    </View>
  );
};

// ─── Friend Selection ────────────────────────────────────────────────

const FriendSelection = ({
  selectedFriends,
  onSelect,
}: {
  selectedFriends: SelectedFriend[];
  onSelect: (friendId: string, role: 'collaborator' | 'accountability_partner' | null) => void;
}) => {
  const { searchQuery, setSearchQuery, filteredFriends } = useFriendsStore();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const filtered = filteredFriends();

  return (
    <Animated.View entering={FadeInDown.delay(300).duration(400)} className="my-3 space-y-4">
      <Text
        className="text-xs font-bold uppercase tracking-widest"
        style={{ color: isDark ? '#adaaaa' : '#666' }}>
        Add Participants
      </Text>

      <View
        className="flex-row items-center rounded-xl px-4 py-3"
        style={{ backgroundColor: isDark ? '#20201f' : '#f6f7fb' }}>
        <Ionicons name="search" size={18} color="#767575" style={{ marginRight: 10 }} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search friends..."
          placeholderTextColor="#767575"
          className="flex-1 text-text-primary dark:text-text-dark"
        />
      </View>

      {filtered.length > 0 ? (
        <View className="space-y-3">
          {filtered.map((friend) => {
            const selection = selectedFriends.find((s) => s.userId === friend.id);
            return (
              <View
                key={friend.id}
                className="rounded-xl p-4"
                style={{ backgroundColor: isDark ? '#20201f' : '#f6f7fb' }}>
                <View className="mb-3 flex-row items-center">
                  <Image
                    source={{ uri: friend.profilePic }}
                    className="h-10 w-10 rounded-full bg-gray-200"
                  />
                  <View className="ml-3 flex-1">
                    <Text className="font-bold text-text-primary dark:text-text-dark">
                      {friend.username}
                    </Text>
                    <Text className="text-xs text-text-secondary dark:text-text-dark-secondary">
                      {friend.email}
                    </Text>
                  </View>
                </View>
                <View className="flex-row gap-2">
                  <AnimatedPressable
                    onPress={() =>
                      onSelect(friend.id, selection?.role === 'collaborator' ? null : 'collaborator')
                    }
                    className="flex-1 items-center justify-center rounded-lg py-2"
                    style={{
                      backgroundColor:
                        selection?.role === 'collaborator'
                          ? '#8b5cf6'
                          : isDark
                            ? '#262626'
                            : '#e5e7eb',
                    }}>
                    <Text
                      className="text-xs font-bold"
                      style={{
                        color: selection?.role === 'collaborator' ? '#fff' : isDark ? '#fff' : '#1a1a1a',
                      }}>
                      Collaborator
                    </Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    onPress={() =>
                      onSelect(
                        friend.id,
                        selection?.role === 'accountability_partner' ? null : 'accountability_partner'
                      )
                    }
                    className="flex-1 items-center justify-center rounded-lg py-2"
                    style={{
                      backgroundColor:
                        selection?.role === 'accountability_partner'
                          ? '#8b5cf6'
                          : isDark
                            ? '#262626'
                            : '#e5e7eb',
                    }}>
                    <Text
                      className="text-xs font-bold"
                      style={{
                        color:
                          selection?.role === 'accountability_partner'
                            ? '#fff'
                            : isDark
                              ? '#fff'
                              : '#1a1a1a',
                      }}>
                      Accountability
                    </Text>
                  </AnimatedPressable>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <Text className="py-4 text-center text-xs" style={{ color: '#767575' }}>
          No friends found
        </Text>
      )}
    </Animated.View>
  );
};

// ─── Media & Date Actions (grid) ─────────────────────────────────────

const MediaDateGrid = ({
  onImageSelect,
  deadline,
  onDatePress,
  formatDate,
}: {
  onImageSelect: (uri: string) => void;
  deadline?: Date;
  onDatePress: () => void;
  formatDate: (d: Date) => string;
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Animated.View entering={FadeInDown.delay(100).duration(400)} className="flex-row gap-4">
      <View className="flex-1">
        <AddImageInput onImage={onImageSelect} />
      </View>
      <AnimatedPressable
        onPress={onDatePress}
        className="flex-1 items-start justify-center rounded-2xl border p-5"
        style={{
          backgroundColor: isDark ? '#20201f' : '#f6f7fb',
          borderColor: isDark ? 'rgba(72,72,71,0.2)' : 'rgba(0,0,0,0.05)',
        }}>
        <Text
          className="mb-1 text-[10px] font-bold uppercase tracking-widest"
          style={{ color: isDark ? '#adaaaa' : '#666' }}>
          Deadline
        </Text>
        <View className="flex-row items-center gap-2">
          <Ionicons name="calendar-outline" size={14} color={isDark ? '#fff' : '#1a1a1a'} />
          <Text className="text-sm font-semibold text-text-primary dark:text-text-dark">
            {deadline ? formatDate(deadline) : 'Set deadline'}
          </Text>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
};

// ─── AI Hint Card ────────────────────────────────────────────────────

const AIHintCard = () => {
  const isDark = useColorScheme() === 'dark';
  return (
    <Animated.View
      entering={FadeInDown.delay(350).duration(400)}
      className="flex-row items-start gap-3 rounded-2xl border p-4"
      style={{
        borderColor: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.1)',
        backgroundColor: isDark ? 'rgba(139,92,246,0.05)' : 'rgba(139,92,246,0.04)',
      }}>
      <Ionicons name="sparkles" size={18} color="#8b5cf6" />
      <Text className="flex-1 text-xs leading-5" style={{ color: isDark ? '#adaaaa' : '#666' }}>
        Our AI will break down your goal into manageable steps, suggest resources, and set up a
        personalized timeline.
      </Text>
    </Animated.View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────

const NewShard = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { addAlert } = useAppStore();

  const [mode, setMode] = useState<CreationMode>('ai');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<SelectedFriend[]>([]);

  // AI state
  const [aiGoal, setAiGoal] = useState('');
  const [aiDeadline, setAiDeadline] = useState<Date | undefined>(undefined);
  const [showAiDatePicker, setShowAiDatePicker] = useState(false);
  const [aiCallsRemaining, setAiCallsRemaining] = useState<number | null>(null);

  // Manual state
  const [manualTitle, setManualTitle] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualStartDate, setManualStartDate] = useState<Date | undefined>(undefined);
  const [manualEndDate, setManualEndDate] = useState<Date | undefined>(undefined);
  const [showManualDatePicker, setShowManualDatePicker] = useState(false);
  const [manualDateType, setManualDateType] = useState<'start' | 'end'>('start');

  const { setFriends } = useFriendsStore();

  useQuery(GET_FRIENDS, {
    onCompleted: (data) => {
      if (data?.getFriends?.success) setFriends(data.getFriends.friends);
    },
  });

  const [createShard] = useMutation(CREATE_SHARD);
  const [createShardManual] = useMutation(CREATE_SHARD_MANUAL);
  const [fetchSignedUrl] = useLazyQuery(GET_SIGNED_UPLOAD_URL);

  const handleFriendSelect = (
    userId: string,
    role: 'collaborator' | 'accountability_partner' | null
  ) => {
    if (!role) {
      setSelectedFriends((prev) => prev.filter((f) => f.userId !== userId));
    } else {
      setSelectedFriends((prev) => {
        const filtered = prev.filter((f) => f.userId !== userId);
        return [...filtered, { userId, role }];
      });
    }
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

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
        addAlert({ str: 'Image uploaded successfully!', type: 'success' });
        return result.secure_url;
      }
      throw new Error(result.error?.message || 'Upload failed');
    } catch (e: any) {
      addAlert({ str: `Image upload failed: ${e.message || 'Unknown error'}`, type: 'error' });
      return null;
    }
  };

  const handleCreateAI = async () => {
    if (!aiGoal.trim()) {
      addAlert({ str: 'Please describe your goal', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      let imageUrl = uploadedImageUrl;
      if (selectedImageUri && !uploadedImageUrl) {
        imageUrl = await uploadImageToCloudinary(selectedImageUri);
      }
      const { data } = await createShard({
        variables: {
          goal: aiGoal,
          deadline: aiDeadline?.toISOString(),
          image: imageUrl,
          participants: selectedFriends.map((f) => ({ user: f.userId, role: f.role })),
        },
      });
      if (data?.createShard?.success) {
        addAlert({ str: data.createShard.message, type: 'success' });
        if (data.createShard.aiCallsRemaining !== undefined) setAiCallsRemaining(data.createShard.aiCallsRemaining);
        router.push('/Home');
      } else if (data?.createShard?.needsUpgrade) {
        addAlert({ str: data.createShard.message, type: 'warning' });
      } else {
        addAlert({ str: data?.createShard?.message || 'Failed to create quest', type: 'error' });
      }
    } catch {
      addAlert({ str: 'Failed to create quest. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateManual = async () => {
    if (!manualTitle.trim() || !manualDescription.trim()) {
      addAlert({ str: 'Please fill in title and description', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      let imageUrl = uploadedImageUrl;
      if (selectedImageUri && !uploadedImageUrl) {
        imageUrl = await uploadImageToCloudinary(selectedImageUri);
      }
      const { data } = await createShardManual({
        variables: {
          input: {
            title: manualTitle,
            description: manualDescription,
            timeline: {
              startDate: manualStartDate?.toISOString() || new Date().toISOString(),
              endDate: manualEndDate?.toISOString(),
            },
            participants: selectedFriends.map((f) => ({ user: f.userId, role: f.role })),
            rewards: [],
            image: imageUrl,
          },
        },
      });
      if (data?.createShardManual?.success) {
        addAlert({ str: data.createShardManual.message, type: 'success' });
        router.push('/Home');
      } else {
        addAlert({ str: data?.createShardManual?.message || 'Failed to create quest', type: 'error' });
      }
    } catch {
      addAlert({ str: 'Failed to create quest. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAiDateChange = (_: any, selectedDate?: Date) => {
    setShowAiDatePicker(Platform.OS === 'ios');
    if (selectedDate) setAiDeadline(selectedDate);
  };

  const handleManualDateChange = (_: any, selectedDate?: Date) => {
    setShowManualDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      if (manualDateType === 'start') setManualStartDate(selectedDate);
      else setManualEndDate(selectedDate);
    }
  };

  // ─── Glass card style ────────────────────────────────────────────

  const glassStyle = {
    backgroundColor: isDark ? 'rgba(26, 26, 26, 0.6)' : 'rgba(255, 255, 255, 0.8)',
    borderColor: isDark ? 'rgba(72,72,71,0.15)' : 'rgba(0,0,0,0.06)',
    borderWidth: 1,
    borderRadius: 28,
    padding: 24,
  };

  return (
    <SafeAreaView className="flex-1 bg-background-paper dark:bg-background-dark-default">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4">
          <AnimatedPressable onPress={() => router.back()} hitSlop={20} scaleDown={0.9}>
            <AntDesign name="arrowleft" size={24} color={isDark ? '#8b5cf6' : '#1a1a1a'} />
          </AnimatedPressable>
          <Text
            className="text-2xl font-bold tracking-tight"
            style={{ color: '#8b5cf6' }}>
            Shard
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 80 }}>
          <Animated.View entering={FadeIn.duration(400)}>
            {/* Mode selector */}
            <ModeSelector mode={mode} onSelect={setMode} />

            {aiCallsRemaining !== null && mode === 'ai' && (
              <Text className="mb-4 text-xs" style={{ color: '#767575' }}>
                {aiCallsRemaining} AI calls remaining today
              </Text>
            )}

            {/* ─── AI Form ──────────────────────────────────────── */}
            {mode === 'ai' && (
              <View style={glassStyle}>
                {/* Decorative glow */}
                <View
                  style={{
                    position: 'absolute',
                    top: -40,
                    right: -40,
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    backgroundColor: 'rgba(139,92,246,0.08)',
                  }}
                />

                <Text
                  className="mb-4 text-xs font-bold uppercase tracking-widest"
                  style={{ color: isDark ? '#adaaaa' : '#666' }}>
                  What do you want to achieve?
                </Text>

                <TextInput
                  value={aiGoal}
                  onChangeText={setAiGoal}
                  placeholder="e.g., Learn React Native and build a mobile app"
                  multiline
                  numberOfLines={4}
                  style={{
                    fontSize: 18,
                    fontWeight: '600',
                    borderBottomWidth: 2,
                    borderBottomColor: aiGoal
                      ? '#8b5cf6'
                      : isDark
                        ? '#484847'
                        : '#d1d5db',
                    paddingVertical: 12,
                    minHeight: 100,
                    color: isDark ? '#fff' : '#1a1a1a',
                  }}
                  placeholderTextColor={isDark ? 'rgba(118,117,117,0.5)' : 'rgba(0,0,0,0.25)'}
                  textAlignVertical="top"
                />

                {/* Media & Date grid */}
                <View className="mt-6">
                  <MediaDateGrid
                    onImageSelect={setSelectedImageUri}
                    deadline={aiDeadline}
                    onDatePress={() => setShowAiDatePicker(true)}
                    formatDate={formatDate}
                  />
                </View>

              </View>
            )}

            {/* ─── Manual Form ──────────────────────────────────── */}
            {mode === 'manual' && (
              <View style={glassStyle}>
                <View
                  style={{
                    position: 'absolute',
                    top: -40,
                    right: -40,
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    backgroundColor: 'rgba(139,92,246,0.08)',
                  }}
                />

                <Text
                  className="mb-4 text-xs font-bold uppercase tracking-widest"
                  style={{ color: isDark ? '#adaaaa' : '#666' }}>
                  Quest Title
                </Text>
                <TextInput
                  value={manualTitle}
                  onChangeText={setManualTitle}
                  placeholder="Enter quest title"
                  style={{
                    fontSize: 18,
                    fontWeight: '600',
                    borderBottomWidth: 2,
                    borderBottomColor: manualTitle ? '#8b5cf6' : isDark ? '#484847' : '#d1d5db',
                    paddingVertical: 12,
                    color: isDark ? '#fff' : '#1a1a1a',
                  }}
                  placeholderTextColor={isDark ? 'rgba(118,117,117,0.5)' : 'rgba(0,0,0,0.25)'}
                />

                <Text
                  className="mb-4 mt-6 text-xs font-bold uppercase tracking-widest"
                  style={{ color: isDark ? '#adaaaa' : '#666' }}>
                  Description
                </Text>
                <TextInput
                  value={manualDescription}
                  onChangeText={setManualDescription}
                  placeholder="Describe your quest..."
                  multiline
                  numberOfLines={4}
                  style={{
                    fontSize: 15,
                    borderBottomWidth: 2,
                    borderBottomColor: manualDescription ? '#8b5cf6' : isDark ? '#484847' : '#d1d5db',
                    paddingVertical: 12,
                    minHeight: 100,
                    color: isDark ? '#fff' : '#1a1a1a',
                  }}
                  placeholderTextColor={isDark ? 'rgba(118,117,117,0.5)' : 'rgba(0,0,0,0.25)'}
                  textAlignVertical="top"
                />

                {/* Image input */}
                <View className="mt-6">
                  <AddImageInput onImage={setSelectedImageUri} />
                </View>

                {/* Timeline */}
                <Animated.View
                  entering={FadeInDown.delay(100).duration(400)}
                  className="mt-6 flex-row gap-3">
                  <AnimatedPressable
                    onPress={() => {
                      setManualDateType('start');
                      setShowManualDatePicker(true);
                    }}
                    className="flex-1 items-start justify-center rounded-2xl border p-4"
                    style={{
                      backgroundColor: isDark ? '#20201f' : '#f6f7fb',
                      borderColor: isDark ? 'rgba(72,72,71,0.2)' : 'rgba(0,0,0,0.05)',
                    }}>
                    <Text
                      className="mb-1 text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: isDark ? '#adaaaa' : '#666' }}>
                      Start
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="calendar-outline" size={14} color={isDark ? '#fff' : '#1a1a1a'} />
                      <Text className="text-sm font-semibold text-text-primary dark:text-text-dark">
                        {manualStartDate ? formatDate(manualStartDate) : 'Set date'}
                      </Text>
                    </View>
                  </AnimatedPressable>

                  <AnimatedPressable
                    onPress={() => {
                      setManualDateType('end');
                      setShowManualDatePicker(true);
                    }}
                    className="flex-1 items-start justify-center rounded-2xl border p-4"
                    style={{
                      backgroundColor: isDark ? '#20201f' : '#f6f7fb',
                      borderColor: isDark ? 'rgba(72,72,71,0.2)' : 'rgba(0,0,0,0.05)',
                    }}>
                    <Text
                      className="mb-1 text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: isDark ? '#adaaaa' : '#666' }}>
                      End
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="calendar-outline" size={14} color={isDark ? '#fff' : '#1a1a1a'} />
                      <Text className="text-sm font-semibold text-text-primary dark:text-text-dark">
                        {manualEndDate ? formatDate(manualEndDate) : 'Set date'}
                      </Text>
                    </View>
                  </AnimatedPressable>
                </Animated.View>

              </View>
            )}

            {/* Friends */}
            <View className="mt-6">
              <FriendSelection selectedFriends={selectedFriends} onSelect={handleFriendSelect} />
            </View>

            {/* AI Hint */}
            {mode === 'ai' && (
              <View className="mt-6">
                <AIHintCard />
              </View>
            )}

            {mode === 'manual' && (
              <Animated.View
                entering={FadeInDown.delay(350).duration(400)}
                className="mt-6 flex-row items-start gap-3 rounded-2xl border p-4"
                style={{
                  borderColor: isDark ? 'rgba(107,114,128,0.15)' : 'rgba(0,0,0,0.06)',
                  backgroundColor: isDark ? 'rgba(107,114,128,0.05)' : 'rgba(0,0,0,0.02)',
                }}>
                <MaterialIcons name="info-outline" size={18} color="#767575" />
                <Text className="flex-1 text-xs leading-5" style={{ color: isDark ? '#adaaaa' : '#666' }}>
                  Create your quest manually. You can add mini-goals and tasks after creation.
                </Text>
              </Animated.View>
            )}

            {/* CTA Button */}
            <Animated.View entering={FadeInDown.delay(400).duration(400)} className="mt-10">
              <AnimatedPressable
                onPress={mode === 'ai' ? handleCreateAI : handleCreateManual}
                disabled={loading}
                scaleDown={0.95}
                className="flex-row items-center justify-center gap-3 rounded-2xl py-5"
                style={{
                  backgroundColor: '#8b5cf6',
                  shadowColor: '#8b5cf6',
                  shadowOpacity: 0.3,
                  shadowRadius: 20,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 8,
                  opacity: loading ? 0.7 : 1,
                }}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name={mode === 'ai' ? 'flash' : 'create-outline'}
                      size={20}
                      color="#fff"
                    />
                    <Text className="text-lg font-extrabold text-white">
                      {mode === 'ai' ? 'Generate Quest with AI' : 'Create Quest'}
                    </Text>
                  </>
                )}
              </AnimatedPressable>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {showAiDatePicker && (
        <DateTimePicker
          value={aiDeadline || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleAiDateChange}
          minimumDate={new Date()}
        />
      )}

      {showManualDatePicker && (
        <DateTimePicker
          value={manualDateType === 'start' ? manualStartDate || new Date() : manualEndDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleManualDateChange}
          minimumDate={new Date()}
        />
      )}
    </SafeAreaView>
  );
};

export default NewShard;
