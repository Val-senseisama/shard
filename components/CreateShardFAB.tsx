import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColorScheme } from 'react-native';

const CreateShardFAB = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <TouchableOpacity
      onPress={() => router.push('/new-shard')}
      style={[styles.fab, isDark ? styles.fabDark : styles.fabLight]}
      activeOpacity={0.8}
    >
      <Ionicons 
        name="add" 
        size={28} 
        color={isDark ? '#fff' : '#000'} 
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    bottom: 24,
    right: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  fabLight: {
    backgroundColor: '#fff',
  },
  fabDark: {
    backgroundColor: '#1e1e1e',
  },
});

export default CreateShardFAB;
