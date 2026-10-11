import React from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useNotifications,
  useRepositoryBundle,
} from '../app/providers/RepositoryProvider';
import { mapNotification } from '../domain/notifications/mapNotification';
import { NotificationEvent } from '../domain/models/NotificationEvent';
import { useAuth } from '../app/providers/AuthProvider';
import { navigationRef } from '../app/navigation/RootNavigator';

function timeLabel(iso: string): string {
  // Render a short "HH:MM · DD.MM" — robust against bad inputs.
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const hh = `${d.getHours()}`.padStart(2, '0');
    const mm = `${d.getMinutes()}`.padStart(2, '0');
    const dd = `${d.getDate()}`.padStart(2, '0');
    const mo = `${d.getMonth() + 1}`.padStart(2, '0');
    return `${hh}:${mm} · ${dd}.${mo}`;
  } catch {
    return iso;
  }
}

export function NotificationsScreen() {
  const { notifications, markRead, unreadCount } = useNotifications();
  const { currentUserId } = useAuth();
  const repos = useRepositoryBundle();

  // Mapper context: live request/user lookup would require async I/O;
  // notifications carry the human title/message inline (set when they
  // were appended), so the mapper falls back to those without lookup.
  void repos;
  const ctx = {
    currentUserId: currentUserId ?? undefined,
  };

  const handlePress = async (item: NotificationEvent) => {
    await markRead(item.id);
    const rendered = mapNotification(item, ctx);
    if (rendered.relatedRequestId && navigationRef.isReady()) {
      navigationRef.navigate('RequestDetail', { id: rendered.relatedRequestId });
    }
  };

  return (
    <View style={styles.container} testID="notifications-screen">
      <Text style={styles.header}>
        Непрочитаних:{' '}
        <Text testID="notifications-unread-count">{unreadCount}</Text>
      </Text>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const rendered = mapNotification(item, ctx);
          return (
            <TouchableOpacity
              style={[styles.row, !item.read && styles.unread]}
              testID={`notification-row-${item.id}`}
              onPress={() => handlePress(item)}
            >
              <Text style={styles.title} testID={`notification-title-${item.id}`}>
                {rendered.title}
              </Text>
              {rendered.message ? (
                <Text
                  style={styles.message}
                  testID={`notification-message-${item.id}`}
                  numberOfLines={2}
                >
                  {rendered.message}
                </Text>
              ) : null}
              <Text style={styles.meta}>
                {timeLabel(item.createdAt)} {item.read ? '· прочитано' : '· нове'}
              </Text>
              {rendered.relatedRequestId ? (
                <Text
                  style={styles.link}
                  testID={`notification-link-${item.id}`}
                >
                  Переглянути запит →
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty} testID="notifications-empty">
            Сповіщень немає.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 13,
    color: '#666',
  },
  listContent: { padding: 16, paddingTop: 0 },
  row: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  unread: { borderLeftColor: '#1f6feb', borderLeftWidth: 4 },
  title: { fontSize: 14, fontWeight: '600', color: '#111' },
  message: { fontSize: 13, color: '#444', marginTop: 4 },
  meta: { fontSize: 11, color: '#888', marginTop: 6 },
  link: { fontSize: 12, color: '#1f6feb', marginTop: 4 },
  empty: { textAlign: 'center', color: '#888', marginTop: 32 },
});
