import React from 'react';
import { Stack } from 'expo-router';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TypedStack: any = Stack;

export default function AuthLayout() {
  return (
    <TypedStack screenOptions={{ headerShown: false }}>
      <TypedStack.Screen name="login" options={{ headerShown: false }} />
      <TypedStack.Screen name="register" options={{ headerShown: false }} />
    </TypedStack>
  );
}

