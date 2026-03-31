import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  useColorScheme,
  Platform,
  KeyboardAvoidingView,
  Animated as RNAnimated,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { AntDesign, MaterialIcons, Ionicons } from '@expo/vector-icons';
import AppStore from '~/helpers/AppStore';
import images from '@/constants/images';
import { useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import Toast from 'react-native-toast-message';

const ADD_SHARD_PARTICIPANT = gql`
  mutation AddShardParticipant($shardId: ID!, $userId: ID!, $role: String!) {
    addShardParticipant(shardId: $shardId, userId: $userId, role: $role) {
      success
      message
    }
  }
`;

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role?: 'collaborator' | 'accountability';
}

const AddPartners = () => {
  const { shardId } = useLocalSearchParams<{ shardId: string }>();
  const [user, setUser] = useState<Record<string, any> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [swipeAnimations] = useState(() => new Map<string, RNAnimated.Value>());
  const colorScheme = useColorScheme();
  const [addShardParticipant, { loading: addingParticipant }] = useMutation(ADD_SHARD_PARTICIPANT);

  // Mock data for demonstration
  const [users] = useState<User[]>([
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      avatar: 'https://i.pravatar.cc/150?img=1',
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      avatar: 'https://i.pravatar.cc/150?img=2',
    },
    {
      id: '3',
      name: 'Mike Johnson',
      email: 'mike@example.com',
      avatar: 'https://i.pravatar.cc/150?img=3',
    },
    // Add more mock users as needed
  ]);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await AppStore.get('user');
      setUser(userData);
    };
    fetchUser();
  }, []);

  const getSwipeAnimation = useCallback(
    (userId: string) => {
      if (!swipeAnimations.has(userId)) {
        swipeAnimations.set(userId, new RNAnimated.Value(0));
      }
      return swipeAnimations.get(userId)!;
    },
    [swipeAnimations]
  );

  const createPanResponder = useCallback(
    (user: User) => {
      const swipeAnim = getSwipeAnimation(user.id);

      return PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gestureState) => {
          swipeAnim.setValue(gestureState.dx);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (Math.abs(gestureState.dx) > 100) {
            const role = gestureState.dx > 0 ? 'accountability' : 'collaborator';
            addUser(user, role);
          }
          RNAnimated.spring(swipeAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      });
    },
    [getSwipeAnimation]
  );

  const addUser = useCallback((user: User, role: 'collaborator' | 'accountability') => {
    setSelectedUsers((prev) => [...prev, { ...user, role }]);
  }, []);

  const removeUser = useCallback(
    (userId: string) => {
      setSelectedUsers((prev) => prev.filter((user) => user.id !== userId));
      // Reset the swipe animation
      const swipeAnim = getSwipeAnimation(userId);
      RNAnimated.spring(swipeAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    },
    [getSwipeAnimation]
  );

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          (user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
          !selectedUsers.some((selected) => selected.id === user.id)
      ),
    [users, searchQuery, selectedUsers]
  );

  const handleSave = useCallback(async () => {
    if (!shardId) {
      Toast.show({
        type: 'error',
        text1: 'No shard selected',
      });
      return;
    }

    if (selectedUsers.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Please select at least one partner',
      });
      return;
    }

    try {
      // Add all selected users to the shard
      for (const user of selectedUsers) {
        await addShardParticipant({
          variables: {
            shardId,
            userId: user.id,
            role: user.role || 'collaborator', // Default to collaborator if no role set
          },
        });
      }

      Toast.show({
        type: 'success',
        text1: `Added ${selectedUsers.length} partner(s) to shard!`,
      });

      // Navigate to the shard detail page
      router.replace(`/(screens)/shard/${shardId}`);
    } catch (error) {
      console.error('Error adding participants:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to add partners',
      });
    }
  }, [selectedUsers, shardId, addShardParticipant]);

  return (
    <SafeAreaView className="flex-1 bg-background-paper dark:bg-background-dark-default">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4">
          <TouchableOpacity onPress={() => router.back()}>
            <AntDesign
              name="arrowleft"
              size={24}
              color={colorScheme === 'dark' ? '#fff' : '#000'}
            />
          </TouchableOpacity>
          <Image
            source={colorScheme === 'dark' ? images.SmallLogoDark : images.SmallLogoLight}
            className="h-8 w-24"
            resizeMode="contain"
          />
          <View style={{ width: 24 }} />
        </View>

        <ScrollView className="flex-1 px-4">
          <Animated.View entering={FadeIn} className="space-y-6">
            {/* Search Section */}
            <View className="my-2 space-y-2">
              <Text
                className="my-2 text-lg font-bold text-text-primary dark:text-text-dark"
                style={{
                  fontSize: 18,
                  lineHeight: 28,
                  fontFamily: 'Inter-Bold',
                }}>
                Add Partners
              </Text>
              <View className="flex-row items-center rounded-xl bg-background-default p-2 dark:bg-background-dark-paper">
                <Ionicons
                  name="search"
                  size={20}
                  color={colorScheme === 'dark' ? '#fff' : '#000'}
                  className="mr-2"
                />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search users..."
                  className="flex-1 text-text-primary dark:text-text-dark"
                  placeholderTextColor="#666"
                />
              </View>
            </View>

            {/* Selected Users Section */}
            {selectedUsers.length > 0 && (
              <View style={{ marginVertical: 8, gap: 8 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: colorScheme === 'dark' ? '#fff' : '#000',
                  }}>
                  Selected Partners ({selectedUsers.length})
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 16,
                  }}>
                  {selectedUsers.map((selectedUser) => (
                    <Animated.View
                      key={selectedUser.id}
                      entering={SlideInRight}
                      style={{
                        alignItems: 'center',
                        width: 80,
                      }}>
                      <View style={{ position: 'relative' }}>
                        <Image
                          source={{ uri: selectedUser.avatar }}
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: 32,
                            backgroundColor: '#f0f0f0',
                          }}
                        />
                        <TouchableOpacity
                          onPress={() => removeUser(selectedUser.id)}
                          style={{
                            position: 'absolute',
                            right: -8,
                            top: -8,
                            backgroundColor: '#ef4444',
                            borderRadius: 12,
                            padding: 4,
                          }}>
                          <MaterialIcons name="close" size={16} color="#fff" />
                        </TouchableOpacity>
                        <View
                          style={{
                            position: 'absolute',
                            bottom: -4,
                            left: 0,
                            right: 0,
                            backgroundColor:
                              selectedUser.role === 'collaborator' ? '#BE52F2' : '#6B4EFF',
                            borderRadius: 12,
                            paddingHorizontal: 4,
                            paddingVertical: 2,
                          }}>
                          <Text
                            style={{
                              color: '#fff',
                              fontSize: 12,
                              textAlign: 'center',
                            }}>
                            {selectedUser.role === 'collaborator' ? 'C' : 'A'}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={{
                          marginTop: 8,
                          fontSize: 14,
                          color: colorScheme === 'dark' ? '#fff' : '#000',
                          textAlign: 'center',
                          maxWidth: '100%',
                        }}
                        numberOfLines={1}
                        ellipsizeMode="tail">
                        {selectedUser.name.split(' ')[0]}
                      </Text>
                    </Animated.View>
                  ))}
                </View>
              </View>
            )}

            {/* User List Section */}
            <View className="my-2 space-y-2">
              <Text className="text-base font-bold text-text-primary dark:text-text-dark">
                Available Users
              </Text>
              {filteredUsers.map((user) => {
                const panResponder = createPanResponder(user);
                return (
                  <View style={{ position: 'relative' }} key={user.id}>
                    <RNAnimated.View
                      key={user.id}
                      {...panResponder.panHandlers}
                      style={[
                        {
                          transform: [
                            {
                              translateX: getSwipeAnimation(user.id),
                            },
                          ],
                        },
                      ]}>
                      <View className="my-2 flex-row items-center justify-between rounded-xl bg-background-default p-4 dark:bg-background-dark-paper">
                        <View
                          className="flex-row items-center gap-1.5"
                          style={{
                            gap: 6,
                          }}>
                          <Image source={{ uri: user.avatar }} className="h-12 w-12 rounded-full" />
                          <View className="ml-3">
                            <Text className="font-bold text-text-primary dark:text-text-dark">
                              {user.name}
                            </Text>
                            <Text className="text-sm text-gray-500 dark:text-gray-400">
                              {user.email}
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={{
                            color: '#666',
                            fontSize: 14,
                          }}>
                          Swipe to add
                        </Text>
                      </View>
                    </RNAnimated.View>

                    {/* Left Track (Collaborator) */}
                    <RNAnimated.View
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 8,
                        bottom: 8,
                        width: '100%',
                        backgroundColor: '#BE52F2',
                        opacity: getSwipeAnimation(user.id).interpolate({
                          inputRange: [-100, 0],
                          outputRange: [0.9, 0],
                          extrapolate: 'clamp',
                        }),
                        justifyContent: 'center',
                        alignItems: 'flex-end',
                        borderRadius: 12,
                        zIndex: -1,
                        paddingRight: 16,
                      }}>
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Collaborator</Text>
                    </RNAnimated.View>

                    {/* Right Track (Accountability) */}
                    <RNAnimated.View
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 8,
                        bottom: 8,
                        width: '100%',
                        backgroundColor: '#4135F3',
                        opacity: getSwipeAnimation(user.id).interpolate({
                          inputRange: [0, 100],
                          outputRange: [0, 0.9],
                          extrapolate: 'clamp',
                        }),
                        justifyContent: 'center',
                        alignItems: 'flex-start',
                        borderRadius: 12,
                        paddingLeft: 16,
                        zIndex: -1,
                      }}>
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Accountability</Text>
                    </RNAnimated.View>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        </ScrollView>

        {/* Save Button */}
        <View className="p-4">
          <TouchableOpacity
            onPress={handleSave}
            className="rounded-xl bg-primary-start p-4"
            style={{
              backgroundColor: '#4135F3',
            }}>
            <Text className="text-center text-lg font-bold text-white">Add Partners</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AddPartners;
