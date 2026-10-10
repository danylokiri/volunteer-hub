import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useBiometric } from '../app/providers/BiometricProvider';
import {
  DEFAULT_LOCK_TIMEOUT_SECONDS,
  SecuritySettingsStorage,
} from '../security/SecuritySettingsStorage';

const SENSOR_LABEL: Record<string, string> = {
  faceId: 'Face ID',
  touchId: 'Touch ID',
  fingerprint: 'Відбиток пальця',
  none: 'Не виявлено',
};

const TIMEOUT_OPTIONS: { seconds: number; label: string }[] = [
  { seconds: 30, label: '30 секунд' },
  { seconds: 60, label: '1 хвилина' },
  { seconds: 120, label: '2 хвилини' },
  { seconds: 300, label: '5 хвилин' },
];

export function SecuritySettingsScreen() {
  const { availability, enabled, setEnabledByUser } = useBiometric();
  const [lockTimeout, setLockTimeout] = useState<number>(
    DEFAULT_LOCK_TIMEOUT_SECONDS,
  );

  useEffect(() => {
    void SecuritySettingsStorage.getLockTimeoutSeconds().then(setLockTimeout);
  }, []);

  const onToggle = async (value: boolean) => {
    await setEnabledByUser(value);
  };

  const onSelectTimeout = async (sec: number) => {
    setLockTimeout(sec);
    await SecuritySettingsStorage.setLockTimeoutSeconds(sec);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="security-settings-screen"
    >
      <Text style={styles.section}>Біометрія</Text>

      <View style={styles.row}>
        <View style={styles.labelBox}>
          <Text style={styles.label}>Увімкнути вхід через біометрію</Text>
          <Text style={styles.helper}>
            Дозволяє входити в застосунок без пароля та підтверджувати
            критичні дії пальцем або обличчям.
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          disabled={!availability.available}
          testID="security-settings-biometric-toggle"
        />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Тип датчика</Text>
        <Text style={styles.value} testID="security-settings-sensor-type">
          {SENSOR_LABEL[availability.type] ?? availability.type}
        </Text>
      </View>

      {!availability.available ? (
        <View
          style={styles.unavailableBox}
          testID="security-settings-unavailable-callout"
        >
          <Text style={styles.unavailableTitle}>
            Біометрія недоступна на цьому пристрої
          </Text>
          <Text style={styles.unavailableBody}>
            Для перевірки використайте пристрій або емулятор з підтримкою
            відбитка пальця. На Android-емуляторі: відкрийте Android
            Studio → Device Manager → Pixel_6 → Settings → Security →
            Fingerprint Unlock, додайте відбиток і поверніться сюди.
          </Text>
        </View>
      ) : null}

      <Text style={styles.section}>Автоблокування застосунку</Text>
      <Text
        style={styles.sectionDescription}
        testID="security-settings-autoblock-description"
      >
        Якщо застосунок був у фоні довше обраного часу, після повернення
        потрібно підтвердити особу через біометрію.
      </Text>

      <View style={styles.row}>
        <Text style={styles.label}>Поточний таймаут</Text>
        <Text style={styles.value} testID="security-settings-lock-timeout">
          {TIMEOUT_OPTIONS.find((o) => o.seconds === lockTimeout)?.label ??
            `${lockTimeout} с`}
        </Text>
      </View>

      <View style={styles.timeoutButtons}>
        {TIMEOUT_OPTIONS.map(({ seconds, label }) => (
          <TouchableOpacity
            key={seconds}
            style={[
              styles.timeoutButton,
              seconds === lockTimeout && styles.timeoutButtonActive,
            ]}
            onPress={() => onSelectTimeout(seconds)}
            testID={`security-settings-timeout-${seconds}`}
          >
            <Text
              style={[
                styles.timeoutButtonText,
                seconds === lockTimeout && styles.timeoutButtonTextActive,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!availability.available ? (
        <Text style={styles.timeoutDisabledNote}>
          Поки біометрія недоступна, автоблокування не може спрацювати —
          таймаут лишається лише як збережене налаштування.
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  content: { padding: 16, paddingBottom: 48 },
  section: {
    fontSize: 13,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 18,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#444',
    marginBottom: 12,
    lineHeight: 18,
  },
  row: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  labelBox: { flex: 1, paddingRight: 12 },
  label: { fontSize: 14, color: '#111' },
  helper: { fontSize: 11, color: '#666', marginTop: 4 },
  value: { fontSize: 14, color: '#1f6feb' },
  unavailableBox: {
    backgroundColor: '#fff5e6',
    borderColor: '#a16207',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginTop: 4,
    marginBottom: 12,
  },
  unavailableTitle: { color: '#7a4a07', fontWeight: '600', fontSize: 14 },
  unavailableBody: { color: '#7a4a07', fontSize: 13, marginTop: 6 },
  code: { fontFamily: 'Menlo', fontSize: 12 },
  timeoutButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  timeoutButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderColor: '#ddd',
    borderWidth: 1,
  },
  timeoutButtonActive: { backgroundColor: '#1f6feb', borderColor: '#1f6feb' },
  timeoutButtonDisabled: { opacity: 0.5 },
  timeoutButtonText: { color: '#444', fontSize: 13 },
  timeoutButtonTextActive: { color: '#fff', fontWeight: '600' },
  timeoutDisabledNote: { fontSize: 12, color: '#666', marginTop: 8 },
});
