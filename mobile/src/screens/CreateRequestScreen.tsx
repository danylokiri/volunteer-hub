import React, { useEffect, useState } from 'react';
import {
  Alert,
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
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  MainTabsParamList,
  RootStackParamList,
} from '../app/navigation/types';
import { HELP_CATEGORIES, HelpCategory } from '../domain/enums';
import { useRequests } from '../app/providers/RepositoryProvider';
import { useAuth } from '../app/providers/AuthProvider';
import { DEMO_USER_ID } from '../domain/seed/mockData';
import {
  LocationDraft,
  LocationDraftStore,
} from '../domain/location/LocationDraftStore';
import { defaultDistrict } from '../domain/location/HumanLocation';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabsParamList, 'Create'>,
  NativeStackScreenProps<RootStackParamList>
>;

const CATEGORY_LABELS: Record<HelpCategory, string> = {
  pets: 'Тварини',
  shopping: 'Покупки',
  transport: 'Транспорт',
  medical: 'Медицина',
  tutoring: 'Навчання',
  other: 'Інше',
};

export function CreateRequestScreen({ navigation }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<HelpCategory>('other');
  const [location, setLocation] = useState<LocationDraft | null>(null);
  const [slotsMode, setSlotsMode] = useState<'limited' | 'unlimited'>(
    'unlimited',
  );
  const [slotsCount, setSlotsCount] = useState<string>('1');
  const [submitting, setSubmitting] = useState(false);

  const { create } = useRequests();
  const { currentUserId } = useAuth();

  // Subscribe to the screen-focused event via the navigation prop. This
  // works whether or not the screen is inside a NavigationContainer
  // (production yes, jest renders no — and `addListener` is a no-op
  // there because the prop is mocked).
  useEffect(() => {
    const unsub =
      typeof navigation?.addListener === 'function'
        ? navigation.addListener('focus', () => {
            const picked = LocationDraftStore.consume();
            if (picked) setLocation(picked);
          })
        : undefined;
    return () => {
      if (unsub) unsub();
    };
  }, [navigation]);

  // Mount-time fallback for tests / first render that don't open the
  // picker — pre-populate with the default district so the form is
  // submittable without clicking through navigation.
  useEffect(() => {
    if (!location) {
      const d = defaultDistrict();
      setLocation({
        city: 'Київ',
        district: d.name,
        address: '',
        locationTitle: `Київ, ${d.name}`,
        coordinates: d.centroid,
      });
    }
  }, [location]);

  const handlePickLocation = () => {
    navigation.navigate('LocationPicker', undefined);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Помилка', 'Заповніть заголовок та опис.');
      return;
    }
    if (!location) {
      Alert.alert('Помилка', 'Оберіть локацію.');
      return;
    }
    if (slotsMode === 'limited') {
      const n = Number(slotsCount);
      if (!Number.isFinite(n) || n < 1) {
        Alert.alert('Помилка', 'Кількість волонтерів має бути ≥ 1.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const created = await create({
        title: title.trim(),
        description: description.trim(),
        category,
        latitude: location.coordinates.latitude,
        longitude: location.coordinates.longitude,
        city: location.city,
        district: location.district,
        address: location.address || undefined,
        locationTitle: location.locationTitle,
        createdByUserId: currentUserId ?? DEMO_USER_ID,
        volunteerSlotsMode: slotsMode,
        volunteerSlots:
          slotsMode === 'limited' ? Math.floor(Number(slotsCount)) : undefined,
      });
      setTitle('');
      setDescription('');
      setCategory('other');
      setSlotsMode('unlimited');
      setSlotsCount('1');
      LocationDraftStore.reset();
      Alert.alert('Готово', `Створено запит «${created.title}».`);
      navigation.navigate('Requests');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        testID="create-request-screen"
      >
        <Text style={styles.label}>Заголовок</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Напр. Вигуляти собаку"
          editable={!submitting}
          testID="create-request-title"
        />

        <Text style={styles.label}>Опис</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="Що саме потрібно зробити?"
          multiline
          numberOfLines={4}
          editable={!submitting}
          testID="create-request-description"
        />

        <Text style={styles.label}>Категорія</Text>
        <View style={styles.chips}>
          {HELP_CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, c === category && styles.chipSelected]}
              onPress={() => setCategory(c)}
              testID={`create-request-category-${c}`}
              disabled={submitting}
            >
              <Text
                style={[
                  styles.chipText,
                  c === category && styles.chipTextSelected,
                ]}
              >
                {CATEGORY_LABELS[c]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Локація</Text>
        {location ? (
          <View style={styles.locationCard} testID="create-request-location-card">
            <Text style={styles.locationPrimary}>
              📍 {location.city} · {location.district}
            </Text>
            <Text style={styles.locationSecondary}>
              {location.address ||
                'Адреса не вказана — використається орієнтир району.'}
            </Text>
          </View>
        ) : (
          <Text style={styles.hint}>Локацію ще не обрано.</Text>
        )}
        <TouchableOpacity
          style={styles.pickLocationButton}
          onPress={handlePickLocation}
          disabled={submitting}
          testID="create-request-pick-location"
        >
          <Text style={styles.pickLocationText}>
            {location ? 'Змінити локацію' : 'Обрати локацію'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>Кількість волонтерів</Text>
        <View style={styles.slotsModeRow}>
          <TouchableOpacity
            style={[
              styles.slotsModeChip,
              slotsMode === 'unlimited' && styles.slotsModeChipSelected,
            ]}
            onPress={() => setSlotsMode('unlimited')}
            disabled={submitting}
            testID="create-request-slots-mode-unlimited"
          >
            <Text
              style={[
                styles.slotsModeText,
                slotsMode === 'unlimited' && styles.slotsModeTextSelected,
              ]}
            >
              Необмежено
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.slotsModeChip,
              slotsMode === 'limited' && styles.slotsModeChipSelected,
            ]}
            onPress={() => setSlotsMode('limited')}
            disabled={submitting}
            testID="create-request-slots-mode-limited"
          >
            <Text
              style={[
                styles.slotsModeText,
                slotsMode === 'limited' && styles.slotsModeTextSelected,
              ]}
            >
              Обмежено
            </Text>
          </TouchableOpacity>
        </View>
        {slotsMode === 'limited' ? (
          <View style={styles.slotsCountRow}>
            <Text style={styles.slotsCountLabel}>Скільки волонтерів?</Text>
            <TextInput
              style={[styles.input, styles.slotsCountInput]}
              value={slotsCount}
              onChangeText={setSlotsCount}
              keyboardType="numeric"
              editable={!submitting}
              testID="create-request-slots-count"
            />
          </View>
        ) : null}
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>
            {slotsMode === 'unlimited'
              ? 'Реєстрація лишатиметься відкритою, доки ви не закриєте її вручну.'
              : 'Коли всі місця заповняться, реєстрація закриється автоматично, а інші відгуки буде відхилено з причиною capacity_filled.'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submit, submitting && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          testID="create-request-submit"
        >
          <Text style={styles.submitText}>
            {submitting ? 'Створення…' : 'Створити запит'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Suppress lint complaint about unused Switch import (kept for future
// "use my saved location" toggle).
void Switch;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  content: { padding: 16, paddingBottom: 48 },
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderColor: '#ddd',
    borderWidth: 1,
    backgroundColor: '#fff',
  },
  chipSelected: { backgroundColor: '#1f6feb', borderColor: '#1f6feb' },
  chipText: { color: '#444', fontSize: 13 },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  locationCard: {
    backgroundColor: '#f3f7ff',
    padding: 12,
    borderRadius: 8,
  },
  locationPrimary: { fontSize: 15, color: '#111', fontWeight: '600' },
  locationSecondary: { fontSize: 13, color: '#444', marginTop: 4 },
  hint: { fontSize: 12, color: '#888', marginTop: 4 },
  pickLocationButton: {
    marginTop: 8,
    borderColor: '#1f6feb',
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  pickLocationText: { color: '#1f6feb', fontSize: 14 },
  slotsModeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  slotsModeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderColor: '#ddd',
    borderWidth: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  slotsModeChipSelected: { backgroundColor: '#1f6feb', borderColor: '#1f6feb' },
  slotsModeText: { color: '#444', fontSize: 14 },
  slotsModeTextSelected: { color: '#fff', fontWeight: '600' },
  slotsCountRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
  slotsCountLabel: { fontSize: 13, color: '#444', flex: 1 },
  slotsCountInput: { width: 80, textAlign: 'center' },
  disclaimerBox: { marginTop: 8 },
  disclaimerText: { fontSize: 12, color: '#666' },
  submit: {
    backgroundColor: '#1f6feb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  submitDisabled: { backgroundColor: '#a8c2eb' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
