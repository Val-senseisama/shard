import { useEffect, useRef, useState } from 'react';
import AppSplashScreen from '~/components/AppSplashScreen';
import { useFonts } from 'expo-font';
import { router, SplashScreen, Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getDb } from '@/services/db';
import * as syncService from '@/services/syncService';
import * as mutationQueue from '@/services/mutationQueue';
import { useShardStore } from '@/store/shard.store';
import { useScheduleStore } from '@/store/schedule.store';
import '../global.css';
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  ApolloLink,
  HttpLink,
  Observable,
  Observer,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { jwtDecode } from 'jwt-decode';
import Session from '@/helpers/Session';
import { CONFIG } from '@/config';
import { logger } from '@/helpers/Logger';

// ─── Apollo client — created once at module level ─────────────────────────────
// IMPORTANT: must not be inside the component or the cache resets on every render.

const middlewareAuthLink = new ApolloLink((operation, forward) =>
  new Observable((observer: Observer<any>) => {
    (async () => {
      try {
        const headers: Record<string, string> = {
          'x-access-token': (await Session.getCookie('x-access-token')) || '',
          'x-refresh-token': (await Session.getCookie('x-refresh-token')) || '',
        };
        const refresh = (await Session.getCookie('x-force-token')) || '';
        if (refresh) {
          headers['x-force-token'] = refresh;
          await Session.clearAllCookies();
        }
        operation.setContext({ headers });
        const sub = forward(operation).subscribe({
          next: (r) => observer.next?.(r),
          error: (e) => observer.error?.(e),
          complete: () => observer.complete?.(),
        });
        return () => sub.unsubscribe();
      } catch (e) {
        observer.error?.(e);
      }
    })();
  })
);

const afterwareLink = new ApolloLink((operation, forward) =>
  forward(operation).map((response) => {
    const { response: { headers } = {} as any } = operation.getContext();
    if (headers) {
      const accessToken = headers.get('x-access-token');
      if (accessToken) {
        try {
          const decoded: any = jwtDecode(accessToken);
          if (decoded.exp > Math.floor(Date.now() / 1000) && decoded.id) {
            Session.setCookie('x-access-token', accessToken);
            Session.setCookie('x-refresh-token', headers.get('x-refresh-token'));
          } else {
            Session.clearAllCookies();
          }
        } catch {
          Session.clearAllCookies();
        }
      }
    }
    return response;
  })
);

const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      logger.log('graphql-error', message, 'high', {
        operation: operation.operationName,
        path,
        locations,
      });
    });
  }
  if (networkError) {
    logger.log('network-error', networkError.message, 'medium', {
      operation: operation.operationName,
    });
  }
});

const httpLink = new HttpLink({ uri: CONFIG.GRAPHQL_ENDPOINT, credentials: 'omit' });

