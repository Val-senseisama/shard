import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Dimensions,
  Switch,
} from 'react-native';
import Animated, {
  withSpring,
  withTiming,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
// Optional haptic feedback
let Haptics: any;
try {
  Haptics = require('expo-haptics');
} catch (e) {
  Haptics = null;
}

const { width } = Dimensions.get('window');

interface WorkloadSettingsProps {
  visible: boolean;
  onClose: () => void;
  currentSettings: {
    workloadLevel: 'light' | 'medium' | 'aggressive';
    maxTasksPerDay: number;
    workingDays: number[];
    preferredTaskDuration: 'short' | 'medium' | 'long';
  };
  onSave: (settings: any) => void;
}

export default function WorkloadSettings({
  visible,
  onClose,
  currentSettings,
  onSave,
}: WorkloadSettingsProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [workloadLevel, setWorkloadLevel] = useState(currentSettings.workloadLevel);
  const [maxTasks, setMaxTasks] = useState(currentSettings.maxTasksPerDay);
  const [workingDays, setWorkingDays] = useState(currentSettings.workingDays);
  const [taskDuration, setTaskDuration] = useState(currentSettings.preferredTaskDuration);

  const translateX = useSharedValue(width);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateX.value = withSpring(0, { damping: 20 });
      backdropOpacity.value = withTiming(1);
    } else {
      translateX.value = withSpring(width);
      backdropOpacity.value = withTiming(0);
    }
  }, [visible]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handleSave = () => {
    Haptics?.impactAsync?.(Haptics?.ImpactFeedbackStyle?.Medium);
    onSave({
      workloadLevel,
      maxTasksPerDay: maxTasks,
      workingDays,
      preferredTaskDuration: taskDuration,
    });
    onClose();
  };

  const toggleDay = (day: number) => {
    Haptics?.impactAsync?.(Haptics?.ImpactFeedbackStyle?.Light);
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const workloadOptions = [
    { value: 'light', label: 'Light', icon: 'sunny-outline', tasks: '2/day', color: '#10B981' },
    {
      value: 'medium',
      label: 'Medium',
      icon: 'partly-sunny-outline',
      tasks: '4/day',
      color: '#F59E0B',
    },
    {
      value: 'aggressive',
      label: 'Aggressive',
      icon: 'thunderstorm-outline',
      tasks: '7/day',
      color: '#EF4444',
    },
  ];

  const durationOptions = [
    { value: 'short', label: 'Short', time: '15-30 min' },
    { value: 'medium', label: 'Medium', time: '30-60 min' },
    { value: 'long', label: 'Long', time: '1-2 hours' },
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        style={[
          backdropStyle,
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 999,
          },
        ]}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Panel */}
      <Animated.View
        style={[
          panelStyle,
          {
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: width * 0.85,
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            zIndex: 1000,
            shadowColor: '#000',
            shadowOffset: { width: -2, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          },
        ]}>
        <ScrollView className="flex-1">
          {/* Header */}
          <View
            className="flex-row items-center justify-between border-b px-6 py-6"
            style={{ borderBottomColor: isDark ? '#374151' : '#E5E7EB' }}>
            <View className="flex-row items-center gap-3">
              <Ionicons name="settings-outline" size={24} color={isDark ? '#FFF' : '#000'} />
              <Text className="text-xl font-bold" style={{ color: isDark ? '#FFF' : '#000' }}>
                Workload Settings
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
            </TouchableOpacity>
          </View>

          <View className="p-6">
            {/* Workload Level */}
            <Text
              className="mb-3 text-sm font-semibold"
              style={{ color: isDark ? '#D1D5DB' : '#6B7280' }}>
              DAILY WORKLOAD
            </Text>

            {workloadOptions.map((option: any) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setWorkloadLevel(option.value);
                }}
                className="mb-3 rounded-xl border-2 p-4"
                style={{
                  backgroundColor:
                    workloadLevel === option.value
                      ? isDark
                        ? option.color + '20'
                        : option.color + '10'
                      : isDark
                        ? '#374151'
                        : '#F9FAFB',
                  borderColor: workloadLevel === option.value ? option.color : 'transparent',
                }}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <View
                      className="rounded-full p-2"
                      style={{ backgroundColor: option.color + '20' }}>
                      <Ionicons name={option.icon} size={24} color={option.color} />
                    </View>
                    <View>
                      <Text
                        className="text-lg font-semibold"
                        style={{ color: isDark ? '#FFF' : '#000' }}>
                        {option.label}
                      </Text>
                      <Text
                        className="text-sm opacity-60"
                        style={{ color: isDark ? '#FFF' : '#000' }}>
                        ~{option.tasks}
                      </Text>
                    </View>
                  </View>
                  {workloadLevel === option.value && (
                    <Ionicons name="checkmark-circle" size={24} color={option.color} />
                  )}
                </View>
              </TouchableOpacity>
            ))}

            {/* Working Days */}
            <Text
              className="mb-3 mt-6 text-sm font-semibold"
              style={{ color: isDark ? '#D1D5DB' : '#6B7280' }}>
              WORKING DAYS
            </Text>

            <View className="flex-row justify-between gap-2">
              {dayNames.map((day, index) => {
                const isSelected = workingDays.includes(index);
                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => toggleDay(index)}
                    className="flex-1 items-center rounded-lg py-3"
                    style={{
                      backgroundColor: isSelected ? '#667EEA' : isDark ? '#374151' : '#F3F4F6',
                    }}>
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: isSelected ? '#FFF' : isDark ? '#9CA3AF' : '#6B7280' }}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Task Duration */}
            <Text
              className="mb-3 mt-6 text-sm font-semibold"
              style={{ color: isDark ? '#D1D5DB' : '#6B7280' }}>
              PREFERRED TASK LENGTH
            </Text>

            {durationOptions.map((option: any) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTaskDuration(option.value);
                }}
                className="mb-2 rounded-lg border p-4"
                style={{
                  backgroundColor:
                    taskDuration === option.value
                      ? isDark
                        ? '#667EEA20'
                        : '#667EEA10'
                      : isDark
                        ? '#374151'
                        : '#F9FAFB',
                  borderColor: taskDuration === option.value ? '#667EEA' : 'transparent',
                }}>
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="font-semibold" style={{ color: isDark ? '#FFF' : '#000' }}>
                      {option.label}
                    </Text>
                    <Text
                      className="text-xs opacity-60"
                      style={{ color: isDark ? '#FFF' : '#000' }}>
                      {option.time}
                    </Text>
                  </View>
                  {taskDuration === option.value && (
                    <Ionicons name="checkmark-circle" size={20} color="#667EEA" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Save Button */}
        <View className="border-t p-6" style={{ borderTopColor: isDark ? '#374151' : '#E5E7EB' }}>
          <TouchableOpacity
            onPress={handleSave}
            className="rounded-xl py-4"
            style={{ backgroundColor: '#667EEA' }}>
            <Text className="text-center text-lg font-bold text-white">Save Settings</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </>
  );
}
