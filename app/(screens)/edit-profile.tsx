import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
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
import AnimatedPressable from '~/components/AnimatedPressable';
import { ACCENT, t } from '~/components/shard/constants';
import { avatarUri } from '~/helpers/avatarUri';

export default function EditProfilePage() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = t(isDark);
  const userStore = useUserStore((state) => state.user);

  const [updateProfile] = useMutation(UPDATE_PROFILE);

  const [username, setUsername] = useState(userStore?.username || '');
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
          },
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}>
        <AnimatedPressable onPress={() => router.back()} hitSlop={20} scaleDown={0.9}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </AnimatedPressable>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: theme.text }}>
          Edit Profile
        </Text>
        {/* Spacer to balance the back button */}
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, gap: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* Avatar */}
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <AnimatedPressable onPress={pickImage} scaleDown={0.95} style={{ position: 'relative' }}>
            <Image
              source={{ uri: profilePic || avatarUri(userStore?.profilePic, userStore?.username) }}
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                borderWidth: 3,
                borderColor: ACCENT,
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: ACCENT,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: theme.bg,
              }}>
              <Ionicons name="camera" size={15} color="#fff" />
            </View>
          </AnimatedPressable>
          <Text style={{ marginTop: 8, fontSize: 12, color: theme.textSecondary }}>
            Tap to change photo
          </Text>
        </View>

        {/* Email (read-only) */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', color: theme.textSecondary }}>
            Email
          </Text>
          <View
            style={{
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              backgroundColor: isDark ? '#141414' : '#f3f4f6',
              borderWidth: 1,
              borderColor: theme.border,
            }}>
            <Text style={{ color: theme.textSecondary, fontSize: 14 }}>
              {userStore?.email || ''}
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: theme.textSecondary }}>Email cannot be changed</Text>
        </View>

        {/* Username */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', color: theme.textSecondary }}>
            Username
          </Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            placeholderTextColor={theme.textSecondary}
            style={{
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 14,
              backgroundColor: theme.card,
              color: theme.text,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          />
        </View>

        {/* Bio */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', color: theme.textSecondary }}>
            Bio
          </Text>
          <TextInput
            value={bio}
            onChangeText={(t) => setBio(t.slice(0, 150))}
            placeholder="Tell us about yourself..."
            placeholderTextColor={theme.textSecondary}
            multiline
            textAlignVertical="top"
            style={{
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 14,
              backgroundColor: theme.card,
              color: theme.text,
              borderWidth: 1,
              borderColor: theme.border,
              minHeight: 100,
            }}
          />
          <Text style={{ fontSize: 11, color: theme.textSecondary, textAlign: 'right' }}>
            {bio.length}/150
          </Text>
        </View>
      </ScrollView>

      {/* Save block button */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12 }}>
        <AnimatedPressable
          onPress={handleSave}
          disabled={loading}
          scaleDown={0.97}
          style={{
            backgroundColor: ACCENT,
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: loading ? 0.7 : 1,
          }}>
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Save Changes</Text>
          )}
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );
}
