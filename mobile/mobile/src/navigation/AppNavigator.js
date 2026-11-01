import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Text } from 'react-native';
import AutoPlayScreen from '../features/location/AutoPlayScreen';
import MapScreen from '../features/map/MapScreen';
import ExploreScreen from '../features/places/ExploreScreen';
import PoiDetailScreen from '../features/places/PoiDetailScreen';
import PrivacyScreen from '../features/privacy/PrivacyScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const icon = (glyph) => ({ focused }) => <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{glyph}</Text>;

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        tabBarActiveTintColor: colors.primary,
      }}
    >
      <Tab.Screen name="Explore" component={ExploreScreen} options={{ title: 'Khám phá', tabBarIcon: icon('🧭') }} />
      <Tab.Screen name="Map" component={MapScreen} options={{ title: 'Bản đồ', tabBarIcon: icon('🗺️') }} />
      <Tab.Screen name="AutoPlay" component={AutoPlayScreen} options={{ title: 'Tự phát', tabBarIcon: icon('📍') }} />
      <Tab.Screen name="Privacy" component={PrivacyScreen} options={{ title: 'Riêng tư', tabBarIcon: icon('🔒') }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff' }}>
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="PoiDetail" component={PoiDetailScreen} options={({ route }) => ({ title: route.params?.name ?? 'Chi tiết' })} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
