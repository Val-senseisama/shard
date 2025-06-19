import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';
import AppStore from '~/helpers/AppStore';
import images from '@/constants/images';
import AddImageInput from '@/components/AddImageInput';

interface MiniGoal {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
}

const NewShard = () => {
  const [user, setUser] = useState<Record<string, any> | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    image: '',
    summary: '',
    goals: [] as MiniGoal[],
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedGoalIndex, setSelectedGoalIndex] = useState<number | null>(null);
  const [dateType, setDateType] = useState<'start' | 'end'>('start');
  const colorScheme = useColorScheme();

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await AppStore.get('user');
      setUser(userData);
    };
    fetchUser();
  }, []);

  const handleImageSelect = (base64Image: string) => {
    setFormData((prev) => ({ ...prev, image: base64Image }));
  };

  const addGoal = () => {
    const newGoal: MiniGoal = {
      id: Date.now().toString(),
      title: '',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
    setFormData((prev) => ({ ...prev, goals: [...prev.goals, newGoal] }));
  };

  const removeGoal = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      goals: prev.goals.filter((goal) => goal.id !== id),
    }));
  };

  const updateGoal = (id: string, field: keyof MiniGoal, value: any) => {
    setFormData((prev) => ({
      ...prev,
      goals: prev.goals.map((goal) => (goal.id === id ? { ...goal, [field]: value } : goal)),
    }));
  };

  const generateAIGoals = () => {
    const aiGoals: MiniGoal[] = [
      {
        id: '1',
        title: 'Research and Planning',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        id: '2',
        title: 'Initial Implementation',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      {
        id: '3',
        title: 'Testing and Refinement',
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      },
    ];
    setFormData((prev) => ({ ...prev, goals: aiGoals }));
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate && selectedGoalIndex !== null) {
      updateGoal(
        formData.goals[selectedGoalIndex].id,
        dateType === 'start' ? 'startDate' : 'endDate',
        selectedDate
      );
    }
  };

  const handleSave = () => {
    if (!formData.title || !formData.summary || formData.goals.length === 0) {
      Alert.alert('Error', 'Please fill in all required fields and add at least one goal');
      return;
    }
    // TODO: Save to backend
    console.log('Saving shard:', formData);
    router.replace('/add-partners');
  };

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
            {/* Image Section */}
            <View className="items-center">
              <AddImageInput onImage={handleImageSelect} />
            </View>

            {/* Title Section */}
            <View className="mb-2 space-y-2">
              <Text className="my-2 text-lg font-bold text-text-primary dark:text-text-dark">
                Shard Title
              </Text>
              <TextInput
                value={formData.title}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, title: text }))}
                placeholder="Enter your shard title"
                className="rounded-xl bg-background-default p-4 text-text-primary dark:bg-background-dark-paper dark:text-text-dark"
                placeholderTextColor="#666"
              />
            </View>

            {/* Summary Section */}
            <View className="my-2 space-y-2">
              <Text className="my-2 text-lg font-bold text-text-primary dark:text-text-dark">
                Summary
              </Text>
              <TextInput
                value={formData.summary}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, summary: text }))}
                placeholder="Describe your shard..."
                multiline
                numberOfLines={4}
                className="h-24 rounded-xl bg-background-default p-4 text-text-primary dark:bg-background-dark-paper dark:text-text-dark"
                placeholderTextColor="#666"
                textAlignVertical="top"
              />
            </View>

            {/* Goals Section */}
            <View className="my-2 space-y-4">
              <View className="flex-row items-center justify-between">
                <Text
                  className="text-lg font-bold text-text-primary dark:text-text-dark"
                  style={{
                    fontSize: 18,
                    lineHeight: 28,
                    fontFamily: 'Inter-Bold',
                  }}>
                  Mini Goals
                </Text>
                <View className="flex-row gap-2 space-x-2">
                  <TouchableOpacity
                    onPress={addGoal}
                    className="rounded-lg bg-primary-start px-4 py-2.5"
                    style={{
                      backgroundColor: '#4135F3',
                      paddingVertical: 8,
                    }}>
                    <Text className="text-white">Add Goal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={generateAIGoals}
                    className="rounded-lg  px-4 py-2"
                    style={{
                      // backgroundColor: '#4135F3',
                      paddingVertical: 8,
                    }}>
                    <Text
                      className="font-isemibold text-primary-end"
                      style={{
                        color: '#7168F6',
                      }}>
                      AI Generate
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {formData.goals.map((goal, index) => (
                <Animated.View
                  key={goal.id}
                  entering={SlideInRight}
                  className="my-2 rounded-xl bg-background-default p-4 dark:bg-background-dark-paper">
                  <View className="flex-row items-center justify-between">
                    <TextInput
                      value={goal.title}
                      onChangeText={(text) => updateGoal(goal.id, 'title', text)}
                      placeholder="Goal title"
                      className="flex-1 text-text-primary dark:text-text-dark"
                    />
                    <TouchableOpacity
                      onPress={() => removeGoal(goal.id)}
                      className="ml-2 rounded-full bg-red-50 p-2 dark:bg-red-900/20">
                      <MaterialIcons name="delete" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>

                  <View className="mt-4 flex-row space-x-2">
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedGoalIndex(index);
                        setDateType('start');
                        setShowDatePicker(true);
                      }}
                      className="flex-1 rounded-lg bg-background-paper p-3 dark:bg-background-dark-default">
                      <Text className="text-sm text-text-primary dark:text-text-dark">
                        Start: {goal.startDate.toDateString()}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedGoalIndex(index);
                        setDateType('end');
                        setShowDatePicker(true);
                      }}
                      className="flex-1 rounded-lg bg-background-paper p-3 dark:bg-background-dark-default">
                      <Text className="text-sm text-text-primary dark:text-text-dark">
                        End: {goal.endDate.toDateString()}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              ))}
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
            <Text className="text-center text-lg font-bold text-white">Create Shard</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {showDatePicker && (
        <DateTimePicker
          value={
            selectedGoalIndex !== null
              ? dateType === 'start'
                ? formData.goals[selectedGoalIndex].startDate
                : formData.goals[selectedGoalIndex].endDate
              : new Date()
          }
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleDateChange}
        />
      )}
    </SafeAreaView>
  );
};

export default NewShard;
