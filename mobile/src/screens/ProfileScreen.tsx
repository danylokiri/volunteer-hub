import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CommonActions, CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  MainTabsParamList,
  RootStackParamList,
} from '../app/navigation/types';
import { useAuth } from '../app/providers/AuthProvider';
import { useUserProfile } from '../app/providers/RepositoryProvider';
import { useServerStatus } from '../app/providers/ServerStatusProvider';
import { hasRole } from '../domain/models/UserProfile';
import { DevModeStorage } from '../security/DevModeStorage';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabsParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;

const ROLE_LABEL: Record<string, string> = {
  requester: 'Замовник',
  volunteer: 'Волонтер',
  admin: 'Адміністратор',
};

const TAP_WINDOW_MS = 5000;
const TAPS_TO_UNLOCK = 7;

export function ProfileScreen({ navigation }: Props) {
  const { currentUserId, logout } = useAuth();
  const profile = useUserProfile(currentUserId);
  const serverStatus = useServerStatus();
  const [devModeEnabled, setDevModeEnabled] = useState(false);
  const [devToast, setDevToast] = useState<string | null>(null);
  const tapsRef = useRef<number[]>([]);

  // Hydrate dev-mode flag once on mount; reset when the active user
  // changes (logging in as someone new closes the back door).
  useEffect(() => {
    let alive = true;
    DevModeStorage.isEnabled().then((v) => {
      if (alive) setDevModeEnabled(v);
    });
    return () => {
      alive = false;
    };
  }, [currentUserId]);

  const handleLogout = async () => {
    await logout();
    await DevModeStorage.disable();
    setDevModeEnabled(false);
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }),
    );
  };

  const recordTap = useCallback(async () => {
    const now = Date.now();
    const recent = tapsRef.current.filter((t) => now - t < TAP_WINDOW_MS);
    recent.push(now);
    tapsRef.current = recent.slice(-TAPS_TO_UNLOCK);
    if (recent.length >= TAPS_TO_UNLOCK && !devModeEnabled) {
      tapsRef.current = [];
      await DevModeStorage.enable();
      setDevModeEnabled(true);
      setDevToast('Режим розробника увімкнено');
      setTimeout(() => setDevToast(null), 3000);
    }
  }, [devModeEnabled]);

  const disableDevMode = async () => {
    await DevModeStorage.disable();
    setDevModeEnabled(false);
    setDevToast('Режим розробника вимкнено');
    setTimeout(() => setDevToast(null), 2000);
  };

  const isAdmin = hasRole(profile, 'admin');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="profile-screen"
    >
      {profile ? (
        <>
          <Pressable
            onPress={recordTap}
            testID="profile-name-press"
            style={styles.namePress}
          >
            <Text style={styles.name} testID="profile-full-name">
              {profile.fullName}
            </Text>
            <Text style={styles.userId}>id: {profile.id}</Text>
            {profile.email ? (
              <Text style={styles.email}>{profile.email}</Text>
            ) : null}
          </Pressable>

          <View style={styles.rolesRow} testID="profile-roles">
            {profile.roles.map((r) => (
              <View key={r} style={styles.roleChip}>
                <Text style={styles.roleChipText}>{ROLE_LABEL[r] ?? r}</Text>
              </View>
            ))}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue} testID="profile-rating">
                {profile.rating.toFixed(1)}
              </Text>
              <Text style={styles.statLabel}>Рейтинг</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue} testID="profile-completed">
                {profile.completedRequests}
              </Text>
              <Text style={styles.statLabel}>Виконано</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {profile.isVerified ? '✓' : '—'}
              </Text>
              <Text style={styles.statLabel}>Верифіковано</Text>
            </View>
          </View>

          <Text style={styles.meta}>
            Зареєстровано: {profile.createdAt}
          </Text>
        </>
      ) : (
        <Text testID="profile-no-user">Не авторизовано</Text>
      )}

      <TouchableOpacity
        style={styles.linkRow}
        onPress={() => navigation.navigate('SecuritySettings')}
        testID="profile-security-link"
      >
        <Text style={styles.linkText}>🔒 Безпека та біометрія</Text>
      </TouchableOpacity>

      {isAdmin ? (
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigation.navigate('AdminPanel')}
          testID="profile-admin-link"
        >
          <Text style={styles.linkText}>🛡 Адмін-панель</Text>
        </TouchableOpacity>
      ) : null}

      {devModeEnabled ? (
        <View style={styles.devSection} testID="profile-dev-section">
          <Text style={styles.devHeader}>Режим розробника</Text>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate('DebugDeepLink')}
            testID="profile-debug-link"
          >
            <Text style={styles.linkText}>🛠 Debug deep link</Text>
          </TouchableOpacity>
          <View style={styles.serverCard} testID="profile-server-card">
            <Text style={styles.devKv}>
              Сервер: {serverStatus.online ? '🟢 онлайн' : '🔴 офлайн'}
              {serverStatus.online && serverStatus.latencyMs > 0
                ? ` · ${serverStatus.latencyMs} мс`
                : ''}
            </Text>
            <Text style={styles.devKv} testID="profile-dev-base-url">
              API: {serverStatus.baseUrl}
            </Text>
            <Text style={styles.devKv}>
              Останній sync: {serverStatus.lastSyncAt ?? '—'}
            </Text>
            <Text style={styles.devKv}>
              Останній realtime: {serverStatus.lastSocketEventAt ?? '—'}
            </Text>
            <Text style={styles.devKv}>id: {currentUserId ?? 'null'}</Text>
          </View>
          <TouchableOpacity
            style={styles.devOff}
            onPress={disableDevMode}
            testID="profile-dev-disable"
          >
            <Text style={styles.devOffText}>Вимкнути режим розробника</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {devToast ? (
        <Text style={styles.toast} testID="profile-dev-toast">
          {devToast}
        </Text>
      ) : null}

      <TouchableOpacity
        style={[styles.linkRow, styles.logoutRow]}
        onPress={handleLogout}
        testID="profile-logout"
      >
        <Text style={styles.logoutText}>Вийти</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  content: { padding: 16 },
  namePress: { paddingVertical: 4 },
  name: { fontSize: 24, fontWeight: '700', color: '#111' },
  userId: { fontSize: 12, color: '#888', marginTop: 4 },
  email: { fontSize: 12, color: '#888', marginTop: 2 },
  rolesRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  roleChip: {
    backgroundColor: '#eaf2ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  roleChipText: { color: '#1f6feb', fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', marginTop: 24, gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '700', color: '#1f6feb' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  meta: { fontSize: 12, color: '#888', marginTop: 18 },
  linkRow: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
  },
  linkText: { fontSize: 15, color: '#1f6feb' },
  logoutRow: { backgroundColor: '#fff5f5', marginTop: 24 },
  logoutText: { fontSize: 15, color: '#a00' },
  devSection: {
    marginTop: 16,
    backgroundColor: '#fffbe6',
    padding: 12,
    borderRadius: 10,
  },
  devHeader: {
    fontSize: 12,
    color: '#7a5c00',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  devKv: { fontSize: 11, color: '#555', marginTop: 2 },
  serverCard: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  devOff: { marginTop: 10, alignItems: 'center', paddingVertical: 6 },
  devOffText: { color: '#7a5c00', fontSize: 13, fontWeight: '600' },
  toast: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#1f6feb',
    color: '#fff',
    textAlign: 'center',
    borderRadius: 8,
  },
});
