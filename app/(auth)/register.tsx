import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useColorScheme } from '~/hooks/useColorScheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@apollo/client';
import { REGISTER, LOGIN, GOOGLE_SIGN_IN } from '@/Graphql/Mutations';
import Session from '@/helpers/Session';
import { getClientId, WEB_CLIENT_ID } from '~/helpers/ClientID';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useUserStore } from '~/store/user.store';
import { useAppStore } from '~/store/app.store';
import AnimatedPressable from '~/components/AnimatedPressable';
import icons from '@/constants/icons';
import { brand, hud, FONT, HudField, HudLabel, WordMark, RADIUS } from '~/components/hud';
import { deviceTimeZone } from '~/helpers/dateKeys';
import { consumeInstallReferralCode } from '~/helpers/installReferrer';

// ─── Screen ───────────────────────────────────────────────────────────────────

const Register = () => {
  // Auth flow is always obsidian — one cohesive dark world with welcome/login.
  const c = hud(true);
  const { setUser } = useUserStore();
  const { addAlert } = useAppStore();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [googleInProgress, setGoogleInProgress] = useState(false);
  // Prefilled from an invite deep-link (?ref=CODE); still editable.
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  const [referralCode, setReferralCode] = useState((ref || '').toUpperCase());

  /**
   * Recover a code that came in through the install itself.
   *
   * A friend who taps an invite has no deep link waiting for them on the other
   * side of the Play Store, so without this the code they were sent has to be
   * retyped from memory. Play hands it back once, on first launch.
   *
   * A deep-linked code wins — it is the more specific signal, and this read is
   * one-shot, so it must not overwrite something the user is already looking at.
   */
  useEffect(() => {
    let active = true;

    if (ref) return;

    consumeInstallReferralCode()
      .then((code) => {
        if (!active || !code) return;
        setReferralCode((current) => (current ? current : code));
      })
      .catch(() => {
        // An invite is never worth an error on the signup screen.
      });

    return () => {
      active = false;
    };
  }, [ref]);


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
    await register({
      variables: {
        input: {
          email: email.trim().toLowerCase(),
          username: username.trim(),
          password,
          ...(referralCode.trim() ? { referralCode: referralCode.trim() } : {}),
          // Sent at signup so reminders land at the right local hour from day one.
          ...(deviceTimeZone() ? { timezone: deviceTimeZone() } : {}),
        },
      },
    });
  };

  // ─── Google Sign-In (unchanged — do not modify) ───────────────────────────

  const startSignInFlow = async () => {
    try {
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
      await googleSignIn({
        variables: {
          idToken,
          ...(referralCode.trim() ? { referralCode: referralCode.trim() } : {}),
          ...(deviceTimeZone() ? { timezone: deviceTimeZone() } : {}),
        },
      });
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
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <LinearGradient
        colors={['rgba(124,58,237,0.16)', 'transparent']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 260 }}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Wordmark + status line */}
          <View style={{ alignItems: 'center', marginBottom: 26 }}>
            <WordMark size={34} color={c.text} accent={c.violet} />
            <HudLabel color={c.textDim} style={{ marginTop: 12 }}>◇ Begin your first quest</HudLabel>
          </View>

          {/* Registration panel */}
          <View
            style={{
              backgroundColor: c.panel,
              borderRadius: RADIUS.lg,
              borderWidth: 1,
              borderColor: c.panelBorder,
              padding: 22,
              paddingTop: 26,
            }}>
            <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: c.violet, opacity: 0.85 }} />

            <HudLabel color={c.textFaint} style={{ marginBottom: 18 }}>New character</HudLabel>

            <HudField label="Email" value={email} onChange={setEmail} placeholder="you@example.com" keyboardType="email-address" />
            <HudField label="Username" value={username} onChange={setUsername} placeholder="yourhandle" />
            <HudField label="Password" value={password} onChange={setPassword} placeholder="At least 8 characters" isPassword />
            <HudField label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Repeat your password" isPassword />
            <HudField label="Referral code · optional" value={referralCode} onChange={(t) => setReferralCode(t.toUpperCase())} placeholder="Bonus AI credits for you both" autoCapitalize="characters" />

            {/* Terms */}
            <TouchableOpacity
              onPress={() => setAccepted((a) => !a)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, marginBottom: 20 }}
              activeOpacity={0.7}>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: RADIUS.xs,
                  borderWidth: 1.5,
                  borderColor: accepted ? c.violet : c.panelBorderStrong,
                  backgroundColor: accepted ? c.violet : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {accepted && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={{ flex: 1, fontSize: 13, fontFamily: FONT.regular, color: c.textDim }}>
                I agree to the{' '}
                <Text onPress={() => router.push('/(screens)/terms-of-service')} style={{ color: c.violet, fontFamily: FONT.semibold }}>
                  Terms & Conditions
                </Text>
              </Text>
            </TouchableOpacity>

            {/* Primary */}
            <AnimatedPressable onPress={handleSubmit} scaleDown={0.96} disabled={isLoading} style={{ marginBottom: 18 }}>
              <LinearGradient colors={[brand.violet, brand.violetDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: RADIUS.md, height: 52, alignItems: 'center', justifyContent: 'center' }}>
                {registering ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 15, fontFamily: FONT.bold }}>Create account</Text>
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
            <TouchableOpacity onPress={handleGooglePress} disabled={isLoading} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: RADIUS.md, backgroundColor: c.bgElev, borderWidth: 1, borderColor: c.panelBorder, gap: 10 }}>
              {googleInProgress || googleLoading ? (
                <ActivityIndicator color={c.textDim} />
              ) : (
                <>
                  <Image source={icons.google} style={{ width: 20, height: 20 }} resizeMode="contain" />
                  <Text style={{ fontSize: 15, fontFamily: FONT.bold, color: c.text }}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text style={{ textAlign: 'center', fontSize: 14, fontFamily: FONT.regular, color: c.textDim, marginTop: 22 }}>
            Already have an account?{' '}
            <Text onPress={() => router.replace('/(auth)/login')} style={{ color: c.violet, fontFamily: FONT.bold }}>
              Log in
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Register;
