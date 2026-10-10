// LocationPickerScreen — structured picker (no map dependency in this
// sprint). City is fixed to "Київ" (Kyiv districts are the only seeded
// catalog). The user picks a district, optionally types an
// address/orientir, then confirms — at which point a LocationDraft is
// written into LocationDraftStore for CreateRequestScreen to consume.
//
// "Використати поточну локацію" is a deliberate course-scope fallback:
// because expo-location is not installed in this sprint, the button
// resolves to the centroid of the chosen district plus the orientir.
// This keeps the same nearby/distance math working without forcing a
// real-GPS dependency on the AVD.

import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../app/navigation/types';
import {
  DEFAULT_CITY,
  KYIV_DISTRICTS,
  KyivDistrict,
  defaultDistrict,
  findDistrictById,
} from '../domain/location/HumanLocation';
import { LocationDraftStore } from '../domain/location/LocationDraftStore';

type Props = NativeStackScreenProps<RootStackParamList, 'LocationPicker'>;

export function LocationPickerScreen({ navigation, route }: Props) {
  const initial =
    findDistrictById(route.params?.initialDistrictId) ?? defaultDistrict();
  const [district, setDistrict] = useState<KyivDistrict>(initial);
  const [address, setAddress] = useState<string>('');
  const [usingCurrent, setUsingCurrent] = useState<boolean>(false);

  const handleUseCurrent = () => {
    // No expo-location in this sprint → district centroid is the
    // honest fallback. We mark the UI state so the user knows.
    setUsingCurrent(true);
  };

  const handleConfirm = () => {
    const trimmedAddress = address.trim();
    LocationDraftStore.set({
      city: DEFAULT_CITY,
      district: district.name,
      address: trimmedAddress,
      locationTitle: trimmedAddress
        ? `${DEFAULT_CITY}, ${district.name} — ${trimmedAddress}`
        : `${DEFAULT_CITY}, ${district.name}`,
      coordinates: district.centroid,
    });
    if (navigation.canGoBack()) navigation.goBack();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="location-picker-screen"
    >
      <Text style={styles.section}>Місто</Text>
      <View style={styles.cityRow} testID="location-picker-city">
        <Text style={styles.cityValue}>{DEFAULT_CITY}</Text>
        <Text style={styles.cityNote}>(зараз доступний лише Київ)</Text>
      </View>

      <Text style={styles.section}>Район</Text>
      <View style={styles.districts}>
        {KYIV_DISTRICTS.map((d) => {
          const selected = d.id === district.id;
          return (
            <TouchableOpacity
              key={d.id}
              style={[styles.districtChip, selected && styles.districtChipSelected]}
              onPress={() => setDistrict(d)}
              testID={`location-picker-district-${d.id}`}
            >
              <Text
                style={[
                  styles.districtText,
                  selected && styles.districtTextSelected,
                ]}
              >
                {d.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.hint}>
        Орієнтир району: <Text style={styles.hintBold}>{district.orientir}</Text>
      </Text>

      <Text style={styles.section}>Адреса або орієнтир (за бажанням)</Text>
      <TextInput
        style={styles.input}
        value={address}
        onChangeText={setAddress}
        placeholder="наприклад, вул. Хрещатик, 1 або біля ТРЦ"
        testID="location-picker-address"
      />

      <TouchableOpacity
        style={styles.useCurrentButton}
        onPress={handleUseCurrent}
        testID="location-picker-use-current"
      >
        <Text style={styles.useCurrentText}>
          📍 Використати поточну локацію
        </Text>
      </TouchableOpacity>
      {usingCurrent ? (
        <Text style={styles.useCurrentNote} testID="location-picker-fallback-note">
          Поки що використано центр району {district.name}. Точна
          GPS-локація з’явиться після підключення expo-location у
          наступному релізі.
        </Text>
      ) : null}

      <TouchableOpacity
        style={styles.confirmButton}
        onPress={handleConfirm}
        testID="location-picker-confirm"
      >
        <Text style={styles.confirmText}>Підтвердити локацію</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => navigation.canGoBack() && navigation.goBack()}
        testID="location-picker-cancel"
      >
        <Text style={styles.cancelText}>Скасувати</Text>
      </TouchableOpacity>
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
    marginBottom: 6,
  },
  cityRow: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cityValue: { fontSize: 16, fontWeight: '600', color: '#111' },
  cityNote: { fontSize: 11, color: '#888' },
  districts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  districtChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderColor: '#ddd',
    borderWidth: 1,
    backgroundColor: '#fff',
  },
  districtChipSelected: { backgroundColor: '#1f6feb', borderColor: '#1f6feb' },
  districtText: { color: '#444', fontSize: 13 },
  districtTextSelected: { color: '#fff', fontWeight: '600' },
  hint: { fontSize: 12, color: '#666', marginTop: 8 },
  hintBold: { fontWeight: '600', color: '#111' },
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
  useCurrentButton: {
    marginTop: 18,
    borderColor: '#1f6feb',
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  useCurrentText: { color: '#1f6feb', fontSize: 14 },
  useCurrentNote: { fontSize: 11, color: '#666', marginTop: 6 },
  confirmButton: {
    marginTop: 24,
    backgroundColor: '#1f6feb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelButton: { marginTop: 8, alignItems: 'center', paddingVertical: 10 },
  cancelText: { color: '#666', fontSize: 13 },
});
