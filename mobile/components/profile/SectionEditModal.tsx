import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Checkbox } from '../ui/Checkbox';
import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';

export type SectionFieldType = 'text' | 'url' | 'email' | 'phone' | 'textarea' | 'checkbox';

export type SectionFieldDef = {
  key: string;
  label: string;
  type: SectionFieldType;
  placeholder?: string;
  required?: boolean;
  checkboxLabel?: string;
  helpText?: string;
};

export type SectionEditValues = Record<string, string | boolean | null | undefined>;

type Props = {
  visible: boolean;
  title: string;
  description?: string;
  fields: SectionFieldDef[];
  initialValues: SectionEditValues;
  onClose: () => void;
  onSubmit: (values: SectionEditValues) => Promise<void>;
};

function validateEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function validateUrl(v: string) {
  try {
    const u = new URL(v.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function SectionEditModal({ visible, title, description, fields, initialValues, onClose, onSubmit }: Props) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [values, setValues] = useState<SectionEditValues>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setValues(initialValues || {});
    setSaving(false);
    setError(null);
  }, [visible, initialValues]);

  const validationError = useMemo(() => {
    for (const f of fields) {
      const v = values[f.key];

      if (f.type === 'checkbox') {
        const checked = v === true;
        if (f.required && !checked) return `${f.label} is required.`;
        continue;
      }

      const str = typeof v === 'string' ? v.trim() : '';
      if (f.required && !str) return `${f.label} is required.`;
      if (!str) continue;

      if (f.type === 'email' && !validateEmail(str)) return 'Please enter a valid email.';
      if (f.type === 'url' && !validateUrl(str)) return 'Please enter a valid URL (https://...).';
      if (f.type === 'phone' && str.length < 7) return 'Please enter a valid phone number.';
    }
    return null;
  }, [fields, values]);

  const handleSubmit = async () => {
    setError(null);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      await onSubmit(values);
      onClose();
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'Failed to save. Please try again.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} onRequestClose={onClose}>
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        {!!description && <Text style={styles.description}>{description}</Text>}

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {fields.map((f) => {
            const v = values[f.key];

            if (f.type === 'checkbox') {
              return (
                <View key={f.key} style={styles.fieldBlock}>
                  <Text style={styles.label}>{f.label}{f.required ? ' *' : ''}</Text>
                  <Checkbox
                    value={v === true}
                    onValueChange={(next) => setValues((prev) => ({ ...prev, [f.key]: next }))}
                    label={f.checkboxLabel || 'I confirm'}
                    disabled={saving}
                  />
                  {!!f.helpText && <Text style={styles.help}>{f.helpText}</Text>}
                </View>
              );
            }

            const str = typeof v === 'string' ? v : '';
            const keyboardType =
              f.type === 'email'
                ? 'email-address'
                : f.type === 'phone'
                  ? 'phone-pad'
                  : f.type === 'url'
                    ? 'url'
                    : 'default';

            const multiline = f.type === 'textarea';
            return (
              <View key={f.key} style={styles.fieldBlock}>
                <Text style={styles.label}>{f.label}{f.required ? ' *' : ''}</Text>
                <Input
                  value={str}
                  onChangeText={(t) => setValues((prev) => ({ ...prev, [f.key]: t }))}
                  placeholder={f.placeholder}
                  keyboardType={keyboardType as any}
                  autoCapitalize={f.type === 'email' || f.type === 'url' ? 'none' : 'sentences'}
                  multiline={multiline}
                  style={multiline ? styles.textarea : undefined}
                  editable={!saving}
                />
                {!!f.helpText && <Text style={styles.help}>{f.helpText}</Text>}
              </View>
            );
          })}

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.actionsRow}>
          <Button title="Cancel" variant="secondary" onPress={onClose} disabled={saving} style={styles.actionButton} />
          <Button title={saving ? 'Saving…' : 'Save'} onPress={handleSubmit} disabled={saving} loading={saving} style={styles.actionButton} />
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    container: {
      gap: 10,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: '900',
    },
    description: {
      color: theme.colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
    scroll: {
      maxHeight: 520,
    },
    scrollContent: {
      paddingVertical: 6,
      gap: 10,
    },
    fieldBlock: {
      gap: 6,
    },
    label: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '800',
    },
    help: {
      color: theme.colors.textMuted,
      fontSize: 11,
      lineHeight: 16,
    },
    textarea: {
      height: 110,
      paddingTop: 12,
      textAlignVertical: 'top',
    } as any,
    errorBox: {
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.35)',
      backgroundColor: theme.mode === 'light' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.12)',
      borderRadius: 14,
      padding: 12,
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: 12,
      fontWeight: '700',
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 6,
    },
    actionButton: {
      flex: 1,
    },
  });
}


