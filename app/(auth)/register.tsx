import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@apollo/client';
import { REGISTER, LOGIN, GOOGLE_SIGN_IN } from '@/Graphql/Mutations';
import Session from '@/helpers/Session';
import { getClientId, WEB_CLIENT_ID } from '~/helpers/ClientID';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useUserStore } from '~/store/user.store';
import { useAppStore } from '~/store/app.store';
import AnimatedPressable from '~/components/AnimatedPressable';
import icons from '@/constants/icons';

// ─── Inline field ─────────────────────────────────────────────────────────────

const AuthField = ({
  label,
  value,
  onChange,
  placeholder,
  isPassword,
  isDark,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  placeholder: string;
  isPassword?: boolean;
  isDark: boolean;
  keyboardType?: any;
}) => {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const border = focused ? '#7c3aed' : isDark ? '#374151' : '#e5e7eb';

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#9ca3af' : '#6b7280', letterSpacing: 0.5, marginBottom: 6 }}>
        {label.toUpperCase()}
      </Text>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: isDark ? '#1a1a1a' : '#f9fafb',
        borderRadius: 12, borderWidth: 1.5, borderColor: border,
        paddingHorizontal: 14, paddingVertical: 12,
      }}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
          secureTextEntry={isPassword && !show}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          style={{ flex: 1, fontSize: 15, color: isDark ? '#fff' : '#1a1a1a' }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setShow(s => !s)} hitSlop={12}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={isDark ? '#6b7280' : '#9ca3af'} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const Register = () => {
  const isDark = useColorScheme() === 'dark';
  const { setUser } = useUserStore();
  const { addAlert } = useAppStore();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [googleInProgress, setGoogleInProgress] = useState(false);

  const outerBg = isDark ? '#0f0f0f' : '#eaeaf5';
  const cardBg = isDark ? '#1a1a1a' : '#ffffff';

  // ─── Auto-login after registration ────────────────────────────────────────

  const [loginMutation] = useMutation(LOGIN, {
    onCompleted: async (data) => {
      if (data.login?.accessToken) {
        await Session.setCookie('x-access-token', data.login.accessToken);
        await Session.setCookie('x-refresh-token', data.login.refreshToken);
        setUser(data.login.user);
        router.replace('/(screens)/Home');
      }
    },
    onError: () => {
      // Registration succeeded but auto-login failed — send to login screen
      addAlert({ str: 'Account created! Please log in.', type: 'success' });
      router.replace('/(auth)/login');
    },
  });

  // ─── Registration ──────────────────────────────────────────────────────────

  const [register] = useMutation(REGISTER, {
    onCompleted: async (data) => {
      if (data.signup?.success) {
        // Auto-login with the same credentials
        await loginMutation({ variables: { email: email.trim().toLowerCase(), password } });
      } else {
        addAlert({ str: data.signup?.message || 'Registration failed', type: 'error' });
        setRegistering(false);
      }
    },
    onError: (error) => {
      addAlert({ str: error.message || 'Registration failed', type: 'error' });
      setRegistering(false);
    },
    fetchPolicy: 'no-cache',
  });

  const handleSubmit = async () => {
    if (!email.trim() || !username.trim() || !password || !confirmPassword) {
      addAlert({ str: 'Please fill in all fields', type: 'error' });
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      addAlert({ str: 'Please enter a valid email address', type: 'error' });
      return;
    }
    if (username.trim().length < 3) {
      addAlert({ str: 'Username must be at least 3 characters', type: 'error' });
      return;
    }
    if (password.length < 8) {
      addAlert({ str: 'Password must be at least 8 characters', type: 'error' });
      return;
    }
    if (password !== confirmPassword) {
      addAlert({ str: 'Passwords do not match', type: 'error' });
      return;
    }
    if (!accepted) {
      addAlert({ str: 'Please accept the Terms and Conditions', type: 'error' });
      return;
    }
    setRegistering(true);
    await register({ variables: { input: { email: email.trim().toLowerCase(), username: username.trim(), password } } });
  };

  // ─── Google Sign-In (unchanged — do not modify) ───────────────────────────

  const startSignInFlow = async () => {
    try {
      console.log('Starting Google Sign-In flow...');

      const config = {
        webClientId: getClientId(),
        iosClientId: getClientId(),
        scopes: ['profile', 'email'],
        offlineAccess: true,
        forceCodeForRefreshToken: true,
      };
      console.log('Google Sign-In config:', config);

      GoogleSignin.configure(config);

      if (Platform.OS === 'android') {
        console.log("andriod");
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }

      try {
        console.log('Trying silent sign-in...');
        const response = await GoogleSignin.signInSilently();
        console.log('Silent sign-in response:', response);

        if (response && response.type === 'success') {
          console.log('Silent sign-in successful');
          const tokens = await GoogleSignin.getTokens();
          await handleGoogleSignInSuccess(tokens.idToken);
          return;
        } else {
          console.log('No saved credentials found, proceeding with interactive sign-in');
        }
      } catch (silentError) {
        console.log('Silent sign-in error, proceeding with normal sign-in:', silentError);
      }

      console.log('Starting interactive sign-in...');
      try {
        await GoogleSignin.signOut();
        const signInResponse = await GoogleSignin.signIn();
        console.log('Google Sign-In response:', signInResponse);
        const tokens = await GoogleSignin.getTokens();
        if (!tokens?.idToken) throw new Error('No ID token received from Google');
        console.log('Google Sign-In: ID token received, authenticating with backend...');
        await handleGoogleSignInSuccess(tokens.idToken);
      } catch (signInError) {
        console.error('Sign-in error:', signInError);
        throw signInError;
      }
    } catch (error: any) {
      console.error('Google Sign-In Error:', { message: error.message, code: error?.code, details: error });

      let errorMessage = 'Failed to sign in with Google';
      if (error?.code === 'SIGN_IN_CANCELLED') errorMessage = 'Sign in was cancelled';
      else if (error?.code === 'IN_PROGRESS') errorMessage = 'Sign in is already in progress';
      else if (error?.code === 'PLAY_SERVICES_NOT_AVAILABLE') errorMessage = 'Google Play services not available';
      else if (error?.message?.includes('DEVELOPER_ERROR')) errorMessage = 'Developer error - check your Google Sign-In configuration';

      addAlert({ str: errorMessage, type: 'error' });
    }
  };

  const handleGoogleSignInSuccess = async (idToken: string) => {
    try {
      await googleSignIn({ variables: { idToken } });
    } catch (error) {
      console.error('Error processing Google Sign-In:', error);
      addAlert({ str: 'Failed to process Google Sign-In. Please try again.', type: 'error' });
    }
  };

  const [googleSignIn, { loading: googleLoading }] = useMutation(GOOGLE_SIGN_IN, {
    onCompleted: async (data) => {
      console.log('Google Sign-In completed:', data);
      if (data?.googleSignIn?.accessToken) {
        await Session.setCookie('x-access-token', data.googleSignIn.accessToken);
        await Session.setCookie('x-refresh-token', data.googleSignIn.refreshToken);
        setUser(data.googleSignIn.user);
        router.replace('/(screens)/Home');
      }
    },
    onError: (error) => {
      console.error('Google Sign-In error:', { message: error.message, networkError: error.networkError ? { name: error.networkError.name, message: error.networkError.message } : null, graphQLErrors: error.graphQLErrors });
      addAlert({ str: error.message || 'Failed to sign up with Google', type: 'error' });
    },
  });

  // ─── JSX ──────────────────────────────────────────────────────────────────

  const handleGooglePress = async () => {
    setGoogleInProgress(true);
    try {
      await startSignInFlow();
    } finally {
      setGoogleInProgress(false);
    }
  };

  const isLoading = registering || googleLoading || googleInProgress;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: outerBg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Logo + title */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <Text style={{ fontSize: 32, fontWeight: '900', letterSpacing: 4, color: isDark ? '#fff' : '#1a1a1a', marginBottom: 8 }}>
              SH<Text style={{ color: '#7c3aed' }}>▲</Text>RD
            </Text>
            <Text style={{ fontSize: 16, color: isDark ? '#9ca3af' : '#6b7280' }}>Create your account</Text>
          </View>

          {/* Card */}
          <View style={{ backgroundColor: cardBg, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: isDark ? 0 : 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}>

            <AuthField label="Email" value={email} onChange={setEmail} placeholder="you@example.com" isDark={isDark} keyboardType="email-address" />
            <AuthField label="Username" value={username} onChange={setUsername} placeholder="yourhandle" isDark={isDark} />
            <AuthField label="Password" value={password} onChange={setPassword} placeholder="At least 8 characters" isPassword isDark={isDark} />
            <AuthField label="Confirm Password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Repeat your password" isPassword isDark={isDark} />

            {/* Terms checkbox */}
            <TouchableOpacity
              onPress={() => setAccepted(a => !a)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}
              activeOpacity={0.7}>
              <View style={{
                width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
                borderColor: accepted ? '#7c3aed' : isDark ? '#374151' : '#d1d5db',
                backgroundColor: accepted ? '#7c3aed' : 'transparent',
                alignItems: 'center', justifyContent: 'center',
              }}>
                {accepted && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={{ flex: 1, fontSize: 13, color: isDark ? '#9ca3af' : '#6b7280' }}>
                I agree to the{' '}
                <Text onPress={() => router.push('/(screens)/terms-of-service')} style={{ color: '#7c3aed', fontWeight: '600' }}>
                  Terms & Conditions
                </Text>
              </Text>
            </TouchableOpacity>

            {/* Register button */}
            <AnimatedPressable onPress={handleSubmit} scaleDown={0.96} disabled={isLoading} style={{ marginBottom: 16 }}>
              <LinearGradient colors={['#7c3aed', '#6d28d9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' }}>
                {registering ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Create Account</Text>
                )}
              </LinearGradient>
            </AnimatedPressable>

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }} />
              <Text style={{ marginHorizontal: 12, fontSize: 13, color: isDark ? '#6b7280' : '#9ca3af' }}>or</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }} />
            </View>

            {/* Google button */}
            <TouchableOpacity onPress={handleGooglePress} disabled={isLoading} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 20, gap: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}>
              {googleInProgress || googleLoading ? (
                <ActivityIndicator color="#6b7280" />
              ) : (
                <>
                  <Image source={icons.google} style={{ width: 20, height: 20 }} resizeMode="contain" />
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#1a1a1a' }}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={{ textAlign: 'center', fontSize: 14, color: isDark ? '#9ca3af' : '#6b7280' }}>
              Already have an account?{' '}
              <Text onPress={() => router.replace('/(auth)/login')} style={{ color: '#7c3aed', fontWeight: '700' }}>
                Log in
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Register;
