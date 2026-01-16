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
  buttonColor?: string;
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

// Trusted merchandise providers
const TRUSTED_PROVIDERS = [
  { domain: 'spri.ng', name: 'Spring' },
  { domain: 'spring.com', name: 'Spring' },
  { domain: 'teespring.com', name: 'Spring' },
  { domain: 'shopify.com', name: 'Shopify' },
  { domain: 'myshopify.com', name: 'Shopify' },
  { domain: 'etsy.com', name: 'Etsy' },
  { domain: 'redbubble.com', name: 'Redbubble' },
  { domain: 'teepublic.com', name: 'TeePublic' },
  { domain: 'printful.com', name: 'Printful' },
  { domain: 'printify.com', name: 'Printify' },
  { domain: 'bonfire.com', name: 'Bonfire' },
  { domain: 'merchbar.com', name: 'Merchbar' },
  { domain: 'bigcartel.com', name: 'Big Cartel' },
  { domain: 'squarespace.com', name: 'Squarespace' },
  { domain: 'gumroad.com', name: 'Gumroad' },
  { domain: 'amazon.com', name: 'Amazon' },
  { domain: 'ebay.com', name: 'eBay' },
];

function isValidMerchUrl(url: string): { valid: boolean; provider?: string; error?: string } {
  if (!url || !url.trim()) {
    return { valid: true }; // URL is optional
  }

  try {
    const parsed = new URL(url.trim().toLowerCase());
    const hostname = parsed.hostname.replace(/^www\./, '');

    for (const provider of TRUSTED_PROVIDERS) {
      if (hostname === provider.domain || hostname.endsWith('.' + provider.domain)) {
        return { valid: true, provider: provider.name };
      }
    }

    return {
      valid: false,
      error: 'Please use a trusted merchandise provider (Spring, Shopify, Etsy, Redbubble, etc.)',
    };
  } catch {
    return { valid: false, error: 'Please enter a valid URL' };
  }
}

export default function Merchandise({
  profileId,
  profileType,
  isOwner = false,
  cardStyle,
  borderRadiusClass = 'rounded-2xl',
  buttonColor = '#DB2777',
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
    
    // Validate URL is from a trusted merchandise provider
    if (buyUrl) {
      const urlValidation = isValidMerchUrl(buyUrl);
      if (!urlValidation.valid) {
        throw new Error(urlValidation.error || 'Please use a trusted merchandise provider');
      }
    }
    
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
        className={`${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6 bg-white/80 dark:bg-gray-800/80`}
        style={cardStyle}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-green-500" />
            🛍️ Merchandise
          </h2>
        </div>

        <div className="text-center py-8">
          <ShoppingBag className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{emptyState.title}</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-2">{emptyState.text}</p>
          
          {/* Helper text */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Merchandise is sold through third-party platforms. Create your merch externally and link it here.
          </p>
          
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-full text-white transition-opacity hover:opacity-80 disabled:opacity-60 mb-6"
            style={{ backgroundColor: buttonColor }}
            disabled={loading}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {loading ? 'Loading…' : 'Add Merch'}
          </button>
          
          {/* Recommended Providers */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Recommended Providers</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
              {/* Spring (Teespring) */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-bold">S</span>
                  </div>
                  <span className="font-bold text-gray-900 dark:text-white">Spring</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  Best for creators · No upfront cost · Handles production & shipping
                </p>
                <a
                  href="https://www.spri.ng"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-green-600 hover:text-green-700 dark:text-green-400"
                >
                  Set up on Spring
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              
              {/* Shopify */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-bold">S</span>
                  </div>
                  <span className="font-bold text-gray-900 dark:text-white">Shopify</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  Best for full brand stores · Requires setup · Maximum control
                </p>
                <a
                  href="https://www.shopify.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-green-600 hover:text-green-700 dark:text-green-400"
                >
                  Set up on Shopify
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6 bg-white/80 dark:bg-gray-800/80`}
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
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: buttonColor }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Merch
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
                View Product
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : null}
          </div>
        ))}
      </div>

      {/* Disclaimer footer - shown once */}
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
        Merchandise is sold by third-party providers. MyLiveLinks does not handle payments, shipping, or customer support.
      </p>

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
            { key: 'price', label: 'Price (Display Only)', type: 'text', placeholder: '29.99', helpText: 'For display only. Actual price is set on your store.' },
            { key: 'image_url', label: 'Image URL', type: 'url', placeholder: 'https://.../image.jpg' },
            { key: 'buy_url', label: 'Product URL', type: 'url', placeholder: 'https://spri.ng/your-product', required: true, helpText: 'Supported: Spring, Shopify, Etsy, Redbubble, TeePublic, Printful, Printify, Bonfire, Merchbar, Big Cartel, Gumroad, Amazon, eBay' },
            { key: 'description', label: 'Description', type: 'textarea' },
            { key: 'is_featured', label: 'Featured', type: 'checkbox', checkboxLabel: 'Show this item as featured.' },
          ]}
          onSubmit={save}
        />
      )}
    </div>
  );
}


