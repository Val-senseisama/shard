import BlockButton from '@/components/BlockButton';
import IconButton from '@/components/IconButton';
import Loading from '@/components/Loading';
import SmallInput from '@/components/SmallInput';
import icons from '@/constants/icons';
import images from '@/constants/images';
import { LOGIN } from '@/Graphql/Mutations';
import Session from '@/helpers/Session';
import { useMutation } from '@apollo/client';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppStore from '~/helpers/AppStore';

const login = () => {
  const [isLoading, setIsLoading] = useState<Boolean>(false);
  const [formData, setFormData] = useState<Record<string, any>>({
    email: '',
    password: '',
  });

  const [login, { loading: loginLoading }] = useMutation(LOGIN, {
    onCompleted: async (data) => {
      setIsLoading(false);
      if (data.login.accessToken) {
        await Session.setCookie('x-access-token', data.login.accessToken);
        await Session.setCookie('x-refresh-token', data.login.refreshToken);
        router.replace('/Home');
      }
    },
    onError: (error) => {
      console.log('Login error:', {
        message: error.message,
        networkError: error.networkError
          ? {
              name: error.networkError.name,
              message: error.networkError.message,
            }
          : null,
        graphQLErrors: error.graphQLErrors,
      });
      setIsLoading(false);
      AppStore.showAlert({ str: error.message, type: 'error' });
    },
  });

  const handleSubmit = async () => {
    try {
      setIsLoading(true);

      if (!formData.email || !formData.password) {
        AppStore.showAlert({ str: 'Please fill in all fields', type: 'error' });
        setIsLoading(false);
        return;
      }

      await login({
        variables: {
          email: formData.email,
          password: formData.password,
        },
      });
    } catch (error: any) {
      console.log('Try/catch error:', {
        message: error.message,
        networkError: error.networkError
          ? {
              name: error.networkError.name,
              message: error.networkError.message,
            }
          : null,
        graphQLErrors: error.graphQLErrors,
      });
    }
  };

  const [message, setMessage] = useState<String>('');

  const handleTextChange = (text: string, key: string) => {
    setFormData((prev) => ({ ...prev, [key]: text }));
  };

  if (isLoading || loginLoading) return <Loading message="Logging into your account..." />;

  return (
    <SafeAreaView className="min-h-screen min-w-full flex-1 bg-background-default dark:bg-background-dark-default">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
        <ScrollView className="flex-1">
          <View className="min-h-screen min-w-full flex-1 items-center bg-background-default p-4 dark:bg-background-dark-default">
            <Image source={images.FractalShard} className="mb-5 h-64 w-64" resizeMode="contain" />
            <Text className="mb-3 text-center font-ibold text-2xl text-text-primary dark:text-text-dark">
              LOGIN
            </Text>

            <View
              style={{
                elevation: 3,
                padding: 16,
                gap: 16,
              }}
              className="mx-4 flex max-w-md flex-col gap-4 rounded-2xl bg-background-default text-text-primary dark:bg-background-dark-paper dark:text-text-dark">
              <SmallInput
                title="Email"
                value={formData.email}
                placeholder=""
                handleChangeText={(text: string) => handleTextChange(text, 'email')}
                otherStyles="w-full"
              />
              <SmallInput
                title="Password"
                value={formData.password}
                placeholder=""
                handleChangeText={(text: string) => handleTextChange(text, 'password')}
                otherStyles="w-full mb-3"
              />

              {message.length > 0 && (
                <View className="flex w-full flex-row items-center justify-between">
                  <Text className="text-sm text-[red]">
                    Password must be at least 8 characters long
                  </Text>
                </View>
              )}

              <BlockButton
                title="Login"
                otherStyles="min-w-full h-12 rounded-xl mt-2"
                onPress={handleSubmit}
              />

              <Text className="my-1 text-center text-sm text-text-primary dark:text-text-dark">
                Or
              </Text>

              <IconButton src={icons.google} text="Login with Google" otherStyles="w-full" />

              <Text className="my-2 text-center text-sm text-text-primary dark:text-text-dark">
                Don't have an account?{' '}
                <Text
                  className="text-primary underline"
                  onPress={() => router.replace('/register')}
                  style={{
                    color: '#4135F3',
                    textDecorationLine: 'underline',
                  }}>
                  Sign up
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default login;
