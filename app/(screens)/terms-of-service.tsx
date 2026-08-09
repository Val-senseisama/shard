import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useColorScheme } from '~/hooks/useColorScheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TermsOfServicePage() {
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
              <Ionicons name="document-text-outline" size={24} color={isDark ? '#FFF' : '#000'} />
              <Text className="text-xl font-bold" style={{ color: isDark ? '#FFF' : '#000' }}>
                Terms of Service
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
              1. Acceptance of Terms
            </Text>
            <Text className="mb-6 text-base" style={{ color: isDark ? '#D1D5DB' : '#4B5563' }}>
              By accessing and using Shard ("the App"), you agree to be bound by these Terms of
              Service. If you do not agree to these terms, please do not use the App.
            </Text>

            <Text className="mb-2 text-lg font-bold" style={{ color: isDark ? '#FFF' : '#000' }}>
              2. Description of Service
            </Text>
            <Text className="mb-6 text-base" style={{ color: isDark ? '#D1D5DB' : '#4B5563' }}>
              Shard is a productivity application that uses AI to help users break down goals into
              manageable tasks. We provide tools for task management, scheduling, and collaboration.
            </Text>

            <Text className="mb-2 text-lg font-bold" style={{ color: isDark ? '#FFF' : '#000' }}>
              3. User Accounts
            </Text>
            <Text className="mb-6 text-base" style={{ color: isDark ? '#D1D5DB' : '#4B5563' }}>
              You are responsible for maintaining the confidentiality of your account credentials.
              You agree to notify us immediately of any unauthorized use of your account.
            </Text>

            <Text className="mb-2 text-lg font-bold" style={{ color: isDark ? '#FFF' : '#000' }}>
              4. Pro Subscription
            </Text>
            <Text className="mb-6 text-base" style={{ color: isDark ? '#D1D5DB' : '#4B5563' }}>
              Shard offers a Pro subscription with additional features. Subscriptions automatically
              renew unless cancelled at least 24 hours before the end of the current period.
            </Text>

            <Text className="mb-2 text-lg font-bold" style={{ color: isDark ? '#FFF' : '#000' }}>
              5. Content Guidelines
            </Text>
            <Text className="mb-6 text-base" style={{ color: isDark ? '#D1D5DB' : '#4B5563' }}>
              You agree not to use the App to create or share content that is illegal, harmful, or
              violates the rights of others.
            </Text>

            <View className="h-10" />
          </ScrollView>
        </SafeAreaView>
      </View>
    </View>
  );
}
