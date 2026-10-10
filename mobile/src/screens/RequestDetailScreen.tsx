import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../app/navigation/types';
import { HelpRequest } from '../domain/models/HelpRequest';
import {
  useRequests,
  useResponses,
  useUserProfile,
} from '../app/providers/RepositoryProvider';
import { useAuth } from '../app/providers/AuthProvider';
import { useBiometric } from '../app/providers/BiometricProvider';
import { buildShareUrl } from '../deeplink/buildShareUrl';
import {
  formatPrimaryLocation,
  formatSecondaryLocation,
  formatTechnicalCoords,
} from '../domain/location/formatLocation';
import { getAvailableRequestActions } from '../domain/permissions/getAvailableRequestActions';
import { ApiError } from '../data/api/ApiError';

type Props = NativeStackScreenProps<RootStackParamList, 'RequestDetail'>;

const CATEGORY_LABELS: Record<string, string> = {
  pets: 'Тварини',
  shopping: 'Покупки',
  transport: 'Транспорт',
  medical: 'Медицина',
  tutoring: 'Навчання',
  other: 'Інше',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Відкритий',
  in_progress: 'В процесі',
  completion_requested: 'Очікує підтвердження',
  completed: 'Завершено',
  cancelled: 'Скасовано',
};

const RESPONSE_STATUS_LABEL: Record<string, string> = {
  pending: 'Очікує',
  accepted: 'Прийнято',
  declined: 'Відхилено',
  withdrawn: 'Відкликано',
};

const DECLINE_REASON_LABEL: Record<string, string> = {
  manually_declined: 'автор відхилив відгук',
  registration_closed: 'реєстрацію закрито',
  capacity_filled: 'усі місця волонтерів заповнені',
};

