import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { RootStackParamList } from '../app/navigation/types';
import { useAuth } from '../app/providers/AuthProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [wantsToVolunteer, setWantsToVolunteer] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goToTabs = () => {
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'MainTabs' }] }),
    );
  };

  const handleSubmit = async () => {
    setError(null);
    if (fullName.trim().length < 2) {
      setError('Введіть повне ім’я (мінімум 2 символи).');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Введіть коректну email-адресу.');
      return;
    }
    if (password.length < 4) {
      setError('Пароль має містити щонайменше 4 символи.');
      return;
    }
    setSubmitting(true);
    const result = await register({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      password,
      wantsToVolunteer,
    });
    setSubmitting(false);
    if (result.ok) {
      goToTabs();
    } else {
      setError(result.error ?? 'Не вдалося створити акаунт.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        testID="register-screen"
      >
        <Text style={styles.title}>Створення акаунта</Text>
        <Text style={styles.subtitle}>
          Пароль зберігається локально у сервісі (sha-256 + сіль).
        </Text>

        <Text style={styles.label}>Повне ім’я</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Ім’я Прізвище"
          editable={!submitting}
          testID="register-full-name"
        />

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
          testID="register-email"
        />

        <Text style={styles.label}>Пароль (мін. 4 символи)</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="•••••••"
          secureTextEntry
          editable={!submitting}
          testID="register-password"
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>
            Хочу також допомагати як волонтер
          </Text>
          <Switch
            value={wantsToVolunteer}
            onValueChange={setWantsToVolunteer}
            disabled={submitting}
            testID="register-wants-volunteer"
          />
        </View>

        {error ? (
          <Text style={styles.error} testID="register-error">
            {error}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryButton, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          testID="register-submit"
        >
          <Text style={styles.primaryButtonText}>
            {submitting ? 'Створення…' : 'Створити акаунт'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigation.goBack()}
          disabled={submitting}
          testID="register-back-link"
        >
          <Text style={styles.linkText}>← Повернутись до входу</Text>
        </TouchableOpacity>
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
    fontSize: 24,
    fontWeight: '700',
    color: '#1f6feb',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    marginBottom: 24,
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  switchLabel: { fontSize: 14, color: '#111', flex: 1, paddingRight: 12 },
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
  error: { color: '#a00', marginTop: 16, textAlign: 'center' },
});
