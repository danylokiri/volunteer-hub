import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { MainTabsParamList } from './types';
import { RequestsListScreen } from '../../screens/RequestsListScreen';
import { CreateRequestScreen } from '../../screens/CreateRequestScreen';
import { NotificationsScreen } from '../../screens/NotificationsScreen';
import { ProfileScreen } from '../../screens/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabsParamList>();

function tabIcon(label: string) {
  return ({ focused }: { focused: boolean }) => (
    <View>
      <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>{label}</Text>
    </View>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      <Tab.Screen
        name="Requests"
        component={RequestsListScreen}
        options={{
          title: 'Запити',
          tabBarLabel: 'Запити',
          tabBarIcon: tabIcon('📋'),
        }}
      />
      <Tab.Screen
        name="Create"
        component={CreateRequestScreen}
        options={{
          title: 'Створити',
          tabBarLabel: 'Створити',
          tabBarIcon: tabIcon('➕'),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Сповіщення',
          tabBarLabel: 'Сповіщення',
          tabBarIcon: tabIcon('🔔'),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Профіль',
          tabBarLabel: 'Профіль',
          tabBarIcon: tabIcon('👤'),
        }}
      />
    </Tab.Navigator>
  );
}
