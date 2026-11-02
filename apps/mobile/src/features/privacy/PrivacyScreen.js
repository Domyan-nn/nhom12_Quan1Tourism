import React from 'react';
import { ScrollView, Text } from 'react-native';
import { Banner, Button } from '../../components/StateViews';
import { useSettings } from '../../context/SettingsContext';
import { colors, space } from '../../theme';
import { usePrivacy } from './PrivacyContext';

export default function PrivacyScreen() {
  const { t } = useSettings();
  const { hasPendingRevoke, consent, revoke } = usePrivacy();
  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingVertical: space.md }}>
      <Text style={{ color: colors.text, padding: space.md }}>{t.analyticsUnavailable}</Text>
      {consent === 'granted' ? <Button title={t.withdrawLocal} onPress={revoke} /> : null}
      {hasPendingRevoke ? <Banner>{t.pendingRevoke}</Banner> : null}
    </ScrollView>
  );
}
