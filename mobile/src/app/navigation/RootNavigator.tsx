import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import {
  createNavigationContainerRef,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { MainTabs } from './MainTabs';
import { LoginScreen } from '../../screens/LoginScreen';
import { RegisterScreen } from '../../screens/RegisterScreen';
import { RequestDetailScreen } from '../../screens/RequestDetailScreen';
import { InviteScreen } from '../../screens/InviteScreen';
import { SecuritySettingsScreen } from '../../screens/SecuritySettingsScreen';
import { DebugDeepLinkScreen } from '../../screens/DebugDeepLinkScreen';
import { LockScreen } from '../../screens/LockScreen';
import { AdminScreen } from '../../screens/AdminScreen';
import { RespondScreen } from '../../screens/RespondScreen';
import { LocationPickerScreen } from '../../screens/LocationPickerScreen';
import { useAuth } from '../providers/AuthProvider';

const RootStack = createNativeStackNavigator<RootStackParamList>();

export const navigationRef =
  createNavigationContainerRef<RootStackParamList>();

// Documentation-only: the prefixes the app accepts. Used by README and
// tests. The runtime routing is owned exclusively by `DeepLinkProvider`,
// so this list is intentionally NOT passed to `NavigationContainer.linking`
// -- doing so would create a second, parallel URL handler that races
// with the custom router. The OS still delivers links to the app via
// the `volunteerhub` scheme registered in `app.json`; expo-linking then
// surfaces them through `getInitialURL` / `addEventListener`, both of
// which `DeepLinkProvider` subscribes to.
export const LINKING_PREFIXES = [
  'volunteerhub://',
  'https://volunteerhub.local/',
] as const;

export function RootNavigator() {
  const { currentUserId, isHydrated } = useAuth();

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const initialRouteName: keyof RootStackParamList = currentUserId
    ? 'MainTabs'
    : 'Login';

  return (
    <NavigationContainer ref={navigationRef}>
      <RootStack.Navigator initialRouteName={initialRouteName}>
        <RootStack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <RootStack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ title: 'Створити акаунт' }}
        />
        <RootStack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <RootStack.Screen
          name="RequestDetail"
          component={RequestDetailScreen}
          options={{ title: 'Деталі запиту' }}
        />
        <RootStack.Screen
          name="Invite"
          component={InviteScreen}
          options={{ title: 'Запрошення' }}
        />
        <RootStack.Screen
          name="SecuritySettings"
          component={SecuritySettingsScreen}
          options={{ title: 'Безпека' }}
        />
        <RootStack.Screen
          name="DebugDeepLink"
          component={DebugDeepLinkScreen}
          options={{ title: 'Debug Deep Link' }}
        />
        <RootStack.Screen
          name="Lock"
          component={LockScreen}
          options={{ headerShown: false, presentation: 'modal' }}
        />
        <RootStack.Screen
          name="AdminPanel"
          component={AdminScreen}
          options={{ title: 'Адмін-панель' }}
        />
        <RootStack.Screen
          name="Respond"
          component={RespondScreen}
          options={{ title: 'Відгук волонтера', presentation: 'modal' }}
        />
        <RootStack.Screen
          name="LocationPicker"
          component={LocationPickerScreen}
          options={{ title: 'Локація', presentation: 'modal' }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
