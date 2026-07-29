// navigation/AppNavigator.jsx
import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ConversationList from './messaging/ConversationList';
import MessageList from './messaging/MessageList';
import api from '../services/api';
import websocket from '../services/WebSocketManager';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MessagingStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#81348d',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="Conversations" 
        component={ConversationList}
        options={{
          title: 'Messages',
        }}
      />
      <Stack.Screen 
        name="MessageList" 
        component={MessageList}
        options={({ route }) => ({
          title: route.params?.otherUserName || 'Chat',
        })}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Messages') {
            iconName = focused ? 'chat' : 'chat-outline';
          } else if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#81348d',
        tabBarInactiveTintColor: '#9ca3af',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Messages" component={MessagingStack} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeWebSocket();
  }, []);

  const initializeWebSocket = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        websocket.connect(token);
        
        // Register push token (iOS/Android)
        if (Platform.OS !== 'web') {
          const pushToken = await getPushToken();
          if (pushToken) {
            api.registerPushToken(pushToken, Platform.OS);
          }
        }
      }
    } catch (error) {
      console.error('WebSocket init error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return <MainTabs />;
}