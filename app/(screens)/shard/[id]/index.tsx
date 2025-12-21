import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  useColorScheme,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AntDesign, MaterialIcons, Ionicons, FontAwesome } from '@expo/vector-icons';
import images from '@/constants/images';

const members = [
  { name: 'Levi Idahosa', color: 'bg-fuchsia-400' },
  { name: 'John Bull', color: 'bg-pink-400' },
  { name: 'Sasha Davis', color: 'bg-indigo-500' },
];

const shardGoals = [
  {
    title: 'Set up Research environment',
    steps: [
      { text: 'Get and set up MS Word 2019.', done: true },
      { text: 'Use google scholar to find works.', done: false },
      { text: 'Get and set up mendeley.', done: true },
    ],
  },
];

const ShardDetail = () => {
  const { id } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const colorScheme = useColorScheme();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <View className="gap-4 p-2">
            {/* Project Card */}
            <View
              className="rounded-2xl bg-background-default p-4 shadow-md dark:bg-background-dark-paper"
              style={{
                borderRadius: 16,
                backgroundColor: colorScheme === 'dark' ? '#18181b' : '#fff',
                padding: 16,
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              }}>
              <View
                className="flex-row items-center gap-3"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Image
                  source={{
                    uri: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=500&auto=format&fit=crop&q=60',
                  }}
                  className="h-16 w-16 rounded-xl bg-gray-200"
                  resizeMode="cover"
                  style={{
                    borderRadius: 12,
                    height: 64,
                    width: 64,
                    backgroundColor: '#e5e7eb',
                  }}
                />
                <View className="flex-1" style={{ flex: 1 }}>
                  <Text
                    className="text-base font-bold text-text-primary dark:text-text-dark"
                    style={{
                      fontSize: 16,
                      fontWeight: 'bold',
                      color: colorScheme === 'dark' ? '#fff' : '#18181b',
                    }}>
                    Final year project: {'\n'}Landing Gear Analysis and Design Optimization.
                  </Text>
                  <View
                    className="mt-2 flex-row flex-wrap gap-2"
                    style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {members.map((m) => (
                      <Text
                        key={m.name}
                        className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${m.color}`}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 4,
                          borderRadius: 9999,
                          fontSize: 12,
                          fontWeight: '600',
                          color: '#fff',
                          backgroundColor:
                            m.color === 'bg-fuchsia-400'
                              ? '#e879f9'
                              : m.color === 'bg-pink-400'
                                ? '#f472b6'
                                : m.color === 'bg-indigo-500'
                                  ? '#6366f1'
                                  : '#888',
                          overflow: 'hidden',
                          marginRight: 4,
                          marginBottom: 4,
                        }}>
                        {m.name}
                      </Text>
                    ))}
                  </View>
                </View>
              </View>
              {/* Action Icons Row */}
              <View
                className="mt-4 flex-row justify-start gap-3"
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  marginTop: 16,
                  justifyContent: 'flex-start',
                }}>
                <TouchableOpacity
                  className="h-10 w-10 items-center justify-center rounded-xl border border-gray-300 bg-background-paper p-2 dark:border-gray-700 dark:bg-background-dark-default"
                  style={{
                    height: 40,
                    width: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colorScheme === 'dark' ? '#374151' : '#d1d5db',
                    backgroundColor: colorScheme === 'dark' ? '#27272a' : '#fff',
                    padding: 8,
                  }}>
                  <FontAwesome
                    name="comment-o"
                    size={20}
                    color={colorScheme === 'dark' ? '#fff' : '#000'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  className="h-10 w-10 items-center justify-center rounded-xl border border-gray-300 bg-background-paper p-2 dark:border-gray-700 dark:bg-background-dark-default"
                  style={{
                    height: 40,
                    width: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colorScheme === 'dark' ? '#374151' : '#d1d5db',
                    backgroundColor: colorScheme === 'dark' ? '#27272a' : '#fff',
                    padding: 8,
                  }}>
                  <Ionicons
                    name="bulb-outline"
                    size={22}
                    color={colorScheme === 'dark' ? '#fff' : '#000'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  className="h-10 w-10 items-center justify-center rounded-xl border border-gray-300 bg-background-paper p-2 dark:border-gray-700 dark:bg-background-dark-default"
                  style={{
                    height: 40,
                    width: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colorScheme === 'dark' ? '#374151' : '#d1d5db',
                    backgroundColor: colorScheme === 'dark' ? '#27272a' : '#fff',
                    padding: 8,
                  }}>
                  <Ionicons
                    name="chatbubble-outline"
                    size={20}
                    color={colorScheme === 'dark' ? '#fff' : '#000'}
                  />
                </TouchableOpacity>
              </View>
            </View>
            {/* Shard Summary */}
            <View
              className="mt-2 rounded-2xl bg-background-paper p-4 shadow dark:bg-background-dark-default"
              style={{
                marginTop: 8,
                borderRadius: 16,
                backgroundColor: colorScheme === 'dark' ? '#27272a' : '#fff',
                padding: 16,
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              }}>
              <Text
                className="mb-2 text-center text-xs font-bold tracking-widest text-text-primary dark:text-text-dark"
                style={{
                  marginBottom: 8,
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: 'bold',
                  letterSpacing: 2,
                  color: colorScheme === 'dark' ? '#fff' : '#18181b',
                }}>
                SHARD SUMMARY
              </Text>
              <Text
                className="text-center text-sm text-text-secondary dark:text-gray-300"
                style={{
                  textAlign: 'center',
                  fontSize: 14,
                  color: colorScheme === 'dark' ? '#d1d5db' : '#6b7280',
                }}>
                Office ipsum you must be muted. Domains seat giant plan later like developing status
                giant 2. No best developing fruit space time stands point. Community sexy today
                socialize native catching of now without high-level. Tent procrastinating ipsum last
                ideal.
              </Text>
              <TouchableOpacity>
                <Text
                  className="mt-2 text-center text-xs font-semibold text-primary-start"
                  style={{
                    marginTop: 8,
                    textAlign: 'center',
                    fontSize: 12,
                    fontWeight: '600',
                    color: '#6366f1',
                  }}>
                  Read More
                </Text>
              </TouchableOpacity>
            </View>
            {/* Shard Goals */}
            <View
              className="mt-2 rounded-2xl bg-background-default p-4 shadow dark:bg-background-dark-paper"
              style={{
                marginTop: 8,
                borderRadius: 16,
                backgroundColor: colorScheme === 'dark' ? '#18181b' : '#f3f4f6',
                padding: 16,
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              }}>
              <Text
                className="mb-2 text-center text-xs font-bold tracking-widest text-text-primary dark:text-text-dark"
                style={{
                  marginBottom: 8,
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: 'bold',
                  letterSpacing: 2,
                  color: colorScheme === 'dark' ? '#fff' : '#18181b',
                }}>
                SHARD GOALS
              </Text>
              {shardGoals.map((goal, idx) => (
                <View key={goal.title} className="mb-4" style={{ marginBottom: 16 }}>
                  <View
                    className="mb-2 flex-row items-center"
                    style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      className="mr-2 h-3 w-3 rounded-full bg-primary-start"
                      style={{
                        marginRight: 8,
                        height: 12,
                        width: 12,
                        borderRadius: 6,
                        backgroundColor: '#6366f1',
                      }}
                    />
                    <Text
                      className="text-base font-semibold text-text-primary dark:text-text-dark"
                      style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: colorScheme === 'dark' ? '#fff' : '#18181b',
                      }}>
                      {idx + 1}. {goal.title}
                    </Text>
                  </View>
                  <View
                    className="ml-5 border-l-2 border-gray-300 pl-3 dark:border-gray-700"
                    style={{
                      marginLeft: 20,
                      borderLeftWidth: 2,
                      borderLeftColor: colorScheme === 'dark' ? '#374151' : '#d1d5db',
                      paddingLeft: 12,
                    }}>
                    {goal.steps.map((step, i) => (
                      <View
                        key={i}
                        className="mb-2 flex-row items-center"
                        style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
                        <View
                          className={`mr-2 flex h-5 w-5 items-center justify-center rounded-full ${step.done ? 'bg-primary-start' : 'border border-gray-400 bg-gray-700 dark:bg-gray-800'}`}
                          style={{
                            marginRight: 8,
                            height: 20,
                            width: 20,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 10,
                            backgroundColor: step.done
                              ? '#6366f1'
                              : colorScheme === 'dark'
                                ? '#27272a'
                                : '#374151',
                            borderWidth: step.done ? 0 : 1,
                            borderColor: step.done ? 'transparent' : '#9ca3af',
                          }}>
                          {step.done ? <AntDesign name="check" size={14} color="#fff" /> : null}
                        </View>
                        <Text
                          className={`text-sm ${step.done ? 'text-text-primary dark:text-text-dark' : 'text-gray-400 dark:text-gray-500'}`}
                          style={{
                            fontSize: 14,
                            color: step.done
                              ? colorScheme === 'dark'
                                ? '#fff'
                                : '#18181b'
                              : colorScheme === 'dark'
                                ? '#6b7280'
                                : '#9ca3af',
                          }}>
                          {step.text}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>
        );
      case 'schedule':
        return (
          <View className="p-4">
            <Text className="text-lg font-bold text-text-primary dark:text-text-dark">
              Schedule Content
            </Text>
          </View>
        );
      case 'progress':
        return (
          <View className="p-4">
            <Text className="text-lg font-bold text-text-primary dark:text-text-dark">
              Progress Content
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-paper dark:bg-background-dark-default">
      {/* Header */}
      <View
        className="flex-row items-center justify-between p-4"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
        }}>
        <TouchableOpacity onPress={() => router.back()}>
          <AntDesign name="arrowleft" size={24} color={colorScheme === 'dark' ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Image
          source={colorScheme === 'dark' ? images.SmallLogoDark : images.SmallLogoLight}
          className="h-8 w-24"
          resizeMode="contain"
          style={{ height: 32, width: 96 }}
        />
        <View className="flex-row gap-2" style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => router.push(`/(screens)/shard/${id}/edit`)}
            className="rounded-full bg-background-default p-2 dark:bg-background-dark-paper"
            style={{
              borderRadius: 9999,
              backgroundColor: colorScheme === 'dark' ? '#18181b' : '#fff',
              padding: 8,
            }}>
            <MaterialIcons name="edit" size={20} color={colorScheme === 'dark' ? '#fff' : '#000'} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/(screens)/shard/${id}/notifications`)}
            className="rounded-full bg-background-default p-2 dark:bg-background-dark-paper"
            style={{
              borderRadius: 9999,
              backgroundColor: colorScheme === 'dark' ? '#18181b' : '#fff',
              padding: 8,
            }}>
            <Ionicons
              name="notifications"
              size={20}
              color={colorScheme === 'dark' ? '#fff' : '#000'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/(screens)/shard/${id}/chat`)}
            className="rounded-full bg-background-default p-2 dark:bg-background-dark-paper"
            style={{
              borderRadius: 9999,
              backgroundColor: colorScheme === 'dark' ? '#18181b' : '#fff',
              padding: 8,
            }}>
            <Ionicons
              name="chatbubble"
              size={20}
              color={colorScheme === 'dark' ? '#fff' : '#000'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View
        className="mx-2 mt-1 flex-row rounded-t-2xl border-b border-gray-200 bg-background-default dark:border-gray-800 dark:bg-background-dark-paper"
        style={{
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderColor: colorScheme === 'dark' ? '#1f2937' : '#e5e7eb',
          backgroundColor: colorScheme === 'dark' ? '#18181b' : '#fff',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          marginHorizontal: 8,
          marginTop: 4,
        }}>
        {['overview', 'progress', 'schedule'].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 py-3 ${activeTab === tab ? 'border-b-2 border-primary-start' : 'border-b-2 border-transparent'}`}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderBottomWidth: 2,
              borderBottomColor: activeTab === tab ? '#6366f1' : 'transparent',
            }}>
            <Text
              className={`text-center text-sm font-medium ${activeTab === tab ? 'text-primary-start' : 'text-gray-500 dark:text-gray-400'}`}
              style={{
                textAlign: 'center',
                fontSize: 14,
                fontWeight: '500',
                color:
                  activeTab === tab ? '#6366f1' : colorScheme === 'dark' ? '#9ca3af' : '#6b7280',
              }}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <ScrollView className="flex-1" style={{ flex: 1 }}>
        <Animated.View entering={FadeIn}>{renderTabContent()}</Animated.View>
        {/* Footer */}
        <Text
          className="my-4 text-center text-xs text-gray-400"
          style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginVertical: 16 }}>
          © XaviTechSavy 2024
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ShardDetail;
