import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Switch,
  ScrollView,
  useColorScheme,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@apollo/client';
import { GET_NOTIFICATION_PREFERENCES } from '~/Graphql/Queries';
import { UPDATE_NOTIFICATION_PREFERENCES } from '~/Graphql/Mutations';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import AnimatedPressable from '~/components/AnimatedPressable';
import { ACCENT, t } from '~/components/shard/constants';
import Animated, { FadeInDown } from 'react-native-reanimated';

type Prefs = {
  pushEnabled: boolean;
  emailEnabled: boolean;
  friendRequests: boolean;
  messages: boolean;
  shardInvites: boolean;
  shardUpdates: boolean;
  questDeadlines: boolean;
  achievements: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
};

const DEFAULT_PREFS: Prefs = {
  pushEnabled: true,
  emailEnabled: false,
  friendRequests: true,
  messages: true,
  shardInvites: true,
  shardUpdates: true,
  questDeadlines: true,
  achievements: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

const TOGGLE_GROUPS = [
  {
    title: 'Notification Types',
    items: [
      { key: 'messages',      label: 'Messages',       icon: 'chatbubble-outline',   desc: 'Direct messages and chat mentions' },
      { key: 'friendRequests',label: 'Friend Requests', icon: 'people-outline',       desc: 'New requests and acceptances' },
      { key: 'shardInvites',  label: 'Shard Invites',  icon: 'mail-outline',          desc: 'Invitations to join new shards' },
      { key: 'shardUpdates',  label: 'Shard Updates',  icon: 'prism-outline',          desc: 'Task completions and progress' },
      { key: 'questDeadlines',label: 'Quest Deadlines',icon: 'alarm-outline',          desc: 'Reminders for upcoming deadlines' },
      { key: 'achievements',  label: 'Achievements',   icon: 'trophy-outline',         desc: 'New achievements and level ups' },
    ],
  },
  {
    title: 'Other',
    items: [
      { key: 'emailEnabled', label: 'Email Notifications', icon: 'mail-open-outline', desc: 'Receive updates via email' },
    ],
  },
];

const NotificationSettings = () => {
  const isDark = useColorScheme() === 'dark';
  const theme = t(isDark);

  const { data, loading } = useQuery(GET_NOTIFICATION_PREFERENCES);
  const [updatePreferences, { loading: saving }] = useMutation(UPDATE_NOTIFICATION_PREFERENCES, {
    refetchQueries: [GET_NOTIFICATION_PREFERENCES],
    onError: () => {
      Toast.show({ type: 'error', text1: 'Failed to save', text2: 'Could not update notification settings.' });
    },
  });

  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    if (data?.getNotificationPreferences?.preferences) {
      const { __typename, ...p } = data.getNotificationPreferences.preferences;
      setPrefs(p);
    }
  }, [data]);

  const save = useCallback(async (newPrefs: Prefs) => {
    const { __typename, ...input } = newPrefs as any;
    try {
      await updatePreferences({ variables: { input } });
    } catch {
      // onError handles toast
    }
  }, [updatePreferences]);

  const handleToggle = useCallback(async (key: keyof Prefs) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    await save(updated);
  }, [prefs, save]);

  const handleTimeChange = useCallback(async (type: 'start' | 'end', _: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
      setShowEndPicker(false);
    }
    if (!date) return;
    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    const key = type === 'start' ? 'quietHoursStart' : 'quietHoursEnd';
    const updated = { ...prefs, [key]: `${hh}:${mm}` };
    setPrefs(updated);
    await save(updated);
  }, [prefs, save]);

  const parseTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={ACCENT} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: isDark ? theme.border : 'rgba(0,0,0,0.06)' }}>
        <AnimatedPressable onPress={() => router.back()} hitSlop={20} scaleDown={0.88}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </AnimatedPressable>
        <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>Notifications</Text>
        <View style={{ width: 24 }}>
          {saving && <ActivityIndicator size="small" color={ACCENT} />}
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* Master toggle */}
        <Animated.View
          entering={FadeInDown.duration(350)}
          style={{ backgroundColor: prefs.pushEnabled ? (isDark ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.06)') : theme.card, borderRadius: 18, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: prefs.pushEnabled ? (isDark ? 'rgba(124,58,237,0.3)' : 'rgba(124,58,237,0.2)') : isDark ? theme.border : 'rgba(0,0,0,0.06)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: prefs.pushEnabled ? isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.12)' : isDark ? '#2a2a2a' : '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="notifications-outline" size={20} color={prefs.pushEnabled ? ACCENT : theme.textSecondary} />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>Push Notifications</Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                  {prefs.pushEnabled ? 'Notifications are on' : 'All notifications muted'}
                </Text>
              </View>
            </View>
            <Switch
              value={prefs.pushEnabled}
              onValueChange={() => handleToggle('pushEnabled')}
              trackColor={{ false: isDark ? '#374151' : '#d1d5db', true: `${ACCENT}80` }}
              thumbColor={prefs.pushEnabled ? ACCENT : isDark ? '#6b7280' : '#f4f3f4'}
            />
          </View>
        </Animated.View>

        {/* Granular groups */}
        {TOGGLE_GROUPS.map((group, gi) => (
          <Animated.View key={group.title} entering={FadeInDown.delay((gi + 1) * 80).duration(350)} style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, paddingLeft: 4 }}>
              {group.title}
            </Text>
            <View style={{ backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: isDark ? theme.border : 'rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              {group.items.map((item, i) => {
                const isDisabled = item.key !== 'pushEnabled' && item.key !== 'emailEnabled' && !prefs.pushEnabled;
                return (
                  <View
                    key={item.key}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      padding: 14,
                      borderBottomWidth: i < group.items.length - 1 ? 1 : 0,
                      borderBottomColor: isDark ? theme.border : 'rgba(0,0,0,0.05)',
                      opacity: isDisabled ? 0.4 : 1,
                    }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 12 }}>
                      <Ionicons name={item.icon as any} size={18} color={theme.textSecondary} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '500', color: theme.text }}>{item.label}</Text>
                        <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 1 }}>{item.desc}</Text>
                      </View>
                    </View>
                    <Switch
                      value={(prefs as any)[item.key]}
                      onValueChange={() => { if (!isDisabled) handleToggle(item.key as keyof Prefs); }}
                      disabled={isDisabled}
                      trackColor={{ false: isDark ? '#374151' : '#d1d5db', true: `${ACCENT}80` }}
                      thumbColor={(prefs as any)[item.key] ? ACCENT : isDark ? '#6b7280' : '#f4f3f4'}
                    />
                  </View>
                );
              })}
            </View>
          </Animated.View>
        ))}

        {/* Quiet Hours */}
        <Animated.View entering={FadeInDown.delay(240).duration(350)} style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, paddingLeft: 4 }}>
            Quiet Hours
          </Text>
          <View style={{ backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: isDark ? theme.border : 'rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {/* Toggle */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: prefs.quietHoursEnabled ? 1 : 0, borderBottomColor: isDark ? theme.border : 'rgba(0,0,0,0.05)' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name="moon-outline" size={18} color={theme.textSecondary} />
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '500', color: theme.text }}>Enable Quiet Hours</Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 1 }}>Mute notifications during set hours</Text>
                </View>
              </View>
              <Switch
                value={prefs.quietHoursEnabled}
                onValueChange={() => handleToggle('quietHoursEnabled')}
                trackColor={{ false: isDark ? '#374151' : '#d1d5db', true: `${ACCENT}80` }}
                thumbColor={prefs.quietHoursEnabled ? ACCENT : isDark ? '#6b7280' : '#f4f3f4'}
              />
            </View>

            {/* Time pickers */}
            {prefs.quietHoursEnabled && (
              <View style={{ flexDirection: 'row', padding: 14, gap: 12 }}>
                <AnimatedPressable onPress={() => setShowStartPicker(true)} scaleDown={0.96} style={{ flex: 1, backgroundColor: isDark ? 'rgba(124,58,237,0.1)' : 'rgba(124,58,237,0.06)', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.15)' }}>
                  <Text style={{ fontSize: 11, color: theme.textSecondary, fontWeight: '600', letterSpacing: 0.5 }}>START</Text>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: ACCENT, marginTop: 4 }}>{prefs.quietHoursStart}</Text>
                </AnimatedPressable>
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="arrow-forward" size={16} color={theme.textSecondary} />
                </View>
                <AnimatedPressable onPress={() => setShowEndPicker(true)} scaleDown={0.96} style={{ flex: 1, backgroundColor: isDark ? 'rgba(124,58,237,0.1)' : 'rgba(124,58,237,0.06)', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.15)' }}>
                  <Text style={{ fontSize: 11, color: theme.textSecondary, fontWeight: '600', letterSpacing: 0.5 }}>END</Text>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: ACCENT, marginTop: 4 }}>{prefs.quietHoursEnd}</Text>
                </AnimatedPressable>
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Time pickers */}
      {showStartPicker && (
        <DateTimePicker value={parseTime(prefs.quietHoursStart)} mode="time" is24Hour display="default"
          onChange={(e, d) => { setShowStartPicker(false); handleTimeChange('start', e, d); }} />
      )}
      {showEndPicker && (
        <DateTimePicker value={parseTime(prefs.quietHoursEnd)} mode="time" is24Hour display="default"
          onChange={(e, d) => { setShowEndPicker(false); handleTimeChange('end', e, d); }} />
      )}
    </SafeAreaView>
  );
};

export default NotificationSettings;
