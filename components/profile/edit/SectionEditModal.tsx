'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';

export type SectionFieldType = 'text' | 'url' | 'email' | 'phone' | 'textarea' | 'checkbox';

export type SectionFieldDef = {
  key: string;
  label: string;
  type: SectionFieldType;
  placeholder?: string;
  required?: boolean;
  /** Only applies to checkbox fields */
  checkboxLabel?: string;
  helpText?: string;
};

export type SectionEditValues = Record<string, string | boolean | null | undefined>;

function isTruthyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function validateEmail(v: string) {
  // Minimal sanity check (not RFC perfect).
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

export type SectionEditModalProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  fields: SectionFieldDef[];
  initialValues: SectionEditValues;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (values: SectionEditValues) => Promise<void>;
};

export default function SectionEditModal({
  isOpen,
  title,
  description,
  fields,
  initialValues,
  submitLabel = 'Save',
  onClose,
  onSubmit,
}: SectionEditModalProps) {
  const [values, setValues] = useState<SectionEditValues>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setValues(initialValues || {});
    setSaving(false);
    setError(null);
  }, [isOpen, initialValues]);

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
      const msg = isTruthyString(e?.message) ? e.message : 'Failed to save. Please try again.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size="lg"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-60"
            disabled={saving}
          >
            {saving ? 'Saving…' : submitLabel}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {fields.map((f) => {
          const v = values[f.key];

          if (f.type === 'checkbox') {
            const checked = v === true;
            return (
              <div key={f.key} className="space-y-1">
                <label className="text-sm font-semibold text-foreground">{f.label}</label>
                <label className="flex items-start gap-3 rounded-xl border border-border p-3 bg-muted/20">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.checked }))}
                  />
                  <span className="text-sm text-foreground">
                    {f.checkboxLabel || 'I confirm'}
                  </span>
                </label>
                {f.helpText && <p className="text-xs text-muted-foreground">{f.helpText}</p>}
              </div>
            );
          }

          const inputType =
            f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : f.type === 'url' ? 'url' : 'text';
          const str = typeof v === 'string' ? v : '';

          return (
            <div key={f.key} className="space-y-1">
              <label className="text-sm font-semibold text-foreground">
                {f.label}
                {f.required ? <span className="text-red-500"> *</span> : null}
              </label>
              {f.type === 'textarea' ? (
                <textarea
                  value={str}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  rows={5}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <input
                  type={inputType}
                  value={str}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
              {f.helpText && <p className="text-xs text-muted-foreground">{f.helpText}</p>}
            </div>
          );
        })}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/20 p-3">
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}


