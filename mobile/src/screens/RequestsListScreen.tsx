import React from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  MainTabsParamList,
  RootStackParamList,
} from '../app/navigation/types';
import { HelpRequest } from '../domain/models/HelpRequest';
import { useRequests } from '../app/providers/RepositoryProvider';
import { useServerStatus } from '../app/providers/ServerStatusProvider';
import {
  formatPrimaryLocation,
  formatSecondaryLocation,
  formatTechnicalCoords,
} from '../domain/location/formatLocation';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabsParamList, 'Requests'>,
  NativeStackScreenProps<RootStackParamList>
>;

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

const SYNC_LABELS: Record<string, { text: string; color: string }> = {
  synced: { text: '✓ Синхронізовано', color: '#16a34a' },
  pending: { text: '⏳ Очікує синхронізації', color: '#a16207' },
  error: { text: '⚠ Помилка синхронізації', color: '#a00' },
};

type Options = {
  showTechnicalCoords?: boolean;
};

export function RequestsListScreen({ navigation }: Props) {
  const { requests } = useRequests();
  const status = useServerStatus();

  // Tech coords are off by default (Phase 9 turns them on once dev mode
  // ships).
  const options: Options = { showTechnicalCoords: false };

  const renderItem = ({ item }: { item: HelpRequest }) => (
    <TouchableOpacity
      style={styles.card}
      testID={`request-row-${item.id}`}
      onPress={() =>
        navigation.navigate('RequestDetail', { id: item.id })
      }
    >
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.meta}>
        {CATEGORY_LABELS[item.category] ?? item.category}
        {' · '}
        {STATUS_LABELS[item.status] ?? item.status}
      </Text>
      <Text
        style={styles.locationPrimary}
        testID={`request-row-location-${item.id}`}
      >
        📍 {formatPrimaryLocation(item)}
      </Text>
      <Text
        style={styles.locationSecondary}
        testID={`request-row-address-${item.id}`}
      >
        {formatSecondaryLocation(item)}
      </Text>
      {item.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}
      <Text
        style={[styles.sync, { color: SYNC_LABELS[item.syncStatus]?.color ?? '#888' }]}
        testID={`request-row-sync-${item.id}`}
      >
        {SYNC_LABELS[item.syncStatus]?.text ?? item.syncStatus}
      </Text>
      {options.showTechnicalCoords ? (
        <Text
          style={styles.technical}
          testID={`request-row-coords-${item.id}`}
        >
          Технічні координати: {formatTechnicalCoords(item)}
        </Text>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container} testID="requests-list-screen">
      <View
        style={[
          styles.statusBanner,
          status.online ? styles.statusBannerOnline : styles.statusBannerOffline,
        ]}
        testID="requests-list-status-banner"
      >
        <Text style={styles.statusBannerText}>
          {status.online
            ? '🟢 Онлайн'
            : '🔴 Працюємо офлайн — нові заявки збережуться локально та синхронізуються пізніше.'}
        </Text>
      </View>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty} testID="requests-list-empty">
            Запитів поки немає.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  title: { fontSize: 16, fontWeight: '600', color: '#111' },
  meta: { fontSize: 12, color: '#1f6feb', marginTop: 4 },
  locationPrimary: { fontSize: 13, color: '#111', marginTop: 8 },
  locationSecondary: { fontSize: 12, color: '#555', marginTop: 2 },
  description: { fontSize: 13, color: '#444', marginTop: 6 },
  sync: { fontSize: 11, marginTop: 8, fontWeight: '600' },
  technical: { fontSize: 10, color: '#888', marginTop: 4 },
  empty: { textAlign: 'center', color: '#888', marginTop: 32 },
  statusBanner: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  statusBannerOnline: { backgroundColor: '#e6fbe9' },
  statusBannerOffline: { backgroundColor: '#fff5e6' },
  statusBannerText: { fontSize: 12, color: '#444' },
});
