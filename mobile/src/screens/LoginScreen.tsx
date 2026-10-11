import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { RootStackParamList } from '../app/navigation/types';
import { useAuth } from '../app/providers/AuthProvider';
import { useBiometric } from '../app/providers/BiometricProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { loginAsDemoUser, loginWithCredentials } = useAuth();
  const { authenticate, availability, enabled } = useBiometric();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goToTabs = () => {
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'MainTabs' }] }),
    );
  };

  const handleLogin = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Введіть email і пароль.');
      return;
    }
    setSubmitting(true);
    const result = await loginWithCredentials({
      email: email.trim().toLowerCase(),
      password,
    });
    setSubmitting(false);
    if (result.ok) {
      goToTabs();
    } else {
      setError(result.error ?? 'Не вдалося увійти.');
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    await loginAsDemoUser();
    goToTabs();
  };

  const handleBiometricLogin = async () => {
    setError(null);
    const result = await authenticate('Підтвердьте вхід у VolunteerHub');
    if (result.ok) {
      await loginAsDemoUser();
      goToTabs();
    } else if (result.reason === 'unavailable') {
      setError('Біометрія недоступна на цьому пристрої.');
    } else if (result.reason === 'cancel') {
      setError('Скасовано.');
    } else {
      setError('Помилка автентифікації.');
    }
  };

  const showBiometricButton = availability.available && enabled;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        testID="login-screen"
      >
        <Text style={styles.title}>VolunteerHub</Text>
        <Text style={styles.subtitle}>Локальні волонтерські ініціативи</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="email@volunteerhub.local"
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
          editable={!submitting}
          testID="login-email"
        />

        <Text style={styles.label}>Пароль</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="•••••••"
          secureTextEntry
          editable={!submitting}
          testID="login-password"
        />

        <TouchableOpacity
          style={[styles.primaryButton, submitting && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={submitting}
          testID="login-submit"
        >
          <Text style={styles.primaryButtonText}>
            {submitting ? 'Вхід…' : 'Увійти'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigation.navigate('Register')}
          testID="login-register-link"
        >
          <Text style={styles.linkText}>
            Немає акаунта? Створити акаунт →
          </Text>
        </TouchableOpacity>

        {showBiometricButton ? (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleBiometricLogin}
            testID="login-biometric-button"
          >
            <Text style={styles.secondaryButtonText}>Увійти через біометрію</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.hint} testID="login-biometric-hint">
            {availability.available
              ? 'Увімкніть біометрію в налаштуваннях безпеки після входу.'
              : 'Біометрія недоступна на цьому пристрої / емуляторі.'}
          </Text>
        )}

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.demoButton}
          onPress={handleDemoLogin}
          testID="login-demo-button"
        >
          <Text style={styles.demoButtonText}>
            Тестовий вхід (без email і пароля)
          </Text>
        </TouchableOpacity>
        <Text style={styles.hint}>
          Тестовий вхід — для швидкого огляду застосунку. Звичайний
          вхід використовує email і пароль.
        </Text>

        {error ? (
          <Text style={styles.error} testID="login-error">
            {error}
          </Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 64,
    paddingBottom: 48,
    backgroundColor: '#fafafa',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1f6feb',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
    color: '#444',
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111',
  },
  primaryButton: {
    backgroundColor: '#1f6feb',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: { backgroundColor: '#a8c2eb' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkRow: { paddingVertical: 12, alignItems: 'center' },
  linkText: { color: '#1f6feb', fontSize: 14 },
  secondaryButton: {
    borderColor: '#1f6feb',
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: { color: '#1f6feb', fontSize: 16, fontWeight: '600' },
  hint: { color: '#888', fontSize: 12, marginTop: 8, textAlign: 'center' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 24 },
  demoButton: {
    backgroundColor: '#fff',
    borderColor: '#888',
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  demoButtonText: { color: '#666', fontSize: 13 },
  error: { color: '#a00', marginTop: 16, textAlign: 'center' },
});
