import BlockButton from '@/components/BlockButton';
import IconButton from '@/components/IconButton';
import SmallInput from '@/components/SmallInput';
import icons from '@/constants/icons';
import images from '@/constants/images';
import { useState, useEffect } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import '../../global.css';
import { Validate } from '@/helpers/Validate';
import { useMutation } from '@apollo/client';
import { LOGIN, REGISTER, GOOGLE_SIGN_IN } from '@/Graphql/Mutations';
import Loading from '@/components/Loading';
import Session from '@/helpers/Session';
import { router } from 'expo-router';
import AppStore from '~/helpers/AppStore';
import * as Google from 'expo-auth-session/providers/google';
import { getClientId } from '@/helpers/ClientID';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useAppStore } from '~/store/app.store';
import { useUserStore } from '~/store/user.store';

const Register = () => {
  const {addAlert} = useAppStore()
  const {setUser: setUserStore} = useUserStore()
  const [isLoading, setIsLoading] = useState<Boolean>(false);
  const [formData, setFormData] = useState<Record<string, any>>({
    email: '',
    password: '',
    accepted: false,
  });

  
  // Google OAuth configuration
   const startSignInFlow = async () => {
      try {
        console.log('Starting Google Sign-In flow...');
        
        // Configure Google Sign-In
        const config = {
          webClientId: getClientId(),
          iosClientId: getClientId(),
          scopes: ['profile', 'email'],
          offlineAccess: true, // Enable offline access to get refresh token
          forceCodeForRefreshToken: true, // Force refresh token
        };
        console.log('Google Sign-In config:', config);
        
        GoogleSignin.configure(config);
        
        // Check if Play Services is available (Android only)
        if (Platform.OS === 'android') {
          console.log("andriod");
          
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
            const tokens = await GoogleSignin.getTokens();
            await handleGoogleSignInSuccess(tokens.idToken);
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
            const tokens = await GoogleSignin.getTokens();
                if (!tokens?.idToken) {
                  throw new Error('No ID token received from Google');
                }
                
                console.log('Google Sign-In: ID token received, authenticating with backend...');
                
          // Handle successful sign-in
          await handleGoogleSignInSuccess(tokens.idToken);
        } catch (signInError) {
          console.error('Sign-in error:', signInError);
          throw signInError; // Re-throw to be caught by the outer catch
        }
        
      } catch (error: any) {
        console.error('Google Sign-In Error:', {
          message: error.message,
          code: error?.code,
          details: error
        });
        
        let errorMessage = 'Failed to sign in with Google';
        
        if (error?.code === 'SIGN_IN_CANCELLED') {
          errorMessage = 'Sign in was cancelled';
        } else if (error?.code === 'IN_PROGRESS') {
          errorMessage = 'Sign in is already in progress';
        } else if (error?.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
          errorMessage = 'Google Play services not available';
        } else if (error?.message?.includes('DEVELOPER_ERROR')) {
          errorMessage = 'Developer error - check your Google Sign-In configuration';
        }
        
        addAlert({ 
          str: errorMessage,
          type: 'error' 
        });
      }
    };


  const handleGoogleSignInSuccess = async (idToken: string) => {
    try {
      await googleSignIn({
        variables: { idToken },
      });
    } catch (error) {
      console.error('Error processing Google Sign-In:', error);
      addAlert({
        str: 'Failed to process Google Sign-In. Please try again.',
        type: 'error',
      });
    }
  };

  // Google Sign-In mutation
  const [googleSignIn, { loading: googleSignInLoading }] = useMutation(GOOGLE_SIGN_IN, {
    onCompleted: async (data) => {
      console.log('Google Sign-In completed:', data);
      if (data?.googleSignIn?.accessToken) {
        // Store tokens in cookies like regular registration
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
      
     addAlert({ 
        str: error.message || 'Failed to sign up with Google',
        type: 'error' 
      });
    },
  });

  const [register, { loading, error }] = useMutation(REGISTER, {
    onCompleted: (data) => {
      console.log('Registration completed:', data);
      if (data.register) {
       addAlert({ str: 'Registration successful', type: 'success' });
        router.replace('/(auth)/login');
      } else {
       addAlert({ str: 'Registration failed', type: 'error' });
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

      addAlert({ str: error.message, type: 'error' });
      setIsLoading(false);
    },
    fetchPolicy: 'no-cache',
  });

  const handleSubmit = async () => {
    try {
      setIsLoading(true);

      if (!formData.email || !formData.password) {
        addAlert({ str: 'Please fill in all fields', type: 'error' });
        setIsLoading(false);
        return;
      }

      if (!Validate.email(formData.email)) {
        addAlert({ str: 'Please enter a valid email', type: 'error' });
        setIsLoading(false);
        return;
      }

      if (!formData.accepted) {
        addAlert({ str: 'Please accept the terms and conditions', type: 'error' });
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
                    onPress={() => router.replace('/(auth)/terms-and-conditions')}
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

              <IconButton 
                src={icons.google} 
                text={googleSignInLoading ? 'Signing in...' : 'Sign up with Google'}
                otherStyles="w-full" 
                onPress={() => !googleSignInLoading && startSignInFlow()}
              />
            <Text className="my-2 text-center text-sm text-primary">
              Already have an account?{' '}
              <Text
                className="text-primary underline"
                onPress={() => router.replace('/(auth)/login')}
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
