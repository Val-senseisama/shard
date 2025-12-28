import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, useColorScheme, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function SubscribeToProPage() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  const features = [
    { icon: 'infinite', text: 'Unlimited AI Task Generation', pro: true, free: '10/month' },
    { icon: 'trending-up', text: 'Unlimited Shards (Goals)', pro: true, free: '5 active' },
    { icon: 'people', text: 'Unlimited Collaborators', pro: true, free: '1 partner' },
    { icon: 'analytics', text: 'Advanced Analytics & Insights', pro: true, free: false },
    { icon: 'cloud-upload', text: 'Cloud Backup & Export', pro: true, free: false },
    { icon: 'notifications-off', text: 'Ad-Free Experience', pro: true, free: false },
    { icon: 'flash', text: 'Priority AI Processing', pro: true, free: false },
    { icon: 'calendar', text: 'Advanced Scheduling Tools', pro: true, free: false },
    { icon: 'shield-checkmark', text: 'Streak Freeze Protection', pro: true, free: false },
    { icon: 'rocket', text: 'Early Access to New Features', pro: true, free: false },
  ];

  const handleSubscribe = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    // Handle subscription
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: isDark ? '#111827' : '#F9FAFB' }}>
      {/* Header */}
      <View className="flex-row items-center px-6 py-4">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={isDark ? '#FFF' : '#000'} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6">
        {/* Hero */}
        <Animated.View entering={FadeInDown.delay(100)} className="mb-8 items-center">
          <View
            className="mb-4 h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: '#FFD700' }}>
            <Ionicons name="diamond" size={40} color="#FFF" />
          </View>
          <Text
            className="mb-2 text-center text-3xl font-bold"
            style={{ color: isDark ? '#FFF' : '#000' }}>
            Upgrade to Pro
          </Text>
          <Text className="text-center text-lg" style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>
            Unlock unlimited potential
          </Text>
        </Animated.View>

        {/* Plan Toggle */}
        <Animated.View
          entering={FadeInDown.delay(200)}
          className="mb-8 flex-row rounded-xl p-1"
          style={{ backgroundColor: isDark ? '#374151' : '#E5E7EB' }}>
          <TouchableOpacity
            onPress={() => {
              setSelectedPlan('monthly');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            className="flex-1 rounded-lg py-3"
            style={{
              backgroundColor: selectedPlan === 'monthly' ? '#667EEA' : 'transparent',
            }}>
            <Text
              className="text-center font-semibold"
              style={{
                color: selectedPlan === 'monthly' ? '#FFF' : isDark ? '#9CA3AF' : '#6B7280',
              }}>
              Monthly
            </Text>
            <Text
              className="text-center text-sm"
              style={{
                color: selectedPlan === 'monthly' ? '#FFF' : isDark ? '#9CA3AF' : '#6B7280',
              }}>
              $9.99/mo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setSelectedPlan('yearly');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            className="relative flex-1 rounded-lg py-3"
            style={{
              backgroundColor: selectedPlan === 'yearly' ? '#667EEA' : 'transparent',
            }}>
            <View className="absolute -top-3 right-2 rounded-full bg-green-500 px-2 py-1">
              <Text className="text-xs font-bold text-white">SAVE 40%</Text>
            </View>
            <Text
              className="text-center font-semibold"
              style={{
                color: selectedPlan === 'yearly' ? '#FFF' : isDark ? '#9CA3AF' : '#6B7280',
              }}>
              Yearly
            </Text>
            <Text
              className="text-center text-sm"
              style={{
                color: selectedPlan === 'yearly' ? '#FFF' : isDark ? '#9CA3AF' : '#6B7280',
              }}>
              $5.99/mo
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Features Comparison */}
        <View className="mb-8">
          <Text
            className="mb-4 text-center text-sm"
            style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>
            ✨ Unlock everything with Pro
          </Text>
          {features.map((feature, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.delay(300 + index * 50)}
              className="flex-row items-center justify-between border-b py-4"
              style={{ borderBottomColor: isDark ? '#374151' : '#E5E7EB' }}>
              <View className="flex-1 flex-row items-center">
                <View
                  className="mr-3 h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: '#667EEA20' }}>
                  <Ionicons name={feature.icon as any} size={20} color="#667EEA" />
                </View>
                <View className="flex-1">
                  <Text className="font-medium" style={{ color: isDark ? '#FFF' : '#000' }}>
                    {feature.text}
                  </Text>
                  {feature.free && (
                    <Text
                      className="mt-1 text-xs"
                      style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>
                      Free: {feature.free}
                    </Text>
                  )}
                </View>
              </View>
              <View className="flex-row items-center gap-2">
                {feature.free ? (
                  <>
                    <View
                      className="rounded px-2 py-1"
                      style={{ backgroundColor: isDark ? '#374151' : '#F3F4F6' }}>
                      <Text className="text-xs" style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>
                        Limited
                      </Text>
                    </View>
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color={isDark ? '#4B5563' : '#9CA3AF'}
                    />
                  </>
                ) : null}
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Price Summary */}
        <Animated.View
          entering={FadeInDown.delay(600)}
          className="mb-6 rounded-xl p-4"
          style={{ backgroundColor: isDark ? '#374151' : '#F3F4F6' }}>
          <View className="mb-2 flex-row justify-between">
            <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>
              {selectedPlan === 'yearly' ? 'Yearly Plan' : 'Monthly Plan'}
            </Text>
            <Text className="font-bold" style={{ color: isDark ? '#FFF' : '#000' }}>
              ${selectedPlan === 'yearly' ? '71.88' : '9.99'}
            </Text>
          </View>
          {selectedPlan === 'yearly' && (
            <Text className="text-sm text-green-500">You save $47.88 per year!</Text>
          )}
        </Animated.View>
      </ScrollView>

      {/* Subscribe Button */}
      <View
        className="border-t px-6 py-4"
        style={{ borderTopColor: isDark ? '#374151' : '#E5E7EB' }}>
        <TouchableOpacity
          onPress={handleSubscribe}
          className="rounded-xl py-4"
          style={{ backgroundColor: '#FFD700' }}>
          <Text className="text-center text-lg font-bold" style={{ color: '#000' }}>
            Subscribe Now
          </Text>
        </TouchableOpacity>
        <Text
          className="mt-2 text-center text-xs"
          style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>
          Cancel anytime. No questions asked.
        </Text>
      </View>
    </SafeAreaView>
  );
}