export function RequestDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const {
    getById,
    delete: deleteRequest,
    setRegistrationStatus,
    requestCompletion,
    confirmCompletion,
    updateStatus,
  } = useRequests();
  const {
    listByRequest,
    accept: acceptResponse,
    decline: declineResponse,
    withdraw: withdrawResponse,
  } = useResponses();
  const { currentUserId } = useAuth();
  const currentUser = useUserProfile(currentUserId);
  const { authenticate, availability, enabled } = useBiometric();
  const [showTechnical, setShowTechnical] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const request: HelpRequest | undefined = getById(id);
  const responses = listByRequest(id);
  const isOwn = request?.createdByUserId === currentUserId;

  if (!request) {
    return (
      <View style={styles.center} testID="request-detail-not-found">
        <Text style={styles.notFound}>Запит не знайдено: {id}</Text>
      </View>
    );
  }

  const actions = currentUser
    ? getAvailableRequestActions(currentUser, request, responses)
    : [];
  const canRespond = actions.includes('respond');
  const canMarkCompleted = actions.includes('mark_completed');
  const canConfirmCompletion = actions.includes('confirm_completion');
  const canCancelRequest = actions.includes('cancel_request');
  const canCloseRegistration = actions.includes('close_registration');
  const canReopenRegistration = actions.includes('reopen_registration');
  const canAdminDelete = actions.includes('admin_delete');
  const canAcceptResponses = actions.includes('accept_response');
  const canDeclineResponses = actions.includes('decline_response');

  const accepted = request.acceptedVolunteerIds ?? [];
  const slotsMode = request.volunteerSlotsMode ?? 'unlimited';
  const slots = request.volunteerSlots;
  const registrationOpen = (request.registrationStatus ?? 'open') === 'open';
  const ownPendingResponse = currentUserId
    ? responses.find(
        (r) => r.volunteerId === currentUserId && r.status === 'pending',
      )
    : undefined;

  const goToRespond = () => {
    navigation.navigate('Respond', { requestId: request.id });
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: buildShareUrl(request) });
    } catch {
      // ignore -- user cancelled
    }
  };

  const confirmCriticalAction = async (
    label: string,
  ): Promise<boolean> => {
    if (availability.available && enabled) {
      const result = await authenticate(label);
      return result.ok;
    }
    return await new Promise<boolean>((resolve) => {
      Alert.alert(
        label,
        'Підтвердьте дію.',
        [
          { text: 'Скасувати', onPress: () => resolve(false), style: 'cancel' },
          { text: 'Підтвердити', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
  };

  const runAction = async (label: string, fn: () => Promise<unknown>) => {
    setPendingAction(label);
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Невідома помилка';
      setActionError(`${label}: ${msg}`);
    } finally {
      setPendingAction(null);
    }
  };

  const handleMarkCompleted = async () => {
    if (!currentUserId) return;
    const ok = await confirmCriticalAction('Позначити виконаним');
    if (!ok) return;
    await runAction('mark-completed', () =>
      requestCompletion(request.id, currentUserId),
    );
  };

  const handleConfirmCompletion = async () => {
    const ok = await confirmCriticalAction('Підтвердити виконання');
    if (!ok) return;
    await runAction('confirm-completion', () => confirmCompletion(request.id));
  };

  const handleCancelRequest = async () => {
    const ok = await confirmCriticalAction('Скасувати заявку');
    if (!ok) return;
    await runAction('cancel-request', () => updateStatus(request.id, 'cancelled'));
  };

  const handleCloseRegistration = async () => {
    Alert.alert(
      'Закрити реєстрацію',
      'Поточні pending-відгуки буде відхилено з причиною "registration_closed". Продовжити?',
      [
        { text: 'Ні', style: 'cancel' },
        {
          text: 'Так, закрити',
          style: 'destructive',
          onPress: () =>
            runAction('close-registration', () =>
              setRegistrationStatus(request.id, 'closed', true),
            ),
        },
      ],
    );
  };

  const handleReopenRegistration = async () => {
    await runAction('reopen-registration', () =>
      setRegistrationStatus(request.id, 'open'),
    );
  };

  const handleAcceptResponse = async (responseId: string) => {
    await runAction(`accept-${responseId}`, () =>
      acceptResponse(request.id, responseId),
    );
  };

  const handleDeclineResponse = async (responseId: string) => {
    Alert.alert('Відхилити відгук?', 'Волонтер побачить, що автор відхилив.', [
      { text: 'Ні', style: 'cancel' },
      {
        text: 'Так',
        style: 'destructive',
        onPress: () =>
          runAction(`decline-${responseId}`, () =>
            declineResponse(request.id, responseId),
          ),
      },
    ]);
  };

  const handleWithdraw = async (responseId: string) => {
    if (!currentUserId) return;
    Alert.alert(
      'Відкликати відгук?',
      'Ви зможете надіслати новий, якщо реєстрація лишається відкрита.',
      [
        { text: 'Ні', style: 'cancel' },
        {
          text: 'Так',
          onPress: () =>
            runAction(`withdraw-${responseId}`, () =>
              withdrawResponse(request.id, responseId, currentUserId),
            ),
        },
      ],
    );
  };

  const handleDelete = async () => {
    const ok = await confirmCriticalAction('Видалити запит');
    if (!ok) return;
    await runAction('delete', async () => {
      await deleteRequest(request.id);
      if (navigation.canGoBack()) navigation.goBack();
    });
  };

  const slotsCounter =
    slotsMode === 'limited' && typeof slots === 'number'
      ? `Прийнято ${accepted.length} з ${slots}`
      : `Прийнято ${accepted.length} · необмежено`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="request-detail-screen"
    >
      <Text style={styles.title} testID="request-detail-title">
        {request.title}
      </Text>
      <Text style={styles.meta}>
        {CATEGORY_LABELS[request.category] ?? request.category}
        {' · '}
        <Text testID="request-detail-status">
          {STATUS_LABELS[request.status] ?? request.status}
        </Text>
      </Text>

      <View style={styles.locationBox} testID="request-detail-location">
        <Text
          style={styles.locationPrimary}
          testID="request-detail-location-primary"
        >
          📍 {formatPrimaryLocation(request)}
        </Text>
        <Text
          style={styles.locationSecondary}
          testID="request-detail-location-secondary"
        >
          {formatSecondaryLocation(request)}
        </Text>
      </View>

      <Text style={styles.description} testID="request-detail-description">
        {request.description}
      </Text>

      <Text style={styles.section}>Реєстрація волонтерів</Text>
      <Text style={styles.value} testID="request-detail-slots-counter">
        {slotsCounter}
      </Text>
      <Text style={styles.value} testID="request-detail-registration-status">
        Статус реєстрації: {registrationOpen ? 'відкрита' : 'закрита'}
      </Text>

      {canCloseRegistration ? (
        <TouchableOpacity
          style={styles.smallButton}
          onPress={handleCloseRegistration}
          disabled={!!pendingAction}
          testID="request-detail-close-registration"
        >
          <Text style={styles.smallButtonText}>Закрити реєстрацію</Text>
        </TouchableOpacity>
      ) : null}
      {canReopenRegistration ? (
        <TouchableOpacity
          style={styles.smallButton}
          onPress={handleReopenRegistration}
          disabled={!!pendingAction}
          testID="request-detail-reopen-registration"
        >
          <Text style={styles.smallButtonText}>Відкрити реєстрацію</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.section}>Інформація</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Створив:</Text>
        <Text style={styles.value}>{request.createdByUserId}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Призначений:</Text>
        <Text style={styles.value}>
          {request.assignedVolunteerId ?? '— ще немає —'}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Створено:</Text>
        <Text style={styles.value}>{request.createdAt}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Sync status:</Text>
        <Text style={styles.value} testID="request-detail-sync-status">
          {request.syncStatus}
        </Text>
      </View>

      <Text style={styles.section}>Відгуки ({responses.length})</Text>
      {responses.map((r) => {
        const isMine = r.volunteerId === currentUserId;
        const showAccept =
          canAcceptResponses && r.status === 'pending';
        const showDecline =
          canDeclineResponses && r.status === 'pending';
        const showWithdraw = isMine && r.status === 'pending';
        return (
          <View
            key={r.id}
            style={styles.responseCard}
            testID={`response-row-${r.id}`}
          >
            <Text style={styles.responseAuthor}>{r.volunteerId}</Text>
            <Text style={styles.responseMessage}>{r.message}</Text>
            {r.contact ? (
              <Text style={styles.responseContact}>
                Контакт: {r.contact}
              </Text>
            ) : null}
            <Text
              style={styles.responseStatus}
              testID={`response-status-${r.id}`}
            >
              {RESPONSE_STATUS_LABEL[r.status] ?? r.status}
              {r.declineReason
                ? ` · ${DECLINE_REASON_LABEL[r.declineReason] ?? r.declineReason}`
                : ''}
            </Text>
            <View style={styles.responseActions}>
              {showAccept ? (
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleAcceptResponse(r.id)}
                  disabled={!!pendingAction}
                  testID={`response-accept-${r.id}`}
                >
                  <Text style={styles.acceptButtonText}>Прийняти</Text>
                </TouchableOpacity>
              ) : null}
              {showDecline ? (
                <TouchableOpacity
                  style={styles.declineButton}
                  onPress={() => handleDeclineResponse(r.id)}
                  disabled={!!pendingAction}
                  testID={`response-decline-${r.id}`}
                >
                  <Text style={styles.declineButtonText}>Відхилити</Text>
                </TouchableOpacity>
              ) : null}
              {showWithdraw ? (
                <TouchableOpacity
                  style={styles.declineButton}
                  onPress={() => handleWithdraw(r.id)}
                  disabled={!!pendingAction}
                  testID={`response-withdraw-${r.id}`}
                >
                  <Text style={styles.declineButtonText}>Відкликати</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        );
      })}

      {actionError ? (
        <Text style={styles.error} testID="request-detail-action-error">
          {actionError}
        </Text>
      ) : null}

      {canRespond ? (
        <TouchableOpacity
          style={styles.respondButton}
          onPress={goToRespond}
          testID="request-detail-respond"
        >
          <Text style={styles.respondButtonText}>Відгукнутись</Text>
        </TouchableOpacity>
      ) : null}

      {ownPendingResponse ? (
        <Text style={styles.ownStatus} testID="request-detail-own-pending">
          Ваш відгук очікує рішення автора.
        </Text>
      ) : null}

      <TouchableOpacity
        style={styles.shareButton}
        onPress={handleShare}
        testID="request-detail-share"
      >
        <Text style={styles.shareButtonText}>Поділитись</Text>
      </TouchableOpacity>

      {canMarkCompleted ? (
        <TouchableOpacity
          style={styles.completeButton}
          onPress={handleMarkCompleted}
          disabled={!!pendingAction}
          testID="request-detail-mark-completed"
        >
          <Text style={styles.completeButtonText}>Позначити виконаним</Text>
        </TouchableOpacity>
      ) : null}

      {canConfirmCompletion ? (
        <TouchableOpacity
          style={styles.completeButton}
          onPress={handleConfirmCompletion}
          disabled={!!pendingAction}
          testID="request-detail-confirm-completion"
        >
          <Text style={styles.completeButtonText}>Підтвердити виконання</Text>
        </TouchableOpacity>
      ) : null}

      {canCancelRequest ? (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancelRequest}
          disabled={!!pendingAction}
          testID="request-detail-cancel-request"
        >
          <Text style={styles.cancelButtonText}>Скасувати заявку</Text>
        </TouchableOpacity>
      ) : null}

      {isOwn ? (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={!!pendingAction}
          testID="request-detail-delete"
        >
          <Text style={styles.deleteButtonText}>Видалити</Text>
        </TouchableOpacity>
      ) : null}

      {canAdminDelete && !isOwn ? (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={!!pendingAction}
          testID="request-detail-admin-delete"
        >
          <Text style={styles.deleteButtonText}>Видалити (адмін)</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={styles.technicalToggle}
        onPress={() => setShowTechnical((v) => !v)}
        testID="request-detail-technical-toggle"
      >
        <Text style={styles.technicalToggleText}>
          {showTechnical ? '— Сховати технічні дані' : '+ Показати технічні дані'}
        </Text>
      </TouchableOpacity>
      {showTechnical ? (
        <View style={styles.technicalBox}>
          <Text style={styles.technicalLine} testID="request-detail-coords">
            Координати: {formatTechnicalCoords(request)}
          </Text>
          <Text style={styles.technicalLine}>id: {request.id}</Text>
          <Text style={styles.technicalLine}>
            slots mode: {slotsMode}
            {slotsMode === 'limited' ? ` (${slots ?? '?'})` : ''}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { color: '#a00' },
  title: { fontSize: 22, fontWeight: '700', color: '#111' },
  meta: { fontSize: 13, color: '#1f6feb', marginTop: 6 },
  locationBox: {
    marginTop: 12,
    backgroundColor: '#f3f7ff',
    padding: 10,
    borderRadius: 8,
  },
  locationPrimary: { fontSize: 15, color: '#111', fontWeight: '600' },
  locationSecondary: { fontSize: 13, color: '#444', marginTop: 4 },
  description: { fontSize: 15, color: '#333', marginTop: 12, lineHeight: 22 },
  row: { flexDirection: 'row', marginTop: 6 },
  label: { fontSize: 13, color: '#666', width: 110 },
  value: { fontSize: 13, color: '#111', flex: 1 },
  section: {
    fontSize: 13,
    color: '#888',
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 8,
  },
  responseCard: {
    backgroundColor: '#fafafa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  responseAuthor: { fontSize: 13, color: '#1f6feb', fontWeight: '600' },
  responseMessage: { fontSize: 13, color: '#333', marginTop: 4 },
  responseContact: { fontSize: 12, color: '#555', marginTop: 4 },
  responseStatus: { fontSize: 11, color: '#888', marginTop: 4 },
  responseActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  acceptButton: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  acceptButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  declineButton: {
    backgroundColor: '#fff5f5',
    borderColor: '#a00',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  declineButtonText: { color: '#a00', fontSize: 12, fontWeight: '600' },
  smallButton: {
    backgroundColor: '#f3f7ff',
    borderColor: '#1f6feb',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  smallButtonText: { color: '#1f6feb', fontSize: 13, fontWeight: '600' },
  ownStatus: {
    marginTop: 12,
    color: '#444',
    fontSize: 13,
    textAlign: 'center',
  },
  respondButton: {
    backgroundColor: '#1f6feb',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 24,
    alignItems: 'center',
  },
  respondButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  shareButton: {
    borderColor: '#1f6feb',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  shareButtonText: { color: '#1f6feb', fontWeight: '600', fontSize: 16 },
  completeButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  completeButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  cancelButton: {
    backgroundColor: '#fff5f5',
    borderColor: '#a16207',
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  cancelButtonText: { color: '#a16207', fontWeight: '600', fontSize: 15 },
  deleteButton: {
    backgroundColor: '#fff5f5',
    borderColor: '#a00',
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  deleteButtonText: { color: '#a00', fontWeight: '600', fontSize: 15 },
  error: { color: '#a00', marginTop: 12, textAlign: 'center' },
  technicalToggle: { marginTop: 24, alignItems: 'center' },
  technicalToggleText: { color: '#888', fontSize: 12 },
  technicalBox: { marginTop: 8, padding: 8, backgroundColor: '#fafafa' },
  technicalLine: { fontSize: 11, color: '#888' },
});
