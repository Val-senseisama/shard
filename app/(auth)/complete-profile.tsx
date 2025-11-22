import AddImageInput from '@/components/AddImageInput';
import SmallInput from '@/components/SmallInput';
import BlockButton from '@/components/BlockButton';
import images from '@/constants/images';
import { AntDesign } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import {
  Image,
  Pressable,
  Text,
  View,
  useColorScheme,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation } from '@apollo/client';
import { CHECK_USERNAME } from '~/Graphql/Queries';
import { COMPLETE_PROFILE } from '~/Graphql/Mutations';
import AppStore from '~/helpers/AppStore';

const CompleteProfile = () => {
  const [formData, setFormData] = useState({
    profileImage: '',
    username: '',
    gender: 'prefer_not_to_say',
  });
  const [showGenderOptions, setShowGenderOptions] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  const colorScheme = useColorScheme();

  const { data: usernameData, refetch: checkUsername } = useQuery(CHECK_USERNAME, {
    variables: { username: formData.username },
    skip: true,
  });

  const [completeProfile, { loading }] = useMutation(COMPLETE_PROFILE, {
    onCompleted: (data) => {
      console.log('Profile completed:', data);
      if (data.completeProfile) {
        router.replace('/(auth)/login');
      } else {
        AppStore.showAlert({ str: 'Failed to complete profile. Please try again.', type: 'error' });
      }
    },
    onError: (error) => {
      console.error('Error completing profile:', error);
      AppStore.showAlert({ str: 'Failed to complete profile. Please try again.', type: 'error' });
    },
  });

  const genderOptions = [
    { label: 'Prefer not to say', value: 'prefer_not_to_say' },
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' },
  ];

  useEffect(() => {
    const checkUsernameAvailability = async () => {
      if (formData.username.length < 3) return;

      setIsCheckingUsername(true);
      try {
        const { data } = await checkUsername();
        if (!data.checkUsername) {
          Alert.alert('Error', 'This username is already taken');
          setFormData((prev) => ({ ...prev, username: '' }));
        }
      } catch (error) {
        console.error('Error checking username:', error);
      } finally {
        setIsCheckingUsername(false);
      }
    };

    const timeoutId = setTimeout(checkUsernameAvailability, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.username]);

  const handleSave = async () => {
    // Validate form data
    if (!formData.username) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    try {
      await completeProfile({
        variables: {
          username: formData.username,
          gender: formData.gender.toUpperCase(),
          profile: formData.profileImage || undefined,
        },
      });
      router.replace('/login');
    } catch (error) {
      console.error('Error completing profile:', error);
      Alert.alert('Error', 'Failed to complete profile. Please try again.');
    }
  };

  return (
    <SafeAreaView className="min-h-screen flex-1 bg-background-paper dark:bg-background-dark-default">
      <View className="flex-1">
        <View className="min-w-screen flex-row items-center py-3">
          <Pressable
            onPress={() => router.back()}
            className="rounded-full bg-background-default p-2 dark:bg-background-dark-paper">
            <AntDesign
              name="arrowleft"
              size={24}
              color={colorScheme === 'dark' ? '#ffffff' : '#000000'}
            />
          </Pressable>

          <View className="absolute left-0 flex w-full items-center justify-center">
            <Image
              source={colorScheme === 'dark' ? images.SmallLogoDark : images.SmallLogoLight}
              resizeMode="contain"
              className="h-8"
            />
          </View>
        </View>

        <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="w-full space-y-6">
            <View
              className="rounded-2xl bg-background-default p-6 shadow-sm dark:bg-background-dark-paper"
              style={{
                padding: 24,
                marginBottom: 24,
              }}>
              <Text
                className="mb-4 font-ibold text-xl text-text-primary dark:text-text-dark"
                style={{
                  marginBottom: 16,
                }}>
                Complete Your Profile
              </Text>

              <View className="mb-6" style={{ marginBottom: 24 }}>
                <Text className="mb-2 font-imedium text-base text-text-primary dark:text-text-dark">
                  Profile Image
                </Text>
                <AddImageInput
                  onImage={(uri: string) => {
                    setFormData((prev) => ({ ...prev, profileImage: uri }));
                  }}
                />
              </View>

              <View className="space-y-6">
                <SmallInput
                  title="Username"
                  placeholder="Choose a username"
                  handleChangeText={(text: string) => {
                    setFormData((prev) => ({ ...prev, username: text }));
                  }}
                  value={formData.username}
                  otherStyles="mb-6"
                />

                <View>
                  <Text className="mb-2 font-imedium text-base text-text-primary dark:text-text-dark">
                    Gender
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowGenderOptions(!showGenderOptions)}
                    className="rounded-xl border border-gray-300 bg-background-paper p-4 dark:bg-background-dark-default">
                    <Text className="font-iregular text-text-primary dark:text-text-dark">
                      {genderOptions.find((opt) => opt.value === formData.gender)?.label}
                    </Text>
                  </TouchableOpacity>

                  {showGenderOptions && (
                    <View className="mt-2 rounded-xl border border-gray-300 bg-background-paper dark:bg-background-dark-default">
                      {genderOptions.map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          onPress={() => {
                            setFormData((prev) => ({ ...prev, gender: option.value }));
                            setShowGenderOptions(false);
                          }}
                          className="border-b border-gray-200 p-4 dark:border-gray-700">
                          <Text className="font-iregular text-text-primary dark:text-text-dark">
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </View>

            <BlockButton title="Complete Profile" onPress={handleSave} otherStyles="w-full" />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default CompleteProfile;
