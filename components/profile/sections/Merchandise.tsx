/**
 * Merchandise Section (Musician/Comedian)
 *
 * IMPORTANT:
 * - No mock data for visitors.
 * - Owner actions are real-data backed via Supabase RPCs (web + mobile parity).
 */

'use client';

import { ArrowDown, ArrowUp, ExternalLink, Pencil, ShoppingBag, Trash2 } from 'lucide-react';
import Image from 'next/image';
import type { ProfileType } from '@/lib/profileTypeConfig';
import { createClient } from '@/lib/supabase';
import SectionEditModal from '@/components/profile/edit/SectionEditModal';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type MerchItemRow = {
  id: string;
  name: string;
  price?: string | null; // formatted display string (e.g. "$29.99")
  image_url?: string | null;
  description?: string | null;
  buy_url?: string | null;
  is_featured?: boolean | null;
  sort_order?: number | null;
};

interface MerchandiseProps {
  profileId: string;
  profileType?: ProfileType;
  isOwner?: boolean;
  cardStyle?: React.CSSProperties;
  borderRadiusClass?: string;
}

type DbMerchRow = {
  id: string;
  profile_id: string;
  name: string;
  price_cents: number | null;
  currency: string;
  url: string | null;
  image_url: string | null;
  description: string | null;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function formatPrice(priceCents: number | null, currency: string | null | undefined) {
  if (priceCents === null || typeof priceCents !== 'number' || !Number.isFinite(priceCents)) return null;
  const cur = (currency || 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur }).format(priceCents / 100);
  } catch {
    return `${cur} ${(priceCents / 100).toFixed(2)}`;
  }
}

function parsePriceToCents(input: unknown): number | null {
  const raw = typeof input === 'string' ? input.trim() : '';
  if (!raw) return null;
  // Accept "$29.99", "29.99", "29", "29.9" (rounding not allowed; pad to 2).
  const cleaned = raw.replace(/,/g, '').replace(/^\$/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error('Please enter a valid price like 29.99');
  }
  const [dollarsStr, centsStrRaw] = cleaned.split('.');
  const dollars = Number(dollarsStr);
  const centsStr = (centsStrRaw ?? '').padEnd(2, '0');
  const cents = centsStr ? Number(centsStr) : 0;
  return dollars * 100 + cents;
}

