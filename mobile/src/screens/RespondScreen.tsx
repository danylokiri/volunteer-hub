// RespondScreen — modal form a volunteer fills out to leave a real
// response on someone else's request. Replaces the old "(заглушка)"
// alert that lived inside RequestDetailScreen.

import React, { useState } from 'react';
import {
  Alert,
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
import { RootStackParamList } from '../app/navigation/types';
import { useAuth } from '../app/providers/AuthProvider';
import {
  useRequests,
  useResponses,
} from '../app/providers/RepositoryProvider';
import { ApiError } from '../data/api/ApiError';

type Props = NativeStackScreenProps<RootStackParamList, 'Respond'>;

export function RespondScreen({ navigation, route }: Props) {
  const { requestId } = route.params;
  const { currentUserId } = useAuth();
  const { getById } = useRequests();
  const { create } = useResponses();

  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = getById(requestId);
  const registrationOpen =
    request?.registrationStatus
      ? request.registrationStatus === 'open'
      : true;

  const handleSubmit = async () => {
    if (!currentUserId) {
      setError('Спочатку увійдіть.');
      return;
    }
    const trimmed = message.trim();
    if (!trimmed) {
      setError('Поле "Повідомлення" обовʼязкове.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await create({
        requestId,
        volunteerId: currentUserId,
        message: trimmed,
        contact: contact.trim() || undefined,
        comment: comment.trim() || undefined,
      });
      Alert.alert('Готово', 'Ваш відгук надіслано автору заявки.');
      if (navigation.canGoBack()) navigation.goBack();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'REGISTRATION_CLOSED') {
          setError('Реєстрація волонтерів закрита для цієї заявки.');
        } else {
          setError(`Помилка: ${err.message}`);
        }
      } else {
        setError('Невідома помилка. Спробуйте ще раз.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!request) {
    return (
      <View style={styles.center} testID="respond-screen-not-found">
        <Text style={styles.notFound}>Запит не знайдено: {requestId}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        testID="respond-screen"
      >
        <Text style={styles.heading}>Відгук на заявку</Text>
        <Text style={styles.requestTitle} testID="respond-screen-request-title">
          {request.title}
        </Text>

        {!registrationOpen ? (
          <View style={styles.warningBox} testID="respond-screen-closed">
            <Text style={styles.warningText}>
              Реєстрацію волонтерів для цієї заявки закрито. Нові відгуки
              не приймаються.
            </Text>
          </View>
        ) : null}

        <Text style={styles.label}>Повідомлення для автора *</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={message}
          onChangeText={setMessage}
          placeholder="Що ви можете запропонувати? Коли зручно?"
          multiline
          numberOfLines={4}
          editable={registrationOpen && !submitting}
          testID="respond-screen-message"
        />

        <Text style={styles.label}>Контакт (телефон / нікнейм) — за бажанням</Text>
        <TextInput
          style={styles.input}
          value={contact}
          onChangeText={setContact}
          placeholder="+380… або @nickname"
          autoCapitalize="none"
          editable={registrationOpen && !submitting}
          testID="respond-screen-contact"
        />

        <Text style={styles.label}>Додатковий коментар — за бажанням</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={comment}
          onChangeText={setComment}
          placeholder="Деталі, обмеження часу, тощо."
          multiline
          numberOfLines={3}
          editable={registrationOpen && !submitting}
          testID="respond-screen-comment"
        />

        {error ? (
          <Text style={styles.error} testID="respond-screen-error">
            {error}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[
            styles.submit,
            (!registrationOpen || submitting) && styles.submitDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!registrationOpen || submitting}
          testID="respond-screen-submit"
        >
          <Text style={styles.submitText}>
            {submitting ? 'Надсилання…' : 'Надіслати відгук'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancel}
          onPress={() => navigation.canGoBack() && navigation.goBack()}
          disabled={submitting}
          testID="respond-screen-cancel"
        >
          <Text style={styles.cancelText}>Скасувати</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  content: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { color: '#a00' },
  heading: { fontSize: 18, fontWeight: '700', color: '#111' },
  requestTitle: { fontSize: 14, color: '#1f6feb', marginTop: 4, marginBottom: 16 },
  label: { fontSize: 13, color: '#444', marginTop: 14, marginBottom: 6 },
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
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  warningBox: {
    backgroundColor: '#fff5e6',
    borderColor: '#a16207',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  warningText: { color: '#a16207', fontSize: 13 },
  submit: {
    backgroundColor: '#1f6feb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  submitDisabled: { backgroundColor: '#a8c2eb' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancel: { alignItems: 'center', paddingVertical: 12, marginTop: 6 },
  cancelText: { color: '#666', fontSize: 14 },
  error: {
    marginTop: 12,
    color: '#a00',
    fontSize: 13,
  },
});
