import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMutation } from '@apollo/client';
import { CHANGE_PASSWORD } from '~/Graphql/Mutations';
import Toast from 'react-native-toast-message';
import AnimatedPressable from '~/components/AnimatedPressable';

export default function ChangePasswordPage() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [changePassword] = useMutation(CHANGE_PASSWORD);

  const handleSubmit = async () => {
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    try {
      const { data } = await changePassword({ variables: { currentPassword, newPassword } });
      if (data?.changePassword?.success === false) {
        setError(data.changePassword.message || 'Incorrect current password');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Password changed successfully' });
      router.back();
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}>
      <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => router.back()} />
      <View
        style={{
          backgroundColor: isDark ? '#111827' : '#F9FAFB',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          maxHeight: '85%',
          paddingBottom: 20,
        }}>
        <SafeAreaView edges={['bottom']}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            {/* Header */}
            <View
              className="flex-row items-center justify-between border-b px-6 py-4"
              style={{ borderBottomColor: isDark ? '#374151' : '#E5E7EB' }}>
              <View className="flex-row items-center gap-3">
                <Ionicons name="lock-closed-outline" size={24} color={isDark ? '#FFF' : '#000'} />
                <Text className="text-xl font-bold" style={{ color: isDark ? '#FFF' : '#000' }}>
                  Change Password
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="close" size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
              </TouchableOpacity>
            </View>

            {/* Form */}
            <ScrollView className="" showsVerticalScrollIndicator={false}>
              <View className="p-6">
                {/* Current Password */}
                <View className="mb-4">
                  <Text
                    className="mb-2 text-sm font-semibold"
                    style={{ color: isDark ? '#D1D5DB' : '#6B7280' }}>
                    CURRENT PASSWORD
                  </Text>
                  <View
                    className="flex-row items-center rounded-xl border px-4 py-3"
                    style={{
                      backgroundColor: isDark ? '#374151' : '#F9FAFB',
                      borderColor: isDark ? '#4B5563' : '#E5E7EB',
                    }}>
                    <TextInput
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      secureTextEntry={!showCurrent}
                      placeholder="Enter current password"
                      placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                      className="flex-1"
                      style={{ color: isDark ? '#FFF' : '#000' }}
                    />
                    <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                      <Ionicons
                        name={showCurrent ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={isDark ? '#9CA3AF' : '#6B7280'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* New Password */}
                <View className="mb-4">
                  <Text
                    className="mb-2 text-sm font-semibold"
                    style={{ color: isDark ? '#D1D5DB' : '#6B7280' }}>
                    NEW PASSWORD
                  </Text>
                  <View
                    className="flex-row items-center rounded-xl border px-4 py-3"
                    style={{
                      backgroundColor: isDark ? '#374151' : '#F9FAFB',
                      borderColor: isDark ? '#4B5563' : '#E5E7EB',
                    }}>
                    <TextInput
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNew}
                      placeholder="Enter new password"
                      placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                      className="flex-1"
                      style={{ color: isDark ? '#FFF' : '#000' }}
                    />
                    <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                      <Ionicons
                        name={showNew ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={isDark ? '#9CA3AF' : '#6B7280'}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text className="mt-1 text-xs" style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>
                    Minimum 8 characters
                  </Text>
                </View>

                {/* Confirm Password */}
                <View className="mb-6">
                  <Text
                    className="mb-2 text-sm font-semibold"
                    style={{ color: isDark ? '#D1D5DB' : '#6B7280' }}>
                    CONFIRM NEW PASSWORD
                  </Text>
                  <View
                    className="flex-row items-center rounded-xl border px-4 py-3"
                    style={{
                      backgroundColor: isDark ? '#374151' : '#F9FAFB',
                      borderColor: isDark ? '#4B5563' : '#E5E7EB',
                    }}>
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirm}
                      placeholder="Confirm new password"
                      placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                      className="flex-1"
                      style={{ color: isDark ? '#FFF' : '#000' }}
                    />
                    <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                      <Ionicons
                        name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={isDark ? '#9CA3AF' : '#6B7280'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Error */}
                {error ? (
                  <View className="mb-4 rounded-lg p-3" style={{ backgroundColor: '#FEE2E2' }}>
                    <Text className="text-sm text-red-600">{error}</Text>
                  </View>
                ) : null}

                {/* Submit Button */}
                <AnimatedPressable onPress={handleSubmit} disabled={loading} scaleDown={0.96}>
                  <View className="rounded-xl py-4" style={{ backgroundColor: loading ? '#9CA3AF' : '#7c3aed', alignItems: 'center', justifyContent: 'center', height: 52 }}>
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="text-center text-lg font-bold text-white">Change Password</Text>
                    )}
                  </View>
                </AnimatedPressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </View>
  );
}
