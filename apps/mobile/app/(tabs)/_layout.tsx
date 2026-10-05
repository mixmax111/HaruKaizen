import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { COLORS } from '../../src/config';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: COLORS.card,
        },
        headerTitleStyle: {
          color: COLORS.text,
          fontWeight: '700',
        },
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.cardBorder,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textDim,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'HaruKaizen',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Gym Tracker',
          headerTitle: 'Modalità Palestra',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🏋️</Text>,
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Nutrizione',
          headerTitle: 'Diario & Barcode',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🥗</Text>,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progressi',
          headerTitle: 'Ghosting Camera',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📷</Text>,
        }}
      />
    </Tabs>
  );
}
