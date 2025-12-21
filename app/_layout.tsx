import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { router, SplashScreen, Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/hooks/useColorScheme';
import '../global.css';
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  ApolloLink,
  HttpLink,
  Observable,
  Observer,
  useQuery,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { jwtDecode } from 'jwt-decode';
import Session from '@/helpers/Session';
import { CONFIG } from '@/config';
import { isLoggedIn } from '@/helpers/isLoggedIn';
import Toast from 'react-native-toast-message';
import { Text, View } from 'react-native';
import CrystalShape from '@/components/ToastCrystal';
import UserProvider from '@/components/UserProvider';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAppStore } from '~/store/app.store';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState<boolean>(false);
  const colorScheme = useColorScheme();
  const { setColorScheme } = useNativeWindColorScheme();
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  
  const [fontsLoaded, error] = useFonts({
    'Inter-Thin': require('@/assets/fonts/Inter_18pt-Light.ttf'),
    'Inter-Light': require('@/assets/fonts/Inter_18pt-Light.ttf'),
    'Inter-Regular': require('@/assets/fonts/Inter_18pt-Regular.ttf'),
    'Inter-Medium': require('@/assets/fonts/Inter_18pt-Medium.ttf'),
    'Inter-SemiBold': require('@/assets/fonts/Inter_18pt-SemiBold.ttf'),
    'Inter-Black': require('@/assets/fonts/Inter_24pt-Black.ttf'),
    'Inter-Bold': require('@/assets/fonts/Inter_24pt-Bold.ttf'),
    'Inter-ExtraBold': require('@/assets/fonts/Inter_24pt-ExtraBold.ttf'),
  });

  // Apply dark mode from app store
  useEffect(() => {
    setColorScheme(isDarkMode ? 'dark' : 'light');
  }, [isDarkMode, setColorScheme]);

  useEffect(() => {
    const prepare = async () => {
      try {
        const loggedIn = await isLoggedIn();
        setIsUserLoggedIn(loggedIn);
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
      }
    };

    prepare();
  }, []);

  useEffect(() => {
    if (isReady && fontsLoaded && !error) {
      if (isUserLoggedIn) {
        router.replace('/(screens)/Home');
      } else {
        Session.clearAllCookies();
        router.replace('/(auth)/welcome');
      }
      SplashScreen.hideAsync();
    }
  }, [isReady, fontsLoaded, error, isUserLoggedIn]);

  if (!isReady || !fontsLoaded || error) {
    return null;
  }

  const middlewareAuthLink = new ApolloLink((operation, forward) => {
    return new Observable((observer: Observer<any>) => {
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

          const subscription = forward(operation).subscribe({
            next: (result) => observer.next?.(result),
            error: (error) => observer.error?.(error),
            complete: () => observer.complete?.(),
          });

          return () => {
            if (subscription) subscription.unsubscribe();
          };
        } catch (error) {
          observer.error?.(error);
        }
      })();
    });
  });

  // After the backend responds, we take the x-refresh-token and x-refresh-token from headers if it exists, and save it in the session.
  const afterwareLink = new ApolloLink((operation, forward) => {
    return forward(operation).map((response) => {
      const context = operation.getContext();
      const {
        response: { headers },
      } = context;

      if (headers) {
        const refreshToken = headers.get('x-refresh-token');
        const accessToken = headers.get('x-access-token');
        if (accessToken) {
          try {
            const decoded: any = jwtDecode(accessToken);
            const isExpired = decoded.exp <= Math.floor(Date.now() / 1000);
            if (!isExpired && decoded.id) {
              Session.setCookie('x-access-token', accessToken);
              Session.setCookie('x-refresh-token', refreshToken);
            } else {
              Session.clearAllCookies();
            }
          } catch (err) {
            // err
            Session.clearAllCookies();
          }
        }
      }

      return response;
    });
  });

  const errorLink = onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors) {
      graphQLErrors.forEach(({ message, locations, path }) => {
        console.log(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`);
      });
    }
    if (networkError) {
      console.log('[Network error]:', networkError);
    }
  });

  const httpLink = new HttpLink({
    uri: CONFIG.GRAPHQL_ENDPOINT,
    credentials: 'omit',
  });

  const client = new ApolloClient({
    link: ApolloLink.from([errorLink, middlewareAuthLink, afterwareLink, httpLink]),
    cache: new InMemoryCache(),
  });

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
  };

  return (
    <ApolloProvider client={client}>
      <GestureHandlerRootView>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <UserProvider />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(screens)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack>
        <Toast config={toastConfig} />
      </ThemeProvider>
      </GestureHandlerRootView>
    </ApolloProvider>
  );
}
