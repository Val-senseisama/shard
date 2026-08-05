import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  useColorScheme,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useUserStore } from '~/store/user.store';
import { useMutation, useLazyQuery } from '@apollo/client';
import { UPDATE_PROFILE } from '~/Graphql/Mutations';
import { GET_SIGNED_UPLOAD_URL, CHECK_USERNAME } from '~/Graphql/Queries';
import { useAppStore } from '~/store/app.store';
import AnimatedPressable from '~/components/AnimatedPressable';
import { ACCENT, t } from '~/components/shard/constants';
import { avatarUri } from '~/helpers/avatarUri';

const MAX_BIRTHDATE = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 13); return d; })();
const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const parseIso = (s?: string | null): Date | null => { if (!s) return null; const d = new Date(s); return isNaN(d.getTime()) ? null : d; };

export default function EditProfilePage() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = t(isDark);
  const { addAlert } = useAppStore();
  const { user: userStore, updateUser } = useUserStore();

  const [updateProfile] = useMutation(UPDATE_PROFILE);
  const [fetchSignedUrl] = useLazyQuery(GET_SIGNED_UPLOAD_URL);
  const [checkUsernameLazy] = useLazyQuery(CHECK_USERNAME, { fetchPolicy: 'network-only' });

  const [username, setUsername] = useState(userStore?.username || '');
  const [bio, setBio] = useState(userStore?.bio || '');
  const [birthdate, setBirthdate] = useState<Date | null>(parseIso(userStore?.birthdate));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Username availability
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const trimmed = username.trim();
    if (!trimmed || trimmed === userStore?.username) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { data } = await checkUsernameLazy({ variables: { username: trimmed } });
      setUsernameStatus(data?.checkUsername?.available ? 'available' : 'taken');
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [username]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setLocalImageUri(result.assets[0].uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const uploadToCloudinary = async (localUri: string): Promise<string | null> => {
    const { data } = await fetchSignedUrl();
    const uploadInfo = data?.getSignedUploadUrl;
    if (!uploadInfo?.success || !uploadInfo?.params) return null;

    const { uploadUrl, params } = uploadInfo;
    const fileName = localUri.split('/').pop() || 'avatar.jpg';
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
    return result.secure_url || null;
  };

  const handleSave = async () => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      addAlert({ str: 'Username is required', type: 'error' });
      return;
    }
    if (usernameStatus === 'taken') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      addAlert({ str: 'That username is already taken', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      let finalProfilePic: string | undefined;
      if (localImageUri) {
        const uploaded = await uploadToCloudinary(localImageUri);
        if (!uploaded) {
          addAlert({ str: 'Image upload failed — profile saved without new photo', type: 'error' });
        } else {
          finalProfilePic = uploaded;
        }
      }

      const { data } = await updateProfile({
        variables: {
          input: {
            username: trimmedUsername,
            bio: bio.trim(),
            birthdate: birthdate ? birthdate.toISOString() : '',
            timezone,
            ...(finalProfilePic ? { profilePic: finalProfilePic } : {}),
          },
        },
      });

      if (data?.updateProfile?.success) {
        updateUser({
          username: data.updateProfile.user.username,
          bio: data.updateProfile.user.bio,
          profilePic: data.updateProfile.user.profilePic,
          birthdate: data.updateProfile.user.birthdate,
          timezone: data.updateProfile.user.timezone,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        addAlert({ str: 'Profile updated!', type: 'success' });
        router.back();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        addAlert({ str: data?.updateProfile?.message || 'Failed to update profile', type: 'error' });
      }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      addAlert({ str: e?.message || 'Something went wrong', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const displayImage = localImageUri || userStore?.profilePic || avatarUri(userStore?.profilePic, userStore?.username);

  const usernameIndicator = () => {
    if (usernameStatus === 'checking') return <ActivityIndicator size="small" color={ACCENT} />;
    if (usernameStatus === 'available') return <Ionicons name="checkmark-circle" size={18} color="#22c55e" />;
    if (usernameStatus === 'taken') return <Ionicons name="close-circle" size={18} color="#ef4444" />;
    return null;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: theme.border,
      }}>
        <AnimatedPressable onPress={() => router.back()} hitSlop={20} scaleDown={0.9} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </AnimatedPressable>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: theme.text }}>
          Edit Profile
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, gap: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* Avatar */}
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <AnimatedPressable onPress={pickImage} scaleDown={0.95} style={{ position: 'relative' }}
            accessibilityLabel="Take photo">
            <Image
              source={{ uri: displayImage }}
              style={{ width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: ACCENT }}
            />
            <View style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 30, height: 30, borderRadius: 15,
              backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center',
              borderWidth: 2, borderColor: theme.bg,
            }}>
              <Ionicons name="camera" size={15} color="#fff" />
            </View>
          </AnimatedPressable>
          <Text style={{ marginTop: 8, fontSize: 12, color: theme.textSecondary }}>
            {localImageUri ? 'New photo selected — save to upload' : 'Tap to change photo'}
          </Text>
        </View>

        {/* Email (read-only) */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.2, color: theme.textSecondary }}>
            Email
          </Text>
          <View style={{
            borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
            backgroundColor: isDark ? '#141414' : '#f3f4f6',
            borderWidth: 1, borderColor: theme.border,
          }}>
            <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{userStore?.email || ''}</Text>
          </View>
          <Text style={{ fontSize: 11, color: theme.textSecondary }}>Email cannot be changed</Text>
        </View>

        {/* Username */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.2, color: theme.textSecondary }}>
            Username
          </Text>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            borderRadius: 12, borderWidth: 1,
            borderColor: usernameStatus === 'taken' ? '#ef4444' : usernameStatus === 'available' ? '#22c55e' : theme.border,
            backgroundColor: theme.card, paddingHorizontal: 14,
          }}>
            <TextInput
              value={username}
              onChangeText={(v) => setUsername(v.slice(0, 30))}
              placeholder="Enter username"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              style={{ flex: 1, paddingVertical: 12, fontSize: 14, color: theme.text }}
            />
            <View style={{ paddingLeft: 8 }}>{usernameIndicator()}</View>
          </View>
          {usernameStatus === 'taken' && (
            <Text style={{ fontSize: 11, color: '#ef4444' }}>Username already taken</Text>
          )}
          {usernameStatus === 'available' && (
            <Text style={{ fontSize: 11, color: '#22c55e' }}>Username available</Text>
          )}
          <Text style={{ fontSize: 11, color: theme.textSecondary, textAlign: 'right' }}>
            {username.length}/30
          </Text>
        </View>

        {/* Bio */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.2, color: theme.textSecondary }}>
            Bio
          </Text>
          <TextInput
            value={bio}
            onChangeText={(v) => setBio(v.slice(0, 150))}
            placeholder="Tell us about yourself..."
            placeholderTextColor={theme.textSecondary}
            multiline
            textAlignVertical="top"
            style={{
              borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
              fontSize: 14, backgroundColor: theme.card, color: theme.text,
              borderWidth: 1, borderColor: theme.border, minHeight: 100,
            }}
          />
          <Text style={{ fontSize: 11, color: theme.textSecondary, textAlign: 'right' }}>
            {bio.length}/150
          </Text>
        </View>

        {/* Birthdate */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.2, color: theme.textSecondary }}>
            Birthday
          </Text>
          <AnimatedPressable
            onPress={() => setShowDatePicker(true)}
            scaleDown={0.98}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
              backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border,
            }}>
            <Text style={{ fontSize: 14, color: birthdate ? theme.text : theme.textSecondary }}>
              {birthdate ? formatDate(birthdate) : 'Set your birthday (optional)'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {birthdate && (
                <AnimatedPressable onPress={() => setBirthdate(null)} hitSlop={8} scaleDown={0.9} accessibilityLabel="Clear">
                  <Ionicons name="close-circle" size={18} color="#9ca3af" />
                </AnimatedPressable>
              )}
              <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
            </View>
          </AnimatedPressable>
          {showDatePicker && (
            <DateTimePicker
              value={birthdate || MAX_BIRTHDATE}
              mode="date"
              maximumDate={MAX_BIRTHDATE}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (date) setBirthdate(date);
              }}
            />
          )}
          <Text style={{ fontSize: 11, color: theme.textSecondary }}>
            Used to personalise your AI quest plans. Never shown publicly.
          </Text>
        </View>

        {/* Timezone (auto-detected, read-only) */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.2, color: theme.textSecondary }}>
            Timezone
          </Text>
          <View style={{
            borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
            backgroundColor: isDark ? '#141414' : '#f3f4f6',
            borderWidth: 1, borderColor: theme.border,
            flexDirection: 'row', alignItems: 'center', gap: 8,
          }}>
            <Ionicons name="globe-outline" size={16} color={theme.textSecondary} />
            <Text style={{ color: theme.text, fontSize: 14 }}>{timezone}</Text>
          </View>
          <Text style={{ fontSize: 11, color: theme.textSecondary }}>
            Auto-detected from your device. Used for deadline reminders.
          </Text>
        </View>
      </ScrollView>

      {/* Save button */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12 }}>
        <AnimatedPressable
          onPress={handleSave}
          disabled={loading || usernameStatus === 'taken'}
          scaleDown={0.97}
          style={{
            backgroundColor: ACCENT, borderRadius: 16,
            paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
            opacity: loading || usernameStatus === 'taken' ? 0.6 : 1,
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
