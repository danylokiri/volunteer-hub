import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useMockDeepLinkRouter } from '../app/providers/DeepLinkProvider';

const EXAMPLE_URLS = [
  'volunteerhub://home',
  'volunteerhub://requests/req-1',
  'volunteerhub://catalog?filter=nearby',
  'volunteerhub://invite/ABC123',
  'volunteerhub://notifications',
  'https://volunteerhub.local/requests/req-2',
  'https://volunteerhub.local/invite/TOKEN42',
];

export function DebugDeepLinkScreen() {
  const [url, setUrl] = useState('');
  const router = useMockDeepLinkRouter();

  const handleOpen = () => {
    const result = router.feed(url);
    if (!result) {
      Alert.alert('Невідоме посилання', `URL не розпізнано: ${url}`);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="debug-deep-link-screen"
    >
      <Text style={styles.label}>URL</Text>
      <TextInput
        style={styles.input}
        value={url}
        onChangeText={setUrl}
        placeholder="volunteerhub://requests/req-1"
        autoCapitalize="none"
        autoCorrect={false}
        testID="debug-deep-link-input"
      />
      <TouchableOpacity
        style={styles.button}
        onPress={handleOpen}
        testID="debug-deep-link-open"
      >
        <Text style={styles.buttonText}>Відкрити</Text>
      </TouchableOpacity>

      <Text style={styles.section}>Приклади</Text>
      {EXAMPLE_URLS.map((u) => (
        <TouchableOpacity
          key={u}
          onPress={() => setUrl(u)}
          style={styles.example}
          testID={`debug-deep-link-example-${u}`}
        >
          <Text style={styles.exampleText}>{u}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  content: { padding: 16 },
  label: { fontSize: 13, color: '#444', marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111',
  },
  button: {
    backgroundColor: '#1f6feb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  section: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 8,
  },
  example: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    marginBottom: 6,
  },
  exampleText: { fontSize: 13, color: '#1f6feb' },
});
