import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AntDesign, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useMutation } from '@apollo/client';
import images from '@/constants/images';
import { useUserStore } from '~/store/user.store';
import { useAppStore } from '~/store/app.store';
import { CREATE_SHARD, CREATE_SHARD_MANUAL } from '~/Graphql/Mutations';
import { gql, useLazyQuery } from '@apollo/client';
import AddImageInput from '~/components/AddImageInput';
import { GET_FRIENDS, GET_SIGNED_UPLOAD_URL } from '~/Graphql/Queries';
import { useFriendsStore, Friend } from '~/store/friends.store';
import { useQuery } from '@apollo/client';

type CreationMode = 'ai' | 'manual';

interface SelectedFriend {
  userId: string;
  role: 'collaborator' | 'accountability_partner';
}

const FriendSelection = ({ 
  selectedFriends, 
  onSelect 
}: { 
  selectedFriends: SelectedFriend[]; 
  onSelect: (friendId: string, role: 'collaborator' | 'accountability_partner' | null) => void;
}) => {
  const { friends, searchQuery, setSearchQuery, filteredFriends } = useFriendsStore();
  const colorScheme = useColorScheme();
  const filtered = filteredFriends();

  return (
    <View className="space-y-4 my-3">
      <Text className="text-xs font-bold text-text-primary dark:text-text-dark">
        Add Participants
      </Text>
      
      {/* Search Bar */}
      <View className="flex-row items-center rounded-xl bg-background-default px-4 py-3 dark:bg-background-dark-paper">
        <Ionicons name="search" size={20} color="#666" style={{ marginRight: 10 }} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search friends..."
          placeholderTextColor="#666"
          className="flex-1 text-text-primary dark:text-text-dark"
        />
      </View>

      {/* Friends List */}
      {filtered.length > 0 ? (
        <View className="space-y-3">
          {filtered.map((friend) => {
            const selection = selectedFriends.find(s => s.userId === friend.id);
            
            return (
              <View key={friend.id} className="rounded-xl bg-background-default p-4 dark:bg-background-dark-paper">
                <View className="flex-row items-center mb-3">
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
                  <TouchableOpacity
                    onPress={() => onSelect(friend.id, selection?.role === 'collaborator' ? null : 'collaborator')}
                    className={`flex-1 items-center justify-center rounded-lg py-2 ${
                      selection?.role === 'collaborator' ? 'bg-purple-600' : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                    <Text className={`text-xs font-bold ${
                      selection?.role === 'collaborator' ? 'text-white' : 'text-text-primary dark:text-text-dark'
                    }`}>
                      Collaborator
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => onSelect(friend.id, selection?.role === 'accountability_partner' ? null : 'accountability_partner')}
                    className={`flex-1 items-center justify-center rounded-lg py-2 ${
                      selection?.role === 'accountability_partner' ? 'bg-purple-600' : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                    <Text className={`text-xs font-bold ${
                      selection?.role === 'accountability_partner' ? 'text-white' : 'text-text-primary dark:text-text-dark'
                    }`}>
                      Accountability Partner
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <Text className="text-center text-xs text-text-secondary dark:text-text-dark-secondary">
          No friends found
        </Text>
      )}
    </View>
  );
};

const NewShard = () => {
  const colorScheme = useColorScheme();
  const user = useUserStore((state) => state.user);
  const { addAlert } = useAppStore();
  
  const [mode, setMode] = useState<CreationMode>('ai');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<SelectedFriend[]>([]);

  const { setFriends } = useFriendsStore();
  
  // Fetch friends
  useQuery(GET_FRIENDS, {
    onCompleted: (data) => {
      if (data?.getFriends?.success) {
        setFriends(data.getFriends.friends);
      }
    },
  });

  const handleFriendSelect = (userId: string, role: 'collaborator' | 'accountability_partner' | null) => {
    if (!role) {
      setSelectedFriends(prev => prev.filter(f => f.userId !== userId));
    } else {
      setSelectedFriends(prev => {
        const filtered = prev.filter(f => f.userId !== userId);
        return [...filtered, { userId, role }];
      });
    }
  };
  
  // AI Mode State
  const [aiGoal, setAiGoal] = useState('');
  const [aiDeadline, setAiDeadline] = useState<Date | undefined>(undefined);
  const [showAiDatePicker, setShowAiDatePicker] = useState(false);
  const [aiCallsRemaining, setAiCallsRemaining] = useState<number | null>(null);
  
  // Manual Mode State
  const [manualTitle, setManualTitle] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualStartDate, setManualStartDate] = useState<Date | undefined>(undefined);
  const [manualEndDate, setManualEndDate] = useState<Date | undefined>(undefined);
  const [showManualDatePicker, setShowManualDatePicker] = useState(false);
  const [manualDateType, setManualDateType] = useState<'start' | 'end'>('start');

  const [createShard] = useMutation(CREATE_SHARD);
  const [createShardManual] = useMutation(CREATE_SHARD_MANUAL);

  const [fetchSignedUrl] = useLazyQuery(GET_SIGNED_UPLOAD_URL);

  const uploadImageToCloudinary = async (localUri: string) => {
    try {
      const { data } = await fetchSignedUrl();
      const uploadInfo = data?.getSignedUploadUrl;
      if (!uploadInfo?.success) {
        throw new Error('Failed to get signed upload URL');
      }
      const { uploadUrl, params } = uploadInfo;
      const fileName = localUri.split('/').pop() || 'upload.jpg';
      const form = new FormData();
      form.append('file', { uri: localUri, name: fileName, type: 'image/jpeg' } as any);
      // Append Cloudinary params
      Object.entries(params).forEach(([key, value]) => {
        form.append(key, value as any);
      });
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: form,
      });
      const result = await response.json();
      if (result.secure_url) {
        setUploadedImageUrl(result.secure_url);
        return result.secure_url;
      }
      throw new Error('Upload failed');
    } catch (e) {
      console.error('Image upload error:', e);
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
          participants: selectedFriends,
        },
      });

      if (data?.createShard?.success) {
        addAlert({ str: data.createShard.message, type: 'success' });
        if (data.createShard.shard?.aiCallsRemaining !== undefined) {
          setAiCallsRemaining(data.createShard.shard.aiCallsRemaining);
        }
        router.replace('/(tabs)');
      } else if (data?.createShard?.needsUpgrade) {
        addAlert({ str: data.createShard.message, type: 'warning' });
      } else {
        addAlert({ str: data?.createShard?.message || 'Failed to create quest', type: 'error' });
      }
    } catch (error) {
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
            startDate: manualStartDate?.toISOString(),
            endDate: manualEndDate?.toISOString(),
            participants: selectedFriends,
            rewards: [],
            image: imageUrl,
          },
        },
      });

      if (data?.createShardManual?.success) {
        addAlert({ str: data.createShardManual.message, type: 'success' });
        router.replace('/(tabs)');
      } else {
        addAlert({ str: data?.createShardManual?.message || 'Failed to create quest', type: 'error' });
      }
    } catch (error) {
      addAlert({ str: 'Failed to create quest. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAiDateChange = (event: any, selectedDate?: Date) => {
    setShowAiDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setAiDeadline(selectedDate);
    }
  };

  const handleManualDateChange = (event: any, selectedDate?: Date) => {
    setShowManualDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      if (manualDateType === 'start') {
        setManualStartDate(selectedDate);
      } else {
        setManualEndDate(selectedDate);
      }
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background-paper dark:bg-background-dark-default">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1">
        
        {/* Header */}
        <View className="flex-row items-center justify-between p-4">
          <TouchableOpacity onPress={() => router.back()}>
            <AntDesign
              name="arrowleft"
              size={24}
              color={colorScheme === 'dark' ? '#fff' : '#000'}
            />
          </TouchableOpacity>
          <Image
            source={colorScheme === 'dark' ? images.SmallLogoDark : images.SmallLogoLight}
            className="h-8 w-24"
            resizeMode="contain"
          />
          <View style={{ width: 24 }} />
        </View>

        <ScrollView className="flex-1 px-4">
          <Animated.View entering={FadeIn.delay(100)} className="space-y-6">
            
            {/* Mode Selection */}
            <View className="mb-6">
              <Text className="mb-3 text-lg font-bold text-text-primary dark:text-text-dark">
                Create Shard Quest
              </Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setMode('ai')}
                  className={`flex-1 flex-row items-center justify-center rounded-xl p-4 ${
                    mode === 'ai' ? 'bg-primary-start' : 'bg-background-default dark:bg-background-dark-paper'
                  }`}
                  style={mode === 'ai' ? { backgroundColor: '#4135F3' } : {}}>
                  <Ionicons 
                    name="sparkles" 
                    size={20} 
                    color={mode === 'ai' ? '#fff' : '#7168F6'} 
                    style={{ marginRight: 8 }}
                  />
                  <Text className={`font-semibold ${
                    mode === 'ai' ? 'text-white' : 'text-text-primary dark:text-text-dark'
                  }`}>
                    AI-Assisted
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => setMode('manual')}
                  className={`flex-1 flex-row items-center justify-center rounded-xl p-4 ${
                    mode === 'manual' ? 'bg-primary-start' : 'bg-background-default dark:bg-background-dark-paper'
                  }`}
                  style={mode === 'manual' ? { backgroundColor: '#4135F3' } : {}}>
                  <MaterialIcons 
                    name="edit" 
                    size={20} 
                    color={mode === 'manual' ? '#fff' : '#666'} 
                    style={{ marginRight: 8 }}
                  />
                  <Text className={`font-semibold ${
                    mode === 'manual' ? 'text-white' : 'text-text-primary dark:text-text-dark'
                  }`}>
                    Manual
                  </Text>
                </TouchableOpacity>
              </View>
              
              {aiCallsRemaining !== null && mode === 'ai' && (
                <Text className="mt-2 text-xs text-text-secondary dark:text-text-dark-secondary">
                  {aiCallsRemaining} AI calls remaining today
                </Text>
              )}
            </View>

            {/* AI Mode Form */}
            {mode === 'ai' && (
              <View className="space-y-4"> 
              <AddImageInput onImage={setSelectedImageUri} />
                <View className="rounded-xl bg-blue-50 py-3 dark:bg-blue-900/20"> 
               
                  <Text style={{ color: colorScheme === 'dark' ? '#bfdbfe' : '#1e40af', fontSize: 14 }}>
                    Describe your goal and let AI break it down into actionable mini-quests with tasks and XP rewards!
                  </Text>
                </View>

                <View className='mb-3'>
                  <Text className="mb-2 text-xs font-bold text-text-primary dark:text-text-dark">
                    What do you want to achieve?
                  </Text>
                  <TextInput
                    value={aiGoal}
                    onChangeText={setAiGoal}
                    placeholder="e.g., Learn React Native and build a mobile app"
                    multiline
                    numberOfLines={6}
                    style={{ height: 150 }}
                    className="rounded-xl bg-background-default p-4 text-text-primary dark:bg-background-dark-paper dark:text-text-dark"
                    placeholderTextColor="#666"
                    textAlignVertical="top"
                  />
                </View>

               

              


                <View className='mb-3'>
                  <Text className="mb-2 text-xs font-bold text-text-primary dark:text-text-dark">
                    Deadline (Optional)
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowAiDatePicker(true)}
                    className="flex-row items-center rounded-xl bg-background-default px-4 py-3 dark:bg-background-dark-paper">
                    <Ionicons name="calendar-outline" size={20} color="#666" style={{ marginRight: 10 }} />
                    <Text className="text-text-primary dark:text-text-dark">
                      {aiDeadline ? formatDate(aiDeadline) : 'Set deadline'}
                    </Text>
                  </TouchableOpacity>
                </View>
  <FriendSelection selectedFriends={selectedFriends} onSelect={handleFriendSelect} />

                <TouchableOpacity
                  onPress={handleCreateAI}
                  disabled={loading}
                  className="mt-4 rounded-xl p-4"
                  style={{ backgroundColor: '#4135F3' }}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-center text-lg font-bold text-white">
                      Generate Quest with AI
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Manual Mode Form */}
            {mode === 'manual' && (
              <View className="space-y-4"> 
               <AddImageInput onImage={setSelectedImageUri} />
                <View className="rounded-xl bg-gray-50 py-3  dark:bg-gray-800/20">
              
                  <Text style={{ color: colorScheme === 'dark' ? '#d1d5db' : '#374151', fontSize: 14 }}>
                    Create your quest manually. You can add mini-goals and tasks after creation.
                  </Text>
                </View>

                <View className='mb-3 space-y-2'>
                  <Text className="mb-2 text-xs font-bold text-text-primary dark:text-text-dark">
                    Quest Title
                  </Text>
                  <TextInput
                    value={manualTitle}
                    onChangeText={setManualTitle}
                    placeholder="Enter quest title"
                    className="rounded-xl bg-background-default p-4 text-text-primary dark:bg-background-dark-paper dark:text-text-dark"
                    placeholderTextColor="#666"
                  />
                </View>
                
               

                <View className='mb-3 space-y-2'>
                  <Text className="mb-2 text-xs font-bold text-text-primary dark:text-text-dark">
                    Description
                  </Text>
                  <TextInput
                    value={manualDescription}
                    onChangeText={setManualDescription}
                    placeholder="Describe your quest..."
                    multiline
                    numberOfLines={6}
                    style={{ height: 150 }}
                    className="rounded-xl bg-background-default p-4 text-text-primary dark:bg-background-dark-paper dark:text-text-dark"
                    placeholderTextColor="#666"
                    textAlignVertical="top"
                  />
                </View>

                <View className='mb-3 space-y-2'>
                  <Text className="mb-2 text-xs font-bold text-text-primary dark:text-text-dark">
                    Timeline (Optional)
                  </Text>
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      onPress={() => {
                        setManualDateType('start');
                        setShowManualDatePicker(true);
                      }}
                      className="flex-1 flex-row items-center rounded-xl bg-background-default px-3 py-3 dark:bg-background-dark-paper">
                      <Ionicons name="calendar-outline" size={18} color="#666" style={{ marginRight: 8 }} />
                      <Text className="text-sm text-text-primary dark:text-text-dark">
                        {manualStartDate ? formatDate(manualStartDate) : 'Start'}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => {
                        setManualDateType('end');
                        setShowManualDatePicker(true);
                      }}
                      className="flex-1 flex-row items-center rounded-xl bg-background-default px-3 py-3 dark:bg-background-dark-paper">
                      <Ionicons name="calendar-outline" size={18} color="#666" style={{ marginRight: 8 }} />
                      <Text className="text-sm text-text-primary dark:text-text-dark">
                        {manualEndDate ? formatDate(manualEndDate) : 'End'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
 <FriendSelection selectedFriends={selectedFriends} onSelect={handleFriendSelect} />
                <TouchableOpacity
                  onPress={handleCreateManual}
                  disabled={loading}
                  className="mt-4 rounded-xl p-4"
                  style={{ backgroundColor: '#4135F3' }}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-center text-lg font-bold text-white">
                      Create Quest
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
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
          value={
            manualDateType === 'start'
              ? manualStartDate || new Date()
              : manualEndDate || new Date()
          }
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
