import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DataProvider } from './src/context/DataContext';
import { SettingsProvider } from './src/context/SettingsContext';
import { AutoPlayProvider } from './src/features/location/AutoPlayContext';
import { PrivacyProvider } from './src/features/privacy/PrivacyContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <PrivacyProvider>
          <DataProvider>
            <AutoPlayProvider>
              <StatusBar style="light" />
              <AppNavigator />
            </AutoPlayProvider>
          </DataProvider>
        </PrivacyProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
