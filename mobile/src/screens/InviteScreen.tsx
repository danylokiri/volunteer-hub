import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../app/navigation/types';
import { useAuth } from '../app/providers/AuthProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'Invite'>;

export function InviteScreen({ route, navigation }: Props) {
  const { token } = route.params;
  const { currentUserId, loginAsDemoUser } = useAuth();

  const handleAccept = async () => {
    if (!currentUserId) {
      // In Phase 7 a pending-deep-link record is set before this screen
      // is reached when not logged in. Here we just auto-login.
      await loginAsDemoUser();
    }
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  const handleDecline = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <View style={styles.container} testID="invite-screen">
      <Text style={styles.icon}>🤝</Text>
      <Text style={styles.title}>Запрошення</Text>
      <Text style={styles.tokenLabel}>Токен:</Text>
      <Text style={styles.token} testID="invite-token">
        {token}
      </Text>
      <Text style={styles.description}>
        {currentUserId
          ? 'Вас запрошено приєднатися до VolunteerHub.'
          : 'Прийміть запрошення для входу до VolunteerHub.'}
      </Text>

      <TouchableOpacity
        style={styles.acceptButton}
        onPress={handleAccept}
        testID="invite-accept"
      >
        <Text style={styles.acceptButtonText}>Прийняти</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.declineButton}
        onPress={handleDecline}
        testID="invite-decline"
      >
        <Text style={styles.declineButtonText}>Відхилити</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
    padding: 32,
  },
  icon: { fontSize: 48 },
  title: { fontSize: 24, fontWeight: '700', color: '#111', marginTop: 12 },
  tokenLabel: { fontSize: 12, color: '#888', marginTop: 24 },
  token: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f6feb',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  description: {
    textAlign: 'center',
    color: '#444',
    marginTop: 24,
    lineHeight: 22,
  },
  acceptButton: {
    backgroundColor: '#1f6feb',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 32,
    width: '100%',
    alignItems: 'center',
  },
  acceptButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  declineButton: {
    paddingVertical: 14,
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
  declineButtonText: { color: '#888', fontSize: 14 },
});
