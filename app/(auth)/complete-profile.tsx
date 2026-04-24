import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useQuery, useMutation } from '@apollo/client';
import { CHECK_USERNAME } from '~/Graphql/Queries';
import { UPDATE_PROFILE } from '~/Graphql/Mutations';
import { useAppStore } from '~/store/app.store';
import AnimatedPressable from '~/components/AnimatedPressable';
import AddImageInput from '@/components/AddImageInput';
import { ACCENT, t } from '~/components/shard/constants';

const GENDER_OPTIONS = [
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];

const CompleteProfile = () => {
  const isDark = useColorScheme() === 'dark';
  const theme = t(isDark);
  const { addAlert } = useAppStore();

  const [profileImage, setProfileImage] = useState('');
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState('prefer_not_to_say');
  const [showGender, setShowGender] = useState(false);
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  const { refetch: checkUsernameQuery } = useQuery(CHECK_USERNAME, {
    variables: { username },
    skip: true,
  });

  const [completeProfile, { loading }] = useMutation(UPDATE_PROFILE, {
    onCompleted: (data) => {
      if (data.updateProfile?.success) {
        router.replace('/(screens)/Home');
      } else {
        addAlert({ str: data.updateProfile?.message || 'Failed to complete profile', type: 'error' });
      }
    },
    onError: () => {
      addAlert({ str: 'Failed to complete profile. Please try again.', type: 'error' });
    },
  });

  // Debounced username availability check
  useEffect(() => {
    if (username.length < 3) { setUsernameStatus('idle'); return; }
    setUsernameStatus('checking');
    const id = setTimeout(async () => {
      try {
        const { data } = await checkUsernameQuery();
        setUsernameStatus(data?.checkUsername?.available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('idle');
      }
    }, 600);
    return () => clearTimeout(id);
  }, [username]);

  const handleSave = async () => {
    if (!username.trim()) {
      addAlert({ str: 'Please enter a username', type: 'error' });
      return;
    }
    if (username.trim().length < 3) {
      addAlert({ str: 'Username must be at least 3 characters', type: 'error' });
      return;
    }
    if (usernameStatus === 'taken') {
      addAlert({ str: 'This username is already taken', type: 'error' });
      return;
    }
    await completeProfile({ variables: { input: { username: username.trim(), profilePic: profileImage || undefined } } });
  };

  const usernameBorder = usernameStatus === 'taken' ? '#ef4444' : usernameStatus === 'available' ? '#10b981' : usernameFocused ? ACCENT : isDark ? '#374151' : '#e5e7eb';

  const cardBg = isDark ? '#1a1a1a' : '#fff';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0f0f0f' : '#eaeaf5' }}>
      <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Title */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <Text style={{ fontSize: 32, fontWeight: '900', letterSpacing: 4, color: isDark ? '#fff' : '#1a1a1a', marginBottom: 8 }}>
            SH<Text style={{ color: ACCENT }}>▲</Text>RD
          </Text>
          <Text style={{ fontSize: 16, color: theme.textSecondary }}>Complete your profile</Text>
        </View>

        {/* Card */}
        <View style={{ backgroundColor: cardBg, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: isDark ? 0 : 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}>

          {/* Profile image */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <AddImageInput onImage={(uri: string) => setProfileImage(uri)} />
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 8 }}>Tap to add a photo</Text>
          </View>

          {/* Username */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, letterSpacing: 0.5, marginBottom: 6 }}>USERNAME</Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: isDark ? '#1a1a1a' : '#f9fafb',
              borderRadius: 12, borderWidth: 1.5, borderColor: usernameBorder,
              paddingHorizontal: 14, paddingVertical: 12,
            }}>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="yourhandle"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                style={{ flex: 1, fontSize: 15, color: theme.text }}
                onFocus={() => setUsernameFocused(true)}
                onBlur={() => setUsernameFocused(false)}
              />
              {usernameStatus === 'checking' && <ActivityIndicator size="small" color={ACCENT} />}
              {usernameStatus === 'available' && <Ionicons name="checkmark-circle" size={20} color="#10b981" />}
              {usernameStatus === 'taken' && <Ionicons name="close-circle" size={20} color="#ef4444" />}
            </View>
            {usernameStatus === 'taken' && (
              <Text style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>Username is already taken</Text>
            )}
            {usernameStatus === 'available' && (
              <Text style={{ fontSize: 12, color: '#10b981', marginTop: 4 }}>Username is available</Text>
            )}
          </View>

          {/* Gender */}
          <View style={{ marginBottom: 28 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, letterSpacing: 0.5, marginBottom: 6 }}>GENDER</Text>
            <TouchableOpacity
              onPress={() => setShowGender(s => !s)}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: isDark ? '#1a1a1a' : '#f9fafb',
                borderRadius: 12, borderWidth: 1.5, borderColor: isDark ? '#374151' : '#e5e7eb',
                paddingHorizontal: 14, paddingVertical: 14,
              }}>
              <Text style={{ fontSize: 15, color: theme.text }}>
                {GENDER_OPTIONS.find(o => o.value === gender)?.label}
              </Text>
              <Ionicons name={showGender ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
            </TouchableOpacity>

            {showGender && (
              <View style={{ marginTop: 4, backgroundColor: isDark ? '#1a1a1a' : '#f9fafb', borderRadius: 12, borderWidth: 1, borderColor: isDark ? '#374151' : '#e5e7eb', overflow: 'hidden' }}>
                {GENDER_OPTIONS.map((opt, i) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => { setGender(opt.value); setShowGender(false); }}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 13,
                      borderBottomWidth: i < GENDER_OPTIONS.length - 1 ? 1 : 0,
                      borderBottomColor: isDark ? '#2a2a2a' : '#e5e7eb',
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                    <Text style={{ fontSize: 15, color: theme.text }}>{opt.label}</Text>
                    {gender === opt.value && <Ionicons name="checkmark" size={18} color={ACCENT} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Save button */}
          <AnimatedPressable onPress={handleSave} scaleDown={0.96} disabled={loading || usernameStatus === 'taken'}>
            <LinearGradient colors={['#7c3aed', '#6d28d9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' }}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Complete Profile</Text>
              )}
            </LinearGradient>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CompleteProfile;