const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, middlewareAuthLink, afterwareLink, httpLink]),
  cache: new InMemoryCache(),
});
import { isLoggedIn } from '@/helpers/isLoggedIn';
import Toast from 'react-native-toast-message';
import { AppState, Text, View } from 'react-native';
import CrystalShape from '@/components/ToastCrystal';
import UndoToast from '@/components/UndoToast';
import UserProvider from '@/components/UserProvider';
import PushTokenRegistration from '@/components/PushTokenRegistration';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '~/store/app.store';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import notificationService from '~/services/notificationService';
import * as Notifications from 'expo-notifications';
import { SYNC_SESSION } from '@/Graphql/Mutations';
import { deviceTimeZone } from '~/helpers/dateKeys';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Global Error Handling for Mobile
if (!__DEV__) {
  const originalErrorHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    logger.log('fatal-error', error, isFatal ? 'critical' : 'high', { isFatal });
    originalErrorHandler(error, isFatal);
  });
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState<boolean>(false);
  const colorScheme = useColorScheme();
  const { setColorScheme } = useNativeWindColorScheme();
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const isOnline = useAppStore((state) => state.isOnline);
  const setOnline = useAppStore((state) => state.setOnline);
  const setShards = useShardStore((state) => state.setShards);
  const setSchedule = useScheduleStore((state) => state.setSchedule);
  const wasOfflineRef = useRef(false);
  const insets = useSafeAreaInsets();

  const [fontsLoaded, error] = useFonts({
    'Inter-Thin': require('@/assets/fonts/Inter_18pt-Light.ttf'),
    'Inter-Light': require('@/assets/fonts/Inter_18pt-Light.ttf'),
    'Inter-Regular': require('@/assets/fonts/Inter_18pt-Regular.ttf'),
    'Inter-Medium': require('@/assets/fonts/Inter_18pt-Medium.ttf'),
    'Inter-SemiBold': require('@/assets/fonts/Inter_18pt-SemiBold.ttf'),
    'Inter-Black': require('@/assets/fonts/Inter_24pt-Black.ttf'),
    'Inter-Bold': require('@/assets/fonts/Inter_24pt-Bold.ttf'),
    'Inter-ExtraBold': require('@/assets/fonts/Inter_24pt-ExtraBold.ttf'),
    // HUD utility face — mono caps for labels, stats, XP, quest codes.
    'SpaceMono': require('@/assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Apply dark mode from app store
  useEffect(() => {
    setColorScheme(isDarkMode ? 'dark' : 'light');
  }, [isDarkMode, setColorScheme]);

  // Initialize push notifications
  useEffect(() => {
    let mounted = true;

    const initNotifications = async () => {
      try {
        // Initialize notification service
        await notificationService.initialize();

        // Get push token
        const token = await notificationService.registerForPushNotifications();
        if (token) {
          console.log('📱 Push token obtained:', token.substring(0, 30) + '...');
          // Token will be registered with backend by PushTokenRegistration component
        }
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };

    // Handle notification tap navigation.
    // `screen` is checked FIRST: the server sends both a deep link and a
    // shardId on many notifications, and the deep link is the specific
    // intent — a streak nudge should open the schedule, not the shard it
    // happens to reference.
    const routeFromData = (data: Record<string, any> | null | undefined) => {
      if (!data) return;
      if (data.screen) {
        router.push(data.screen as any);
      } else if (data.chatId) {
        router.push({
          pathname: '/(screens)/shard/[id]/chat',
          params: { id: data.chatId as string },
        });
      } else if (data.shardId) {
        router.push(`/(screens)/shard/${data.shardId as string}`);
      }
    };

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      routeFromData(response.notification.request.content.data);
    });

    if (isUserLoggedIn) {
      initNotifications();
      // A tap that cold-started the app is delivered before this effect ever
      // runs, so the listener above never sees it. Replay it once, after auth
      // has resolved — otherwise the push lands the user on the default screen
      // and the whole point of the notification is lost.
      notificationService
        .getLaunchNotificationData()
        .then((data) => {
          if (mounted) routeFromData(data);
        })
        .catch(() => {});
    }

    return () => {
      mounted = false;
      notificationService.cleanup();
      subscription.remove();
    };
  }, [isUserLoggedIn]);

  // ─── Session sync (presence + timezone) ──────────────────────────────────
  // Pushes the device's IANA zone up on mount and on every return to the
  // foreground. The server schedules every reminder against the STORED zone, so
  // a user who travels — or who signed up before we captured it — would
  // otherwise keep getting nudged on someone else's clock.
  useEffect(() => {
    if (!isUserLoggedIn) return;

    const sync = () => {
      apolloClient
        .mutate({ mutation: SYNC_SESSION, variables: { timezone: deviceTimeZone() } })
        .catch(() => {}); // best-effort; never block or surface
    };

    sync();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => sub.remove();
  }, [isUserLoggedIn]);

  // ─── DB init + auth check + seed stores from SQLite ──────────────────────
  useEffect(() => {
    const prepare = async () => {
      try {
        await getDb(); // runs migrations
        const loggedIn = await isLoggedIn();
        setIsUserLoggedIn(loggedIn);

        if (loggedIn) {
          // Seed UI from SQLite so the user sees data immediately even offline
          const [cachedShards, cachedSchedule] = await Promise.all([
            syncService.getShards(),
            syncService.getSchedule(),
          ]);
          if (cachedShards.length) setShards(cachedShards as any);
          if (cachedSchedule.tasks.length) setSchedule(cachedSchedule as any);
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
      }
    };

    prepare();
  }, []);

  // ─── NetInfo — track online state, drain queue on reconnect ──────────────
  // Imported lazily: @react-native-community/netinfo requires a native build.
  // The listener simply won't register if the module isn't compiled in yet.
  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const NetInfo = require('@react-native-community/netinfo').default;
      unsub = NetInfo.addEventListener(async (state: { isConnected: boolean | null }) => {
        const online = state.isConnected ?? false;
        setOnline(online);

        if (online && wasOfflineRef.current) {
          wasOfflineRef.current = false;
          const pending = await mutationQueue.getPendingCount();
          if (pending > 0) {
            await mutationQueue.drain(apolloClient);
          }
        }

        if (!online) wasOfflineRef.current = true;
      });
    } catch {
      // Native module not available in this build — offline detection disabled
    }
    return () => unsub?.();
  }, [setOnline]);

  useEffect(() => {
    if (isReady && fontsLoaded && !error) {
      if (isUserLoggedIn) {
        router.replace('/(screens)/(tabs)/Home');
      } else {
        Session.clearAllCookies();
        router.replace('/(auth)/welcome');
      }
      SplashScreen.hideAsync();
    }
  }, [isReady, fontsLoaded, error, isUserLoggedIn]);

  if (!isReady || !fontsLoaded || error) {
    return <AppSplashScreen />;
  }

  const toastConfig = {
    success: ({ text1 }: any) => (
      <View
        className="flex flex-row items-center gap-1 rounded-md bg-black px-5 py-3"
        style={{
          backgroundColor: '#333333',
          elevation: 1,
          borderRadius: 8,
        }}>
        <CrystalShape color="#4135F3" />
        <Text className="text-white">{text1}</Text>
      </View>
    ),
    error: ({ text1 }: any) => (
      <View
        className="flex flex-row items-center gap-1 rounded-md bg-black p-4"
        style={{
          backgroundColor: '#333333',
          elevation: 1,
          borderRadius: 8,
        }}>
        <CrystalShape color="#ef4444" />
        <Text className="text-white">{text1}</Text>
      </View>
    ),
    info: ({ text1 }: any) => (
      <View
        className="flex flex-row items-center gap-1 rounded-md bg-black p-4"
        style={{
          backgroundColor: '#333333',
          elevation: 1,
          borderRadius: 8,
        }}>
        <CrystalShape color="#3b82f6" />
        <Text className="text-white">{text1}</Text>
      </View>
    ),
    undo: (props: any) => <UndoToast {...props} />,
  };

  return (
    <ApolloProvider client={apolloClient}>
      <GestureHandlerRootView>
        <ThemeProvider value={isDarkMode ? DarkTheme : DefaultTheme}>
          <StatusBar style={isDarkMode ? 'light' : 'dark'} />
          {!isOnline && (
            <View
              style={{
                backgroundColor: '#b45309',
                paddingTop: insets.top + 4,
                paddingBottom: 6,
                paddingHorizontal: 16,
                alignItems: 'center',
              }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                You're offline — changes will sync when you reconnect
              </Text>
            </View>
          )}
          <UserProvider />
          <PushTokenRegistration />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'ios_from_right', // Hardware accelerated
              animationDuration: 250, // Faster (default is 350ms)
              presentation: 'card',
              gestureEnabled: true,
              animationTypeForReplace: 'push', // Smooth replace animations
              keyboardHandlingEnabled: true,
            }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(screens)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'fade' }} />
          </Stack>
          <Toast config={toastConfig} />
        </ThemeProvider>
      </GestureHandlerRootView>
    </ApolloProvider>
  );
}
