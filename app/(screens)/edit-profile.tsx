import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useUserStore } from '~/store/user.store';
import { useMutation } from '@apollo/client';
import { UPDATE_PROFILE } from '~/Graphql/Mutations';

export default function EditProfilePage() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const userStore = useUserStore((state) => state.user);

  // Use mutation
  const [updateProfile] = useMutation(UPDATE_PROFILE);

  const [username, setUsername] = useState(userStore?.username || '');
  const [email, setEmail] = useState(userStore?.email || '');
  const [bio, setBio] = useState(userStore?.bio || '');
  const [profilePic, setProfilePic] = useState(userStore?.profilePic || '');
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfilePic(result.assets[0].uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        variables: {
          input: {
            username: username.trim(),
            bio: bio.trim(),
            // profilePic will be uploaded separately if changed
          },
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      console.error('Failed to update profile:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: isDark ? '#111827' : '#F9FAFB' }}>
      {/* Header */}
      <View
        className="flex-row items-center justify-between border-b px-6 py-4"
        style={{ borderBottomColor: isDark ? '#374151' : '#E5E7EB' }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#FFF' : '#000'} />
        </TouchableOpacity>
        <Text className="text-xl font-bold" style={{ color: isDark ? '#FFF' : '#000' }}>
          Edit Profile
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          <Text
            className="text-lg font-semibold"
            style={{ color: loading ? '#9CA3AF' : '#667EEA' }}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6 py-6">
        {/* Profile Picture */}
        <View className="mb-6 items-center">
          <TouchableOpacity onPress={pickImage} className="relative">
            <Image
              source={{ uri: profilePic || 'https://via.placeholder.com/150' }}
              className="h-32 w-32 rounded-full"
            />
            <View
              className="absolute bottom-0 right-0 rounded-full p-2"
              style={{ backgroundColor: '#667EEA' }}>
              <Ionicons name="camera" size={20} color="#FFF" />
            </View>
          </TouchableOpacity>
          <Text className="mt-2 text-sm" style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>
            Tap to change photo
          </Text>
        </View>

        {/* Email (Read-only) */}
        <View className="mb-4">
          <Text
            className="mb-2 text-sm font-semibold"
            style={{ color: isDark ? '#D1D5DB' : '#6B7280' }}>
            EMAIL
          </Text>
          <View
            className="rounded-xl px-4 py-3"
            style={{
              backgroundColor: isDark ? '#2D3748' : '#F3F4F6',
              borderWidth: 1,
              borderColor: isDark ? '#4B5563' : '#E5E7EB',
            }}>
            <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>{email}</Text>
          </View>
          <Text className="mt-1 text-xs" style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>
            Email cannot be changed
          </Text>
        </View>

        {/* Username */}
        <View className="mb-4">
          <Text
            className="mb-2 text-sm font-semibold"
            style={{ color: isDark ? '#D1D5DB' : '#6B7280' }}>
            USERNAME
          </Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
            className="rounded-xl px-4 py-3"
            style={{
              backgroundColor: isDark ? '#374151' : '#FFF',
              color: isDark ? '#FFF' : '#000',
              borderWidth: 1,
              borderColor: isDark ? '#4B5563' : '#E5E7EB',
            }}
          />
        </View>

        {/* Bio */}
        <View className="mb-4">
          <Text
            className="mb-2 text-sm font-semibold"
            style={{ color: isDark ? '#D1D5DB' : '#6B7280' }}>
            BIO
          </Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself..."
            placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="rounded-xl px-4 py-3"
            style={{
              backgroundColor: isDark ? '#374151' : '#FFF',
              color: isDark ? '#FFF' : '#000',
              borderWidth: 1,
              borderColor: isDark ? '#4B5563' : '#E5E7EB',
              minHeight: 100,
            }}
          />
          <Text className="mt-1 text-xs" style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>
            {bio.length}/150 characters
          </Text>
        </View>
      </ScrollView>

      {loading && (
        <View className="absolute inset-0 items-center justify-center bg-black/50">
          <ActivityIndicator size="large" color="#667EEA" />
        </View>
      )}
    </SafeAreaView>
  );
}
