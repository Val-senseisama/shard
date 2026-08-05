import React from 'react';
import { View, Text, ScrollView, useColorScheme, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyPolicyPage() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

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
          {/* Header */}
          <View
            className="flex-row items-center justify-between border-b px-6 py-4"
            style={{ borderBottomColor: isDark ? '#374151' : '#E5E7EB' }}>
            <View className="flex-row items-center gap-3">
              <Ionicons
                name="shield-checkmark-outline"
                size={24}
                color={isDark ? '#FFF' : '#000'}
              />
              <Text className="text-xl font-bold" style={{ color: isDark ? '#FFF' : '#000' }}>
                Privacy Policy
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
            </TouchableOpacity>
          </View>

          <ScrollView className="p-6" showsVerticalScrollIndicator={false}>
            <Text className="mb-4 text-sm" style={{ color: isDark ? '#D1D5DB' : '#4B5563' }}>
              Last updated: December 26, 2025
            </Text>

            <Text className="mb-2 text-lg font-bold" style={{ color: isDark ? '#FFF' : '#000' }}>
              1. Information We Collect
            </Text>
            <Text className="mb-6 text-base" style={{ color: isDark ? '#D1D5DB' : '#4B5563' }}>
              We collect information you provide directly to us, such as your name, email address,
              and profile picture. We also collect data about your tasks and goals to provide AI
              recommendations.
            </Text>

            <Text className="mb-2 text-lg font-bold" style={{ color: isDark ? '#FFF' : '#000' }}>
              2. How We Use Your Information
            </Text>
            <Text className="mb-6 text-base" style={{ color: isDark ? '#D1D5DB' : '#4B5563' }}>
              We use your information to operate and improve the App, personalize your experience,
              and communicate with you about updates and features.
            </Text>

            <Text className="mb-2 text-lg font-bold" style={{ color: isDark ? '#FFF' : '#000' }}>
              3. Data Security
            </Text>
            <Text className="mb-6 text-base" style={{ color: isDark ? '#D1D5DB' : '#4B5563' }}>
              We implement appropriate security measures to protect your personal information.
              However, no method of transmission over the internet is 100% secure.
            </Text>

            <Text className="mb-2 text-lg font-bold" style={{ color: isDark ? '#FFF' : '#000' }}>
              4. Third-Party Services
            </Text>
            <Text className="mb-6 text-base" style={{ color: isDark ? '#D1D5DB' : '#4B5563' }}>
              We may use third-party services for analytics, payment processing, and AI generation.
              These services have their own privacy policies.
            </Text>

            <Text className="mb-2 text-lg font-bold" style={{ color: isDark ? '#FFF' : '#000' }}>
              5. Contact Us
            </Text>
            <Text className="mb-6 text-base" style={{ color: isDark ? '#D1D5DB' : '#4B5563' }}>
              If you have any questions about this Privacy Policy, please contact us through the
              Help & Support section of the App.
            </Text>

            <View className="h-10" />
          </ScrollView>
        </SafeAreaView>
      </View>
    </View>
  );
}
