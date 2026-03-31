import BlockButton from '@/components/BlockButton';
import IconButton from '@/components/IconButton';
import Loading from '@/components/Loading';
import SmallInput from '@/components/SmallInput';
import icons from '@/constants/icons';
import images from '@/constants/images';
import { LOGIN, GOOGLE_SIGN_IN } from '@/Graphql/Mutations';
import Session from '@/helpers/Session';
import { useMutation, gql } from '@apollo/client';
import { router } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppStore from '~/helpers/AppStore';
import { getClientId, WEB_CLIENT_ID } from '~/helpers/ClientID';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useUserStore } from '~/store/user.store';
import { useAppStore } from '~/store/app.store';
const login = () => {
  const { setUser: setUserStore } = useUserStore();
  const { addAlert } = useAppStore();
  const [isLoading, setIsLoading] = useState<Boolean>(false);
  const isSigningIn = useRef(false);
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
        setUserStore(data.login.user);
        router.replace('/(screens)/Home');
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
      addAlert({ str: error.message, type: 'error' });
    },
  });

  const handleSubmit = async () => {
    try {
      setIsLoading(true);

      if (!formData.email || !formData.password) {
        addAlert({ str: 'Please fill in all fields', type: 'error' });
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

  const startSignInFlow = async () => {
    // Prevent concurrent sign-in attempts
    if (isSigningIn.current) {
      console.log('Sign-in already in progress, ignoring duplicate call');
      return;
    }

    try {
      isSigningIn.current = true;
      console.log('Starting Google Sign-In flow...');

      // Configure Google Sign-In
      const config = {
        webClientId: WEB_CLIENT_ID,
        iosClientId: getClientId(),
        scopes: ['profile', 'email'],
        offlineAccess: true, // Enable offline access to get refresh token
        forceCodeForRefreshToken: true, // Force refresh token
      };
      console.log('Google Sign-In config:', config);

      GoogleSignin.configure(config);

      // Check if Play Services is available (Android only)
      if (Platform.OS === 'android') {
        console.log('andriod');

        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }

      // Try to sign in silently first
      try {
        console.log('Trying silent sign-in...');
        const response = await GoogleSignin.signInSilently();
        console.log('Silent sign-in response:', response);

        // Check if we have valid user data
        if (response && response.type === 'success') {
          console.log('Silent sign-in successful');
          await handleGoogleSignInSuccess(response);
          return;
        } else {
          console.log('No saved credentials found, proceeding with interactive sign-in');
          // No need to throw, we'll proceed to interactive sign-in
        }
      } catch (silentError) {
        console.log('Silent sign-in error, proceeding with normal sign-in:', silentError);
      }

      // If silent sign-in fails, proceed with normal sign-in
      console.log('Starting interactive sign-in...');
      try {
        await GoogleSignin.signOut(); // Clear any existing sessions
        const signInResponse = await GoogleSignin.signIn();
        console.log('Google Sign-In response:', signInResponse);

        // Handle successful sign-in
        await handleGoogleSignInSuccess(signInResponse);
      } catch (signInError) {
        console.error('Sign-in error:', signInError);
        throw signInError; // Re-throw to be caught by the outer catch
      }
    } catch (error: any) {
      console.error('Google Sign-In Error:', {
        message: error.message,
        code: error?.code,
        details: error,
      });

      let errorMessage = 'Failed to sign in with Google';

      if (error?.code === 'SIGN_IN_CANCELLED') {
        errorMessage = 'Sign in was cancelled';
      } else if (
        error?.code === 'IN_PROGRESS' ||
        error?.code === 'ASYNC_OP_IN_PROGRESS' ||
        error?.code === '12502'
      ) {
        errorMessage = 'Sign in is already in progress';
      } else if (error?.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        errorMessage = 'Google Play services not available';
      } else if (error?.message?.includes('DEVELOPER_ERROR')) {
        errorMessage = 'Developer error - check your Google Sign-In configuration';
      }

      addAlert({
        str: errorMessage,
        type: 'error',
      });
    } finally {
      // Always reset the guard flag
      isSigningIn.current = false;
    }
  };

  // Google Sign-In mutation
  const [googleSignIn, { loading: googleSignInLoading }] = useMutation(GOOGLE_SIGN_IN, {
    onCompleted: async (data) => {
      if (data.googleSignIn?.accessToken) {
        await Session.setCookie('x-access-token', data.googleSignIn.accessToken);
        await Session.setCookie('x-refresh-token', data.googleSignIn.refreshToken);

        setUserStore(data.googleSignIn.user);

        router.replace('/(screens)/Home');
      }
    },
    onError: (error) => {
      console.error('Google Sign-In error:', {
        message: error.message,
        networkError: error.networkError
          ? {
              name: error.networkError.name,
              message: error.networkError.message,
            }
          : null,
        graphQLErrors: error.graphQLErrors,
      });

      // Show error message to user
      addAlert({
        str: error.message || 'Failed to sign in with Google',
        type: 'error',
      });

      // Sign out from Google to clear any partial sign-in state
      GoogleSignin.signOut().catch(console.error);
    },
  });

  /**
   * Handles successful Google Sign-In
   * Sends the Google ID token to the backend for verification and authentication
   */
  const handleGoogleSignInSuccess = async (response: {
    type: string;
    user?: any;
    idToken?: string;
  }) => {
    try {
      // Basic response validation
      if (!response || response.type !== 'success') {
        throw new Error('Invalid sign-in response from Google');
      }

      // Get the ID token
      const tokens = await GoogleSignin.getTokens();
      if (!tokens?.idToken) {
        throw new Error('No ID token received from Google');
      }

      console.log('Google Sign-In: ID token received, authenticating with backend...');

      // Call the Google Sign-In mutation
      await googleSignIn({
        variables: {
          idToken: tokens.idToken,
        },
      });
    } catch (error: any) {
      console.error('Google Sign-In error:', {
        message: error.message,
        code: error.code,
        details: error,
      });

      // Show error to user
      addAlert({
        str: error.message || 'Failed to sign in with Google',
        type: 'error',
      });

      // Sign out from Google to clear any partial sign-in state
      try {
        await GoogleSignin.signOut();
      } catch (signOutError) {
        console.error('Error during Google sign out:', signOutError);
      }
    }
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

              <IconButton
                src={icons.google}
                text="Login with Google"
                otherStyles="w-full"
                onPress={startSignInFlow}
              />

              <Text className="my-2 text-center text-sm text-text-primary dark:text-text-dark">
                Don't have an account?{' '}
                <Text
                  className="text-primary underline"
                  onPress={() => router.replace('/(auth)/register')}
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
