import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { COLORS } from '../../src/config';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TypedTabs: any = Tabs;

export default function TabsLayout() {
  return (
    <TypedTabs
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
      <TypedTabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'HaruKaizen',
          tabBarIcon: ({ color }: { color: string }) => <Text style={{ fontSize: 18, color }}>🏠</Text>,
        }}
      />
      <TypedTabs.Screen
        name="workout"
        options={{
          title: 'Gym Tracker',
          headerTitle: 'Modalità Palestra',
          tabBarIcon: ({ color }: { color: string }) => <Text style={{ fontSize: 18, color }}>🏋️</Text>,
        }}
      />
      <TypedTabs.Screen
        name="nutrition"
        options={{
          title: 'Nutrizione',
          headerTitle: 'Diario & Barcode',
          tabBarIcon: ({ color }: { color: string }) => <Text style={{ fontSize: 18, color }}>🥗</Text>,
        }}
      />
      <TypedTabs.Screen
        name="progress"
        options={{
          title: 'Progressi',
          headerTitle: 'Ghosting Camera',
          tabBarIcon: ({ color }: { color: string }) => <Text style={{ fontSize: 18, color }}>📷</Text>,
        }}
      />
    </TypedTabs>
  );
}