export default function Merchandise({
  profileId,
  profileType,
  isOwner = false,
  cardStyle,
  borderRadiusClass = 'rounded-2xl',
}: MerchandiseProps) {
  const emptyState = useMemo(() => {
    // Keep this local to avoid any confusion with "mock data" providers.
    // (This is just copy for the owner's empty-state UI.)
    return {
      title: 'No Merch Yet',
      text: 'Add products so fans can support you.',
      ownerCTA: 'Add Product',
    };
  }, [profileType]);
  const supabase = useMemo(() => createClient(), []);

  const [products, setProducts] = useState<MerchItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MerchItemRow | null>(null);

  const load = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_profile_merch', { p_profile_id: profileId });
      if (error) {
        console.error('[Merchandise] get_profile_merch failed:', error);
        setProducts([]);
        return;
      }
      const rows = Array.isArray(data) ? (data as any[]) : [];
      setProducts(
        rows.map((r) => {
          const row = r as DbMerchRow;
          return {
            id: String(row.id),
            name: String(row.name ?? ''),
            price: formatPrice(row.price_cents ?? null, row.currency ?? 'USD'),
            image_url: row.image_url ?? null,
            description: row.description ?? null,
            buy_url: row.url ?? null,
            is_featured: row.is_featured ?? false,
            sort_order: row.sort_order ?? 0,
          };
        })
      );
    } finally {
      setLoading(false);
    }
  }, [profileId, supabase]);

  useEffect(() => {
    void load();
  }, [load, reloadNonce]);

  const openAdd = () => {
    if (!isOwner) return;
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (p: MerchItemRow) => {
    if (!isOwner) return;
    setEditing(p);
    setModalOpen(true);
  };

  const deleteItem = async (itemId: string) => {
    if (!isOwner) return;
    if (!confirm('Delete this merch item?')) return;
    const { error } = await supabase.rpc('delete_profile_merch_item', { p_item_id: itemId });
    if (error) {
      alert(error.message || 'Failed to delete merch item.');
      return;
    }
    setReloadNonce((n) => n + 1);
  };

  const save = async (values: Record<string, any>) => {
    if (!isOwner) throw new Error('Only the profile owner can edit this section.');

    const name = String(values.name ?? '').trim();
    if (!name) throw new Error('Product Name is required.');

    const priceCents = parsePriceToCents(values.price);
    const buyUrl = String(values.buy_url ?? '').trim() || null;
    const imageUrl = String(values.image_url ?? '').trim() || null;
    const description = String(values.description ?? '').trim() || null;
    const isFeatured = values.is_featured === true;

    const existing = editing ? products.find((p) => p.id === editing.id) : null;
    const sortOrder = existing?.sort_order ?? products.length;

    const { error } = await supabase.rpc('upsert_profile_merch_item', {
      p_item: {
        id: editing?.id ?? null,
        name,
        price_cents: priceCents,
        currency: 'USD',
        url: buyUrl,
        image_url: imageUrl,
        description,
        is_featured: isFeatured,
        sort_order: sortOrder,
      },
    });

    if (error) throw error;
    setModalOpen(false);
    setEditing(null);
    setReloadNonce((n) => n + 1);
  };

  const move = async (itemId: string, delta: -1 | 1) => {
    if (!isOwner) return;
    const idx = products.findIndex((p) => p.id === itemId);
    if (idx < 0) return;
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= products.length) return;

    const next = [...products];
    const [it] = next.splice(idx, 1);
    next.splice(nextIdx, 0, it);
    setProducts(next);

    const orderedIds = next.map((p) => p.id);
    const { error } = await supabase.rpc('reorder_profile_merch', { p_profile_id: profileId, p_ordered_ids: orderedIds });
    if (error) {
      console.error('[Merchandise] reorder_profile_merch failed:', error);
      alert(error.message || 'Failed to reorder merchandise.');
      setReloadNonce((n) => n + 1);
    }
  };

  if (!products.length) {
    if (!isOwner) return null;
    return (
      <div
        className={`backdrop-blur-sm ${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6`}
        style={cardStyle}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-green-500" />
            🛍️ Merchandise
          </h2>
        </div>

        <div className="text-center py-12">
          <ShoppingBag className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{emptyState.title}</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{emptyState.text}</p>
          <button
            onClick={openAdd}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Loading…' : emptyState.ownerCTA || 'Add Product'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`backdrop-blur-sm ${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6`}
      style={cardStyle}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-green-500" />
          🛍️ Merchandise
        </h2>
        {isOwner && (
          <button
            onClick={openAdd}
            className="text-sm font-semibold text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
          >
            + Add
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p, i) => (
          <div
            key={p.id}
            className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800/30 hover:shadow-md transition-shadow"
          >
            {p.image_url ? (
              <div className="relative w-full h-40 mb-3 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                <Image src={p.image_url} alt={p.name} fill className="object-cover" />
              </div>
            ) : null}

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 dark:text-white mb-1 truncate">{p.name}</h3>
                {p.price ? (
                  <p className="text-lg font-extrabold text-green-700 dark:text-green-300 mb-2">{p.price}</p>
                ) : null}
              </div>

              {isOwner && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => move(p.id, -1)}
                    className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition disabled:opacity-50"
                    title="Move up"
                    disabled={i === 0}
                  >
                    <ArrowUp className="w-4 h-4 text-green-700 dark:text-green-200" />
                  </button>
                  <button
                    onClick={() => move(p.id, 1)}
                    className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition disabled:opacity-50"
                    title="Move down"
                    disabled={i === products.length - 1}
                  >
                    <ArrowDown className="w-4 h-4 text-green-700 dark:text-green-200" />
                  </button>
                  <button
                    onClick={() => openEdit(p)}
                    className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4 text-green-700 dark:text-green-200" />
                  </button>
                  <button
                    onClick={() => void deleteItem(p.id)}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </button>
                </div>
              )}
            </div>

            {p.description ? (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 whitespace-pre-wrap">{p.description}</p>
            ) : null}

            {p.buy_url ? (
              <a
                href={p.buy_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors text-sm"
              >
                Buy
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : null}
          </div>
        ))}
      </div>

      {isOwner && (
        <SectionEditModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          title={editing ? 'Edit Merchandise' : 'Add Merchandise'}
          initialValues={{
            name: editing?.name ?? '',
            price: editing?.price ?? '',
            image_url: editing?.image_url ?? '',
            buy_url: editing?.buy_url ?? '',
            description: editing?.description ?? '',
            is_featured: editing?.is_featured === true,
          }}
          fields={[
            { key: 'name', label: 'Product Name', type: 'text', required: true },
            { key: 'price', label: 'Price', type: 'text', placeholder: '29.99' },
            { key: 'image_url', label: 'Image URL', type: 'url', placeholder: 'https://.../image.jpg' },
            { key: 'buy_url', label: 'Purchase URL', type: 'url', placeholder: 'https://shop...' },
            { key: 'description', label: 'Description', type: 'textarea' },
            { key: 'is_featured', label: 'Featured', type: 'checkbox', checkboxLabel: 'Show this item as featured.' },
          ]}
          onSubmit={save}
        />
      )}
    </div>
  );
}


