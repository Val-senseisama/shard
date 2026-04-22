import React, { useState } from 'react';
import { View, Text, FlatList, RefreshControl, useColorScheme, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@apollo/client';
import { MY_SUBSCRIPTION_HISTORY } from '~/Graphql/Queries';
import { format } from 'date-fns';
import { t, ACCENT } from '~/components/shard/constants';
import AnimatedPressable from '~/components/AnimatedPressable';
import Animated, { FadeInDown } from 'react-native-reanimated';

const PurchaseHistory = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = t(isDark);
  const [refreshing, setRefreshing] = useState(false);

  const { data, loading, refetch } = useQuery(MY_SUBSCRIPTION_HISTORY, {
    fetchPolicy: 'network-only',
  });

  const history = data?.mySubscriptionHistory || [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getIcon = (action: string) => {
    switch (action) {
      case 'PURCHASE':
        return 'card-outline';
      case 'RENEWAL':
        return 'refresh-outline';
      case 'CANCELLATION':
        return 'close-circle-outline';
      case 'EXPIRY':
        return 'hourglass-outline';
      default:
        return 'receipt-outline';
    }
  };

  const getActionLabel = (action: string) => {
    return action.charAt(0) + action.slice(1).toLowerCase();
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 50)}
      style={[styles.item, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: isDark ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.06)' },
        ]}>
        <Ionicons name={getIcon(item.action) as any} size={20} color={ACCENT} />
      </View>
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={[styles.action, { color: theme.text }]}>{getActionLabel(item.action)}</Text>
          {item.amount > 0 && (
            <Text style={[styles.amount, { color: theme.text }]}>
              {item.currency} {item.amount.toFixed(2)}
            </Text>
          )}
        </View>
        <Text style={[styles.date, { color: theme.textSecondary }]}>
          {format(new Date(item.timestamp), 'MMM dd, yyyy • HH:mm')}
        </Text>
        {item.details && (
          <Text style={[styles.details, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.details}
          </Text>
        )}
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} hitSlop={20}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </AnimatedPressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Purchase History</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color={isDark ? '#374151' : '#d1d5db'} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No transactions yet
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  action: {
    fontSize: 16,
    fontWeight: '600',
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
  },
  date: {
    fontSize: 12,
  },
  details: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyContainer: {
    marginTop: 100,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default PurchaseHistory;
