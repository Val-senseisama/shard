import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@apollo/client';
import { CURRENT_USER } from '~/Graphql/Queries';
import { UPDATE_PREFERENCES } from '~/Graphql/Mutations';
import { useAppStore } from '~/store/app.store';
import AnimatedPressable from '~/components/AnimatedPressable';
import { ACCENT, t } from '~/components/shard/constants';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_TO_INDEX: Record<string, number> = {
  Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7,
};
const INDEX_TO_DAY = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const WORKLOADS = [
  { id: 'Light',      icon: 'leaf-outline',    description: 'Relaxed pace, fewer tasks per day.' },
  { id: 'Medium',     icon: 'bicycle-outline', description: 'Balanced workload for steady progress.' },
  { id: 'Aggressive', icon: 'flame-outline',   description: 'High intensity, maximum tasks per day.' },
] as const;

const WorkloadSettings = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = t(isDark);
  const { addAlert } = useAppStore();

  const [workload, setWorkload] = useState('Medium');
  const [workingDays, setWorkingDays] = useState<string[]>([]);

  const { loading: loadingUser } = useQuery(CURRENT_USER, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      if (data?.currentUser?.user?.preferences) {
        setWorkload(data.currentUser.user.preferences.workloadLevel || 'Medium');
        const stored = data.currentUser.user.preferences.workingDays || [];
        setWorkingDays(stored.map((d: number) => INDEX_TO_DAY[d]).filter(Boolean));
      }
    },
  });

  const [updatePreferences, { loading: saving }] = useMutation(UPDATE_PREFERENCES);

  const handleSave = async () => {
    try {
      const { data } = await updatePreferences({
        variables: {
          input: {
            workloadLevel: workload,
            workingDays: workingDays.map((d) => DAY_TO_INDEX[d]).filter(Boolean),
          },
        },
      });
      if (data?.updatePreferences?.success) {
        addAlert({ str: 'Preferences updated', type: 'success' });
        router.back();
      } else {
        addAlert({ str: data?.updatePreferences?.message || 'Failed to update', type: 'error' });
      }
    } catch {
      addAlert({ str: 'Failed to update preferences', type: 'error' });
    }
  };

  const toggleDay = (day: string) =>
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 14,
        }}>
        <AnimatedPressable onPress={() => router.back()} hitSlop={20} scaleDown={0.9} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </AnimatedPressable>
        <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text, marginLeft: 12 }}>
          Workload Settings
        </Text>
      </View>

      {loadingUser ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, gap: 24 }}
          showsVerticalScrollIndicator={false}>

          {/* Intensity Level */}
          <View style={{ gap: 12 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '800',
                letterSpacing: 0.2,
                color: theme.textSecondary,
              }}>
              Intensity Level
            </Text>
            {WORKLOADS.map((option) => {
              const selected = workload === option.id;
              return (
                <AnimatedPressable
                  key={option.id}
                  onPress={() => setWorkload(option.id)}
                  scaleDown={0.97}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1.5,
                    borderColor: selected ? ACCENT : theme.border,
                    backgroundColor: selected
                      ? isDark ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.06)'
                      : theme.card,
                  }}>
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: selected ? ACCENT : isDark ? 'rgba(124,58,237,0.1)' : 'rgba(124,58,237,0.08)',
                    }}>
                    <Ionicons name={option.icon as any} size={20} color={selected ? '#fff' : ACCENT} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: selected ? ACCENT : theme.text }}>
                      {option.id}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                      {option.description}
                    </Text>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={22} color={ACCENT} />}
                </AnimatedPressable>
              );
            })}
          </View>

          {/* Working Days */}
          <View style={{ gap: 12 }}>
            <View>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  letterSpacing: 0.2,
                  color: theme.textSecondary,
                }}>
                Working Days
              </Text>
              <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 4 }}>
                Select the days you want to receive tasks.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {DAYS.map((day) => {
                const selected = workingDays.includes(day);
                return (
                  <AnimatedPressable
                    key={day}
                    onPress={() => toggleDay(day)}
                    scaleDown={0.9}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1.5,
                      borderColor: selected ? ACCENT : theme.border,
                      backgroundColor: selected ? ACCENT : theme.card,
                    }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: selected ? '#fff' : theme.textSecondary,
                      }}>
                      {day.charAt(0)}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Save button */}
      <View style={{ padding: 20, paddingBottom: 8 }}>
        <AnimatedPressable
          onPress={handleSave}
          disabled={saving || loadingUser}
          scaleDown={0.97}
          style={{
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: ACCENT,
            opacity: saving || loadingUser ? 0.6 : 1,
          }}>
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Save Settings</Text>
          )}
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );
};

export default WorkloadSettings;
