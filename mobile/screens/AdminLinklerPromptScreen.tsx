import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFetchAuthed } from '../hooks/useFetchAuthed';
import { Button, PageShell } from '../components/ui';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminLinklerPrompt'>;

type PromptRecord = {
  key: string;
  content: string;
  updatedAt: string | null;
  updatedBy: string | null;
};

type ApiResponse = {
  ok: boolean;
  prompt?: PromptRecord;
  error?: string;
};

export function AdminLinklerPromptScreen({ navigation }: Props) {
  const { fetchAuthed } = useFetchAuthed();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [serverPrompt, setServerPrompt] = useState<PromptRecord | null>(null);

  const isDirty = useMemo(() => serverPrompt?.content !== prompt, [serverPrompt, prompt]);

  const loadPrompt = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAuthed('/api/admin/system-prompts/linkler', { method: 'GET' });
      if (!res.ok) {
        throw new Error(res.message || `Failed to load prompt (${res.status})`);
      }
      const payload = (res.data || {}) as ApiResponse;
      if (!payload.ok || !payload.prompt) {
        throw new Error(payload.error || 'Prompt unavailable');
      }
      setServerPrompt(payload.prompt);
      setPrompt(payload.prompt.content);
    } catch (err: any) {
      setError(err?.message || 'Failed to load prompt');
    } finally {
      setLoading(false);
    }
  }, [fetchAuthed]);

  useEffect(() => {
    void loadPrompt();
  }, [loadPrompt]);

  const handleSave = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Prompt cannot be empty');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetchAuthed('/api/admin/system-prompts/linkler', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: prompt }),
      });
      if (!res.ok) {
        throw new Error(res.message || `Failed to save prompt (${res.status})`);
      }
      const payload = (res.data || {}) as ApiResponse;
      if (!payload.ok || !payload.prompt) {
        throw new Error(payload.error || 'Prompt not saved');
      }
      setServerPrompt(payload.prompt);
      setPrompt(payload.prompt.content);
    } catch (err: any) {
      setError(err?.message || 'Failed to save prompt');
    } finally {
      setSaving(false);
    }
  }, [fetchAuthed, prompt]);

  return (
    <PageShell
      title="Linkler Prompt"
      subtitle="Live instructions for Linkler apply instantly when edited here."
      left={<Button title="Back" variant="secondary" onPress={() => navigation.goBack()} style={styles.headerButton} />}
      contentStyle={styles.container}
    >
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#5E9BFF" />
          <Text style={styles.mutedText}>Loading prompt…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Retry" onPress={() => void loadPrompt()} />
        </View>
      ) : !serverPrompt ? (
        <View style={styles.center}>
          <Text style={styles.mutedText}>Prompt not available.</Text>
          <Button title="Refresh" onPress={() => void loadPrompt()} variant="secondary" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Key</Text>
            <Text style={styles.metaValue}>{serverPrompt.key}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Last updated</Text>
            <Text style={styles.metaValue}>
              {serverPrompt.updatedAt ? new Date(serverPrompt.updatedAt).toLocaleString() : 'Unknown'}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Updated by</Text>
            <Text style={styles.metaValue}>{serverPrompt.updatedBy ?? 'Unknown'}</Text>
          </View>

          <TextInput
            multiline
            textAlignVertical="top"
            style={styles.textarea}
            value={prompt}
            onChangeText={setPrompt}
            placeholder="Enter Linkler system instructions..."
            autoCorrect={false}
            autoCapitalize="sentences"
          />

          <Text style={styles.helperText}>
            Changes save instantly and apply to all new Linkler replies—confirm wording before saving.
          </Text>

          <View style={styles.buttonRow}>
            <Button
              title={saving ? 'Saving…' : 'Save Prompt'}
              onPress={() => void handleSave()}
              disabled={!isDirty || saving}
              style={styles.primaryButton}
            />
            <Button
              title="Reset"
              variant="secondary"
              onPress={() => setPrompt(serverPrompt.content)}
              disabled={!isDirty || saving}
            />
            <Button title="Reload" variant="ghost" onPress={() => void loadPrompt()} disabled={saving} />
          </View>
        </ScrollView>
      )}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    height: 36,
    paddingHorizontal: 12,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  mutedText: {
    color: '#9AA0A6',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#f87171',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
  },
  scroll: {
    gap: 16,
    paddingBottom: 48,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    color: '#9AA0A6',
    fontSize: 12,
    fontWeight: '600',
  },
  metaValue: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  textarea: {
    minHeight: 320,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 16,
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    backgroundColor: 'rgba(15,23,42,0.65)',
  },
  helperText: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  primaryButton: {
    minWidth: 140,
  },
});
