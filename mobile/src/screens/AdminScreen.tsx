// AdminScreen — visible only to users whose roles include 'admin'.
// Lists every request the local store knows about and exposes
// moderator actions (cancel / delete) plus a top-level "Закрити
// реєстрацію" shortcut. The screen is gated at two layers: the
// ProfileScreen link only renders for admins, and this screen renders
// a "no access" message when entered without admin role.

import React from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../app/navigation/types';
import {
  useRequests,
  useUserProfile,
} from '../app/providers/RepositoryProvider';
import { useAuth } from '../app/providers/AuthProvider';
import { hasRole } from '../domain/models/UserProfile';
import {
  formatPrimaryLocation,
  formatSecondaryLocation,
} from '../domain/location/formatLocation';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminPanel'>;

const STATUS_LABEL: Record<string, string> = {
  open: 'Відкритий',
  in_progress: 'В процесі',
  completion_requested: 'Очікує підтвердження',
  completed: 'Завершено',
  cancelled: 'Скасовано',
};

export function AdminScreen({ navigation }: Props) {
  const { currentUserId } = useAuth();
  const profile = useUserProfile(currentUserId);
  const { requests, updateStatus, delete: deleteRequest } = useRequests();

  if (!hasRole(profile, 'admin')) {
    return (
      <View style={styles.center} testID="admin-screen-denied">
        <Text style={styles.deniedTitle}>Доступ заборонено</Text>
        <Text style={styles.deniedBody}>
          Ця сторінка доступна лише користувачам із роллю «admin».
        </Text>
      </View>
    );
  }

  const handleCancel = (id: string) => {
    Alert.alert(
      'Скасувати заявку',
      `Точно скасувати ${id}?`,
      [
        { text: 'Ні', style: 'cancel' },
        {
          text: 'Так',
          style: 'destructive',
          onPress: () => updateStatus(id, 'cancelled'),
        },
      ],
    );
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Видалити заявку',
      `Точно видалити ${id}? Це не можна скасувати.`,
      [
        { text: 'Ні', style: 'cancel' },
        {
          text: 'Так',
          style: 'destructive',
          onPress: () => deleteRequest(id),
        },
      ],
    );
  };

  return (
    <View style={styles.container} testID="admin-screen">
      <Text style={styles.header}>
        Панель адміністратора · {requests.length} заявок
      </Text>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View
            style={styles.card}
            testID={`admin-request-${item.id}`}
          >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>
              {STATUS_LABEL[item.status] ?? item.status} · {item.id}
            </Text>
            <Text style={styles.location}>
              📍 {formatPrimaryLocation(item)}
            </Text>
            <Text style={styles.address}>{formatSecondaryLocation(item)}</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.openButton}
                onPress={() =>
                  navigation.navigate('RequestDetail', { id: item.id })
                }
                testID={`admin-open-${item.id}`}
              >
                <Text style={styles.openButtonText}>Відкрити</Text>
              </TouchableOpacity>
              {item.status !== 'cancelled' &&
              item.status !== 'completed' ? (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => handleCancel(item.id)}
                  testID={`admin-cancel-${item.id}`}
                >
                  <Text style={styles.cancelButtonText}>Скасувати</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item.id)}
                testID={`admin-delete-${item.id}`}
              >
                <Text style={styles.deleteButtonText}>Видалити</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty} testID="admin-empty">
            Заявок немає.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  deniedTitle: { fontSize: 18, fontWeight: '700', color: '#a00' },
  deniedBody: { textAlign: 'center', color: '#666', marginTop: 8 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 13,
    color: '#666',
  },
  listContent: { padding: 16, paddingTop: 0 },
  card: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  title: { fontSize: 15, fontWeight: '600', color: '#111' },
  meta: { fontSize: 12, color: '#1f6feb', marginTop: 4 },
  location: { fontSize: 13, color: '#111', marginTop: 6 },
  address: { fontSize: 12, color: '#555', marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  openButton: {
    backgroundColor: '#1f6feb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  openButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  cancelButton: {
    backgroundColor: '#fff5e6',
    borderColor: '#a16207',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelButtonText: { color: '#a16207', fontSize: 13, fontWeight: '600' },
  deleteButton: {
    backgroundColor: '#fff5f5',
    borderColor: '#a00',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButtonText: { color: '#a00', fontSize: 13, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#888', marginTop: 32 },
});
