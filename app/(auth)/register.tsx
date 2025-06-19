import BlockButton from '@/components/BlockButton';
import IconButton from '@/components/IconButton';
import SmallInput from '@/components/SmallInput';
import icons from '@/constants/icons';
import images from '@/constants/images';
import { useState } from 'react';
import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import '../../global.css';
import { Validate } from '@/helpers/Validate';
import { useMutation } from '@apollo/client';
import { LOGIN, REGISTER } from '@/Graphql/Mutations';
import Loading from '@/components/Loading';
import Session from '@/helpers/Session';
import { router } from 'expo-router';
import AppStore from '~/helpers/AppStore';

const Register = () => {
  const [isLoading, setIsLoading] = useState<Boolean>(false);
  const [formData, setFormData] = useState<Record<string, any>>({
    email: '',
    password: '',
    accepted: false,
  });

  // const [login, { loading: loginLoading }] = useMutation(LOGIN, {
  //   onCompleted: async (data) => {
  //     console.log('Login successful:', data);
  //     setIsLoading(false);
  //     if (data.login.accessToken) {
  //       await Session.setCookie('x-access-token', data.login.accessToken);
  //       await Session.setCookie('x-refresh-token', data.login.refreshToken);
  //       router.replace('/complete-profile');
  //     }
  //   },
  //   onError: (error) => {
  //     console.log('Login error:', {
  //       message: error.message,
  //       networkError: error.networkError
  //         ? {
  //             name: error.networkError.name,
  //             message: error.networkError.message,
  //           }
  //         : null,
  //       graphQLErrors: error.graphQLErrors,
  //     });
  //     AppStore.showAlert({ str: error.message, type: 'error' });
  //   },
  // });

  const [register, { loading, error }] = useMutation(REGISTER, {
    onCompleted: (data) => {
      console.log('Registration completed:', data);
      if (data.register) {
        AppStore.showAlert({ str: 'Registration successful', type: 'success' });
        router.replace('/login');
      } else {
        AppStore.showAlert({ str: 'Registration failed', type: 'error' });
      }
      //login({ variables: { email: formData.email, password: formData.password } });
      console.log('Registration successful:', data);
      setIsLoading(false);
    },
    onError: (error) => {
      console.log('Registration error:', {
        message: error.message,
        networkError: error.networkError
          ? {
              name: error.networkError.name,
              message: error.networkError.message,
            }
          : null,
        graphQLErrors: error.graphQLErrors,
      });

      AppStore.showAlert({ str: error.message, type: 'error' });
      setIsLoading(false);
    },
    fetchPolicy: 'no-cache',
  });

  const handleSubmit = async () => {
    try {
      setIsLoading(true);

      if (!formData.email || !formData.password) {
        AppStore.showAlert({ str: 'Please fill in all fields', type: 'error' });
        setIsLoading(false);
        return;
      }

      if (!Validate.email(formData.email)) {
        AppStore.showAlert({ str: 'Please enter a valid email', type: 'error' });
        setIsLoading(false);
        return;
      }

      if (!formData.accepted) {
        AppStore.showAlert({ str: 'Please accept the terms and conditions', type: 'error' });
        setIsLoading(false);
        return;
      }
      const { data } = await register({
        variables: {
          email: formData.email,
          password: formData.password,
        },
      });
      console.log('Registration data:', data);
    } catch (error: any) {
      console.log('Try/catch error:', {
        error: error,
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
      setIsLoading(false);
    }
  };

  const [message, setMessage] = useState<String>('');

  const handleTextChange = (text: string, key: string) => {
    setFormData((prev) => ({ ...prev, [key]: text }));
  };

  if (isLoading) return <Loading message="Creating your account..." />;

  return (
    <SafeAreaView className="min-h-screen min-w-full bg-background-default dark:bg-background-dark-default">
      <ScrollView>
        <View className="min-h-screen min-w-full flex-1 items-center bg-background-default p-4 dark:bg-background-dark-default">
          <Image source={images.FractalShard} className="mb-5 h-64 w-64" resizeMode="contain" />
          <Text className="mb-3 text-center font-ibold text-2xl text-text-primary dark:text-text-dark">
            SIGN UP
          </Text>

          <View
            style={{
              elevation: 3,
              padding: 16,
              gap: 16,
            }}
            className="mx-4 flex max-w-md flex-col gap-4 rounded-2xl bg-background-default p-6 text-text-primary dark:bg-background-dark-paper dark:text-text-dark">
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

            <View className="mb-3 w-full flex-row items-center">
              <TouchableOpacity
                onPress={() =>
                  setFormData((prev) => ({
                    ...prev,
                    accepted: !prev.accepted,
                  }))
                }
                className="mr-2 h-5 w-5 items-center justify-center rounded border border-text-grey-100"
                style={{
                  backgroundColor: formData.accepted ? '#4135F3' : 'transparent',
                  borderColor: formData.accepted ? '#4135F3' : '#B9B9B9',
                  borderWidth: 1,
                  borderRadius: 4,
                  height: 24,
                  width: 24,
                }}>
                {formData.accepted && <Text style={{ color: 'white', fontSize: 12 }}>✓</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  setFormData((prev) => ({
                    ...prev,
                    accepted: !prev.accepted,
                  }))
                }
                className="flex-1">
                <Text className="text-base text-text-light dark:text-text-dark">
                  I accept the{' '}
                  <Text
                    className="text-primary underline"
                    onPress={() => router.replace('/terms-and-conditions')}
                    style={{
                      color: '#4135F3',
                      textDecorationLine: 'underline',
                    }}>
                    Terms and Conditions
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>

            {message.length > 0 && (
              <View className="flex w-full flex-row items-center justify-between">
                <Text className="text-sm text-[red]">
                  Password must be at least 8 characters long
                </Text>
              </View>
            )}

            <BlockButton
              title="Sign up"
              otherStyles="min-w-full h-12 rounded-xl mt-2"
              onPress={handleSubmit}
            />

            <Text className="my-1 text-center text-sm text-text-primary dark:text-text-dark">
              Or
            </Text>

            <IconButton src={icons.google} text="Sign up with Google" otherStyles="w-full" />
            <Text className="my-2 text-center text-sm text-primary">
              Already have an account?{' '}
              <Text
                className="text-primary underline"
                onPress={() => router.replace('/login')}
                style={{
                  color: '#4135F3',
                  textDecorationLine: 'underline',
                }}>
                Login
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Register;
