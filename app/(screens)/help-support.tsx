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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function HelpSupportPage() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    }, 1500);
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
                <Ionicons name="help-buoy-outline" size={24} color={isDark ? '#FFF' : '#000'} />
                <Text className="text-xl font-bold" style={{ color: isDark ? '#FFF' : '#000' }}>
                  Help & Support
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
              </TouchableOpacity>
            </View>

            <ScrollView className="" showsVerticalScrollIndicator={false}>
              <View className="p-6">
                <Text className="mb-6 text-sm" style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>
                  Have a question or found a bug? Let us know and we'll get back to you as soon as
                  possible.
                </Text>

                {/* Subject */}
                <View className="mb-4">
                  <Text
                    className="mb-2 text-sm font-semibold"
                    style={{ color: isDark ? '#D1D5DB' : '#6B7280' }}>
                    SUBJECT
                  </Text>
                  <View
                    className="rounded-xl border px-4 py-3"
                    style={{
                      backgroundColor: isDark ? '#374151' : '#F9FAFB',
                      borderColor: isDark ? '#4B5563' : '#E5E7EB',
                    }}>
                    <TextInput
                      value={subject}
                      onChangeText={setSubject}
                      placeholder="What's this about?"
                      placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                      style={{ color: isDark ? '#FFF' : '#000' }}
                    />
                  </View>
                </View>

                {/* Message */}
                <View className="mb-6">
                  <Text
                    className="mb-2 text-sm font-semibold"
                    style={{ color: isDark ? '#D1D5DB' : '#6B7280' }}>
                    MESSAGE
                  </Text>
                  <View
                    className="rounded-xl border px-4 py-3"
                    style={{
                      backgroundColor: isDark ? '#374151' : '#F9FAFB',
                      borderColor: isDark ? '#4B5563' : '#E5E7EB',
                      minHeight: 120,
                    }}>
                    <TextInput
                      value={message}
                      onChangeText={setMessage}
                      placeholder="Describe your issue or question..."
                      placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                      multiline
                      textAlignVertical="top"
                      style={{ color: isDark ? '#FFF' : '#000', height: 120 }}
                    />
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={loading}
                  className="rounded-xl py-4"
                  style={{ backgroundColor: loading ? '#9CA3AF' : '#667EEA' }}>
                  <Text className="text-center text-lg font-bold text-white">
                    {loading ? 'Sending...' : 'Send Message'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </View>
  );
}
