import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../app/navigation/types';
import { useBiometric } from '../app/providers/BiometricProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'Lock'>;

export function LockScreen({ navigation, route }: Props) {
  const { authenticate, state } = useBiometric();
  const [error, setError] = useState<string | null>(null);
  const reason =
    route.params?.reason ?? 'Розблокуйте VolunteerHub через біометрію';

  const tryUnlock = async () => {
    setError(null);
    const result = await authenticate(reason);
    if (result.ok) {
      navigation.goBack();
    } else if (result.reason === 'unavailable') {
      setError('Біометрія недоступна на цьому пристрої.');
    } else if (result.reason === 'cancel') {
      setError('Скасовано користувачем.');
    } else {
      setError('Помилка автентифікації. Спробуйте ще раз.');
    }
  };

  // Trigger automatically on mount.
  useEffect(() => {
    void tryUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container} testID="lock-screen">
      <Text style={styles.icon}>🔒</Text>
      <Text style={styles.title}>Заблоковано</Text>
      <Text style={styles.subtitle}>{reason}</Text>

      {state === 'Authenticating' ? (
        <ActivityIndicator style={{ marginTop: 16 }} />
      ) : null}

      {error ? (
        <Text style={styles.error} testID="lock-error">
          {error}
        </Text>
      ) : null}

      <TouchableOpacity
        style={styles.retryButton}
        onPress={tryUnlock}
        testID="lock-retry-button"
      >
        <Text style={styles.retryButtonText}>Спробувати ще раз</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  icon: { fontSize: 48 },
  title: { fontSize: 24, fontWeight: '700', marginTop: 12, color: '#111' },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  error: { color: '#a00', marginTop: 16, textAlign: 'center' },
  retryButton: {
    marginTop: 32,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1f6feb',
  },
  retryButtonText: { color: '#fff', fontWeight: '600' },
});
