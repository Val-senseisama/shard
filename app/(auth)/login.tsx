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
import { router } from 'expo-router';
import { useMutation } from '@apollo/client';
import { LOGIN, GOOGLE_SIGN_IN } from '@/Graphql/Mutations';
import Session from '@/helpers/Session';
import { getClientId, WEB_CLIENT_ID } from '~/helpers/ClientID';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useUserStore } from '~/store/user.store';
import { useAppStore } from '~/store/app.store';
import AnimatedPressable from '~/components/AnimatedPressable';
import icons from '@/constants/icons';
import { Image } from 'react-native';
import { hud, FONT, HudField, HudLabel, WordMark, CornerBrackets } from '~/components/hud';

// ─── Screen ───────────────────────────────────────────────────────────────────

const Login = () => {
  // Auth flow is always obsidian — one cohesive dark world with welcome/onboarding.
  const c = hud(true);
  const { setUser } = useUserStore();
  const { addAlert } = useAppStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [googleInProgress, setGoogleInProgress] = useState(false);
  const isSigningIn = useRef(false);

  // ─── Email/password login ──────────────────────────────────────────────────

  const [loginMutation, { loading: loginLoading }] = useMutation(LOGIN, {
    onCompleted: async (data) => {
      if (data.login.accessToken) {
        await Session.setCookie('x-access-token', data.login.accessToken);
        await Session.setCookie('x-refresh-token', data.login.refreshToken);
        setUser(data.login.user);
        router.replace('/(screens)/Home');
      } else {
        addAlert({ str: data.login.message || 'Login failed', type: 'error' });
      }
    },
    onError: (error) => {
      addAlert({ str: error.message || 'Login failed', type: 'error' });
    },
  });

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      addAlert({ str: 'Please fill in all fields', type: 'error' });
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      addAlert({ str: 'Please enter a valid email address', type: 'error' });
      return;
    }
    await loginMutation({ variables: { email: email.trim().toLowerCase(), password } });
  };

  // ─── Google Sign-In (unchanged — do not modify) ───────────────────────────

  const startSignInFlow = async () => {
    if (isSigningIn.current) {
      console.log('Sign-in already in progress, ignoring duplicate call');
      return;
    }

    try {
      isSigningIn.current = true;
      console.log('Starting Google Sign-In flow...');

      const config = {
        webClientId: WEB_CLIENT_ID,
        iosClientId: getClientId(),
        scopes: ['profile', 'email'],
        offlineAccess: true,
        forceCodeForRefreshToken: true,
      };
      console.log('Google Sign-In config:', config);

      GoogleSignin.configure(config);

      if (Platform.OS === 'android') {
        console.log('andriod');
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }

      try {
        console.log('Trying silent sign-in...');
        const response = await GoogleSignin.signInSilently();
        console.log('Silent sign-in response:', response);

        if (response && response.type === 'success') {
          console.log('Silent sign-in successful');
          await handleGoogleSignInSuccess(response);
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
        await handleGoogleSignInSuccess(signInResponse);
      } catch (signInError) {
        console.error('Sign-in error:', signInError);
        throw signInError;
      }
    } catch (error: any) {
      console.error('Google Sign-In Error:', { message: error.message, code: error?.code, details: error });

      let errorMessage = 'Failed to sign in with Google';
      if (error?.code === 'SIGN_IN_CANCELLED') errorMessage = 'Sign in was cancelled';
      else if (error?.code === 'IN_PROGRESS' || error?.code === 'ASYNC_OP_IN_PROGRESS' || error?.code === '12502') errorMessage = 'Sign in is already in progress';
      else if (error?.code === 'PLAY_SERVICES_NOT_AVAILABLE') errorMessage = 'Google Play services not available';
      else if (error?.message?.includes('DEVELOPER_ERROR')) errorMessage = 'Developer error - check your Google Sign-In configuration';

      addAlert({ str: errorMessage, type: 'error' });
    } finally {
      isSigningIn.current = false;
    }
  };

  const [googleSignIn, { loading: googleLoading }] = useMutation(GOOGLE_SIGN_IN, {
    onCompleted: async (data) => {
      if (data.googleSignIn?.accessToken) {
        await Session.setCookie('x-access-token', data.googleSignIn.accessToken);
        await Session.setCookie('x-refresh-token', data.googleSignIn.refreshToken);
        setUser(data.googleSignIn.user);
        router.replace('/(screens)/Home');
      }
    },
    onError: (error) => {
      console.error('Google Sign-In error:', { message: error.message, networkError: error.networkError ? { name: error.networkError.name, message: error.networkError.message } : null, graphQLErrors: error.graphQLErrors });
      addAlert({ str: error.message || 'Failed to sign in with Google', type: 'error' });
      GoogleSignin.signOut().catch(console.error);
    },
  });

  const handleGoogleSignInSuccess = async (response: { type: string; user?: any; idToken?: string }) => {
    try {
      if (!response || response.type !== 'success') throw new Error('Invalid sign-in response from Google');
      const tokens = await GoogleSignin.getTokens();
      if (!tokens?.idToken) throw new Error('No ID token received from Google');
      console.log('Google Sign-In: ID token received, authenticating with backend...');
      await googleSignIn({ variables: { idToken: tokens.idToken } });
    } catch (error: any) {
      console.error('Google Sign-In error:', { message: error.message, code: error.code, details: error });
      addAlert({ str: error.message || 'Failed to sign in with Google', type: 'error' });
      try { await GoogleSignin.signOut(); } catch (e) { console.error('Error during Google sign out:', e); }
    }
  };

  // ─── JSX ──────────────────────────────────────────────────────────────────

  const handleGooglePress = async () => {
    setGoogleInProgress(true);
    try {
      await startSignInFlow();
    } finally {
      setGoogleInProgress(false);
    }
  };

  const isLoading = loginLoading || googleLoading || googleInProgress;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Ambient facet wash at the top edge */}
      <LinearGradient
        colors={['rgba(124,58,237,0.16)', 'transparent']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 260 }}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Wordmark + status line */}
          <View style={{ alignItems: 'center', marginBottom: 30 }}>
            <WordMark size={34} color={c.text} accent={c.violet} />
            <HudLabel color={c.textDim} style={{ marginTop: 12 }}>◇ Welcome back, adventurer</HudLabel>
          </View>

          {/* Access panel */}
          <View
            style={{
              backgroundColor: c.panel,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: c.panelBorder,
              padding: 22,
              paddingTop: 26,
            }}>
            <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: c.violet, opacity: 0.85 }} />
            <CornerBrackets color={c.panelBorderStrong} inset={8} size={13} />

            <HudLabel color={c.textFaint} style={{ marginBottom: 18 }}>Sign in</HudLabel>

            <HudField label="Email" value={email} onChange={setEmail} placeholder="you@example.com" keyboardType="email-address" />
            <HudField label="Password" value={password} onChange={setPassword} placeholder="Your password" isPassword />

            {/* Primary */}
            <AnimatedPressable onPress={handleSubmit} scaleDown={0.96} disabled={isLoading} style={{ marginTop: 6, marginBottom: 18 }}>
              <LinearGradient colors={['#8b5cf6', '#6d28d9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 8, height: 52, alignItems: 'center', justifyContent: 'center' }}>
                {loginLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 13, fontFamily: FONT.mono, letterSpacing: 2, textTransform: 'uppercase' }}>Log in</Text>
                )}
              </LinearGradient>
            </AnimatedPressable>

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: c.panelBorder }} />
              <HudLabel color={c.textFaint} style={{ marginHorizontal: 12 }}>or</HudLabel>
              <View style={{ flex: 1, height: 1, backgroundColor: c.panelBorder }} />
            </View>

            {/* Google */}
            <TouchableOpacity onPress={handleGooglePress} disabled={isLoading} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 8, backgroundColor: c.bgElev, borderWidth: 1, borderColor: c.panelBorder, gap: 10 }}>
              {googleInProgress || googleLoading ? (
                <ActivityIndicator color={c.textDim} />
              ) : (
                <>
                  <Image source={icons.google} style={{ width: 20, height: 20 }} resizeMode="contain" />
                  <Text style={{ fontSize: 13, fontFamily: FONT.mono, letterSpacing: 1.5, textTransform: 'uppercase', color: c.text }}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text style={{ textAlign: 'center', fontSize: 14, fontFamily: FONT.regular, color: c.textDim, marginTop: 22 }}>
            New here?{' '}
            <Text onPress={() => router.replace('/(auth)/register')} style={{ color: c.violet, fontFamily: FONT.bold }}>
              Create an account
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Login;
