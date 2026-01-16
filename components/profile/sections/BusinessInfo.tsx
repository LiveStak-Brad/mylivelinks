/**
 * Business Info Section (Business Profile Type)
 *
 * Displays business information from `profile_business` and provides an owner-only
 * Edit/Add modal via the universal SectionEditModal.
 *
 * Visitors never see dummy values; the section is hidden if empty.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Briefcase, Clock, Globe, Mail, MapPin, Phone } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { ProfileType } from '@/lib/profileTypeConfig';
import SectionEditModal from '@/components/profile/edit/SectionEditModal';

type BusinessRow = {
  profile_id: string;
  business_description: string | null;
  website_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  location_or_service_area: string | null;
  hours: any | null;
  updated_at: string;
};

interface BusinessInfoProps {
  profileId: string;
  profileType?: ProfileType;
  isOwner?: boolean;
  cardStyle?: React.CSSProperties;
  borderRadiusClass?: string;
  buttonColor?: string;
}

export default function BusinessInfo({
  profileId,
  profileType,
  isOwner = false,
  cardStyle,
  borderRadiusClass = 'rounded-2xl',
  buttonColor = '#DB2777',
}: BusinessInfoProps) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<BusinessRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_business', { p_profile_id: profileId });
        if (error) {
          console.error('[BusinessInfo] Failed to load business:', error);
          if (!cancelled) setBusiness(null);
          return;
        }
        if (!cancelled) setBusiness((data as any) ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId, supabase]);

  const hoursText = useMemo(() => {
    const h = business?.hours;
    if (!h) return '';
    if (typeof h === 'string') return h;
    if (typeof h === 'object' && typeof (h as any)?.text === 'string') return String((h as any).text);
    try {
      return JSON.stringify(h);
    } catch {
      return '';
    }
  }, [business?.hours]);

  const hasAnyBusinessInfo = useMemo(() => {
    const b = business;
    if (!b) return false;
    return Boolean(
      (b.business_description && b.business_description.trim()) ||
        (b.website_url && b.website_url.trim()) ||
        (b.contact_email && b.contact_email.trim()) ||
        (b.contact_phone && b.contact_phone.trim()) ||
        (b.location_or_service_area && b.location_or_service_area.trim()) ||
        (hoursText && hoursText.trim())
    );
  }, [business, hoursText]);

  const closeEdit = () => {
    if (saving) return;
    setEditOpen(false);
  };

  const saveBusiness = async (values: Record<string, any>) => {
    try {
      setSaving(true);
      const payload = {
        business_description: String(values.business_description ?? ''),
        website_url: String(values.website_url ?? ''),
        contact_email: String(values.contact_email ?? ''),
        contact_phone: String(values.contact_phone ?? ''),
        location_or_service_area: String(values.location_or_service_area ?? ''),
        hours: values.hours_text ? { text: String(values.hours_text) } : null,
      };

      const { data, error } = await supabase.rpc('upsert_business', { p_payload: payload });
      if (error) throw error;
      setBusiness((data as any) ?? null);
    } finally {
      setSaving(false);
    }
  };

  // Hide entirely if empty for visitors (no dummy values).
  if (!hasAnyBusinessInfo && !loading && !isOwner) return null;

  // Owner empty state
  if (!hasAnyBusinessInfo && !loading && isOwner) {
    return (
      <div
        className={`${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6 bg-white/80 dark:bg-gray-800/80`}
        style={cardStyle}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-500" />
            💼 Business
          </h2>
        </div>

        <div className="text-center py-4">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Add your business details for visitors to see</p>
          <button
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-full text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: buttonColor }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Business
          </button>
        </div>

        <SectionEditModal
          isOpen={editOpen}
          onClose={closeEdit}
          title="Edit Business Info"
          description="Visitors only see what you fill in."
          initialValues={{
            business_description: business?.business_description ?? '',
            website_url: business?.website_url ?? '',
            contact_email: business?.contact_email ?? '',
            contact_phone: business?.contact_phone ?? '',
            location_or_service_area: business?.location_or_service_area ?? '',
            hours_text: hoursText ?? '',
          }}
          fields={[
            { key: 'business_description', label: 'Business Description', type: 'textarea' },
            { key: 'website_url', label: 'Website', type: 'url', placeholder: 'https://yourbusiness.com' },
            { key: 'contact_email', label: 'Email', type: 'email', placeholder: 'hello@yourbusiness.com' },
            { key: 'contact_phone', label: 'Phone', type: 'phone', placeholder: '+1 555-123-4567' },
            { key: 'location_or_service_area', label: 'Location / Service Area', type: 'text' },
            { key: 'hours_text', label: 'Hours (optional)', type: 'textarea', placeholder: 'Mon–Fri 9am–6pm' },
          ]}
          onSubmit={saveBusiness}
        />
      </div>
    );
  }

  // Loading skeleton for owner (optional; keep lightweight)
  if (loading && isOwner) {
    return (
      <div
        className={`${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6 bg-white/80 dark:bg-gray-800/80`}
        style={cardStyle}
      >
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </div>
      </div>
    );
  }

  // Normal state
  return (
    <div
      className={`${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6 bg-white/80 dark:bg-gray-800/80`}
      style={cardStyle}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-blue-500" />
          💼 Business
        </h2>
        {isOwner && (
          <button
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: buttonColor }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            Edit
          </button>
        )}
      </div>

      <div className="space-y-4">
        {business?.business_description && business.business_description.trim() ? (
          <div>
            <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
              {business.business_description}
            </p>
          </div>
        ) : null}

        {hoursText && hoursText.trim() ? (
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-gray-500 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Hours</h3>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{hoursText}</p>
            </div>
          </div>
        ) : null}

        {business?.location_or_service_area && business.location_or_service_area.trim() ? (
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Location / Service Area</h3>
              <p className="text-gray-600 dark:text-gray-400">{business.location_or_service_area}</p>
            </div>
          </div>
        ) : null}

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          {business?.website_url && business.website_url.trim() ? (
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-gray-500" />
              <a
                href={business.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium break-all"
              >
                {business.website_url}
              </a>
            </div>
          ) : null}

          {business?.contact_email && business.contact_email.trim() ? (
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-500" />
              <a
                href={`mailto:${business.contact_email}`}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium break-all"
              >
                {business.contact_email}
              </a>
            </div>
          ) : null}

          {business?.contact_phone && business.contact_phone.trim() ? (
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-500" />
              <a
                href={`tel:${business.contact_phone}`}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium break-all"
              >
                {business.contact_phone}
              </a>
            </div>
          ) : null}
        </div>
      </div>

      {isOwner && (
        <SectionEditModal
          isOpen={editOpen}
          onClose={closeEdit}
          title="Edit Business Info"
          description="Visitors only see what you fill in."
          initialValues={{
            business_description: business?.business_description ?? '',
            website_url: business?.website_url ?? '',
            contact_email: business?.contact_email ?? '',
            contact_phone: business?.contact_phone ?? '',
            location_or_service_area: business?.location_or_service_area ?? '',
            hours_text: hoursText ?? '',
          }}
          fields={[
            { key: 'business_description', label: 'Business Description', type: 'textarea' },
            { key: 'website_url', label: 'Website', type: 'url', placeholder: 'https://yourbusiness.com' },
            { key: 'contact_email', label: 'Email', type: 'email', placeholder: 'hello@yourbusiness.com' },
            { key: 'contact_phone', label: 'Phone', type: 'phone', placeholder: '+1 555-123-4567' },
            { key: 'location_or_service_area', label: 'Location / Service Area', type: 'text' },
            { key: 'hours_text', label: 'Hours (optional)', type: 'textarea', placeholder: 'Mon–Fri 9am–6pm' },
          ]}
          onSubmit={saveBusiness}
        />
      )}
    </div>
  );
}


