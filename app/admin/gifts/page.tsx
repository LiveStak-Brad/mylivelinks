'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Gift, Shield, Plus, Trash2, Edit, Save, X, Coins } from 'lucide-react';
import { DashboardPage, DashboardSection, type DashboardTab } from '@/components/layout';
import { Button, IconButton, Input, Badge } from '@/components/ui';

interface GiftType {
  id: number | string;
  name: string;
  emoji: string;
  coin_cost: number;
  display_order: number;
  is_active: boolean;
  icon_url?: string | null;
}

interface CoinPack {
  id: string;
  name: string;
  coins: number;
  price_usd: number;
  bonus_coins: number;
  is_popular: boolean;
  is_active: boolean;
  stripe_price_id: string | null;
  sku?: string | null;
  db_id?: number | null;
}

export default function GiftsAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'gifts' | 'coins'>('gifts');
  const [giftTypes, setGiftTypes] = useState<GiftType[]>([]);
  const [coinPacks, setCoinPacks] = useState<CoinPack[]>([]);
  const [editingGift, setEditingGift] = useState<GiftType | null>(null);
  const [editingPack, setEditingPack] = useState<CoinPack | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const supabase = createClient();

  // New gift form
  const [newGift, setNewGift] = useState({
    name: '',
    emoji: '🎁',
    coin_cost: 10,
  });

  // New coin pack form
  const [newPack, setNewPack] = useState({
    name: '',
    coins: 100,
    price_usd: 1,
    bonus_coins: 0,
  });

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  };

  const isMissingColumnError = (error: unknown) => {
    const msg = getErrorMessage(error).toLowerCase();
    return msg.includes('column') && (msg.includes('does not exist') || msg.includes('not found'));
  };

  const normalizeGiftTypeRow = (row: any): GiftType => {
    const emoji = (row?.emoji ?? row?.icon_url ?? '🎁') as string;
    return {
      id: row?.id,
      name: String(row?.name ?? ''),
      emoji: String(emoji ?? ''),
      coin_cost: Number(row?.coin_cost ?? 0),
      display_order: Number(row?.display_order ?? 0),
      is_active: Boolean(row?.is_active ?? true),
      icon_url: row?.icon_url ?? null,
    };
  };

  const normalizeCoinPackRow = (row: any): CoinPack => {
    const coins = Number(row?.coins ?? row?.coins_amount ?? 0);
    const priceUsd = row?.price_usd ?? (row?.price_cents ? Number(row.price_cents) / 100 : 0);
    const active = row?.is_active ?? row?.active;

    return {
      id: String(row?.id ?? row?.sku ?? ''),
      db_id: typeof row?.id === 'number' ? row.id : row?.id ? Number(row.id) : null,
      sku: row?.sku ?? null,
      name: String(row?.name ?? row?.pack_name ?? row?.sku ?? 'Coin Pack'),
      coins,
      price_usd: Number(priceUsd ?? 0),
      bonus_coins: Number(row?.bonus_coins ?? 0),
      is_popular: Boolean(row?.is_popular ?? row?.is_vip ?? false),
      is_active: Boolean(active ?? true),
      stripe_price_id: (row?.stripe_price_id ?? null) as any,
    };
  };

  const isAllowedAdmin = (userId?: string | null, email?: string | null) => {
    const envIds = (process.env.NEXT_PUBLIC_ADMIN_PROFILE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
    const envEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const hardcodedIds = ['2b4a1178-3c39-4179-94ea-314dd824a818'];
    const hardcodedEmails = ['wcba.mo@gmail.com'];
    const idMatch = userId && (envIds.includes(userId) || hardcodedIds.includes(userId));
    const emailMatch = email && (envEmails.includes(email.toLowerCase()) || hardcodedEmails.includes(email.toLowerCase()));
    return !!(idMatch || emailMatch);
  };

  const checkAdminAndLoad = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const adminStatus = isAllowedAdmin(user.id, user.email);
      setIsAdmin(adminStatus);

      if (adminStatus) {
        await Promise.all([loadGiftTypes(), loadCoinPacks()]);
      }
    } catch (error) {
      console.error('Error checking admin:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGiftTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('gift_types')
        .select('*')
        .order('display_order', { ascending: true });

      if (!error && data) {
        setGiftTypes((data as any[]).map(normalizeGiftTypeRow));
      }
    } catch (error) {
      console.error('Error loading gift types:', error);
    }
  };

  const loadCoinPacks = async () => {
    try {
      let data: any[] | null = null;
      let error: any = null;

      const byDisplayOrder = await supabase.from('coin_packs').select('*').order('display_order', { ascending: true });
      if (byDisplayOrder.error) {
        const byPriceUsd = await supabase.from('coin_packs').select('*').order('price_usd', { ascending: true });
        if (byPriceUsd.error) {
          const byPriceCents = await supabase.from('coin_packs').select('*').order('price_cents', { ascending: true });
          data = (byPriceCents.data as any[]) ?? null;
          error = byPriceCents.error;
        } else {
          data = (byPriceUsd.data as any[]) ?? null;
          error = byPriceUsd.error;
        }
      } else {
        data = (byDisplayOrder.data as any[]) ?? null;
        error = byDisplayOrder.error;
      }

      if (!error && data) {
        setCoinPacks((data as any[]).map(normalizeCoinPackRow));
      }
    } catch (error) {
      console.error('Error loading coin packs:', error);
    }
  };

  const createCoinPackSku = (name: string, coins: number, priceUsd: number) => {
    const base = String(name || 'coin_pack')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]+/g, '')
      .slice(0, 50);
    const cents = Math.round(Number(priceUsd || 0) * 100);
    return `${base || 'coin_pack'}_${coins}_${cents}_${Date.now()}`;
  };

  const handleAddGift = async () => {
    if (!newGift.name || !newGift.emoji) {
      alert('Please fill in all fields');
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);
    try {
      const payloadBase: any = {
        name: newGift.name,
        coin_cost: newGift.coin_cost,
        display_order: giftTypes.length + 1,
        is_active: true,
      };

      let insertRes = await supabase
        .from('gift_types')
        .insert({ ...payloadBase, emoji: newGift.emoji })
        .select()
        .single();

      if (insertRes.error && isMissingColumnError(insertRes.error)) {
        insertRes = await supabase
          .from('gift_types')
          .insert({ ...payloadBase, icon_url: newGift.emoji })
          .select()
          .single();
      }

      if (insertRes.error) throw insertRes.error;

      setNewGift({ name: '', emoji: '🎁', coin_cost: 10 });
      await loadGiftTypes();
      alert('Gift type added!');
    } catch (error) {
      console.error('Error adding gift:', error);
      const msg = getErrorMessage(error);
      setErrorMessage(msg);
      alert(`Failed to add gift type: ${msg}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateGift = async () => {
    if (!editingGift) return;

    setActionLoading(true);
    setErrorMessage(null);
    try {
      const updateBase: any = {
        name: editingGift.name,
        coin_cost: editingGift.coin_cost,
        is_active: editingGift.is_active,
      };

      let updateRes = await supabase
        .from('gift_types')
        .update({ ...updateBase, emoji: editingGift.emoji })
        .eq('id', editingGift.id)
        .select('*')
        .single();

      if (updateRes.error && isMissingColumnError(updateRes.error)) {
        updateRes = await supabase
          .from('gift_types')
          .update({ ...updateBase, icon_url: editingGift.emoji })
          .eq('id', editingGift.id)
          .select('*')
          .single();
      }

      if (updateRes.error) throw updateRes.error;

      await loadGiftTypes();
      setEditingGift(null);
      alert('Gift type updated!');
    } catch (error) {
      console.error('Error updating gift:', error);
      const msg = getErrorMessage(error);
      setErrorMessage(msg);
      alert(`Failed to update gift type: ${msg}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteGift = async (id: string | number) => {
    if (!confirm('Are you sure you want to delete this gift type?')) return;

    setActionLoading(true);
    setErrorMessage(null);
    try {
      const idValue = typeof id === 'number' ? id : String(id);
      const res = await supabase
        .from('gift_types')
        .delete()
        .eq('id', idValue as any)
        .select('id')
        .single();

      if (res.error) throw res.error;

      await loadGiftTypes();
      alert('Gift type deleted!');
    } catch (error) {
      console.error('Error deleting gift:', error);
      const msg = getErrorMessage(error);
      setErrorMessage(msg);
      alert(`Failed to delete gift type: ${msg}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddCoinPack = async () => {
    if (!newPack.name || newPack.coins <= 0 || newPack.price_usd <= 0) {
      alert('Please fill in all fields correctly');
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);
    try {
      let insertRes = await supabase
        .from('coin_packs')
        .insert({
          name: newPack.name,
          coins: newPack.coins,
          price_usd: newPack.price_usd,
          bonus_coins: newPack.bonus_coins,
          is_active: true,
          is_popular: false,
        })
        .select()
        .single();

      if (insertRes.error && isMissingColumnError(insertRes.error)) {
        const sku = createCoinPackSku(newPack.name, newPack.coins, newPack.price_usd);
        insertRes = await supabase
          .from('coin_packs')
          .insert({
            sku,
            name: newPack.name,
            coins_amount: newPack.coins,
            price_cents: Math.round(newPack.price_usd * 100),
            currency: 'usd',
            active: true,
            display_order: coinPacks.length + 1,
          })
          .select()
          .single();
      }

      if (insertRes.error) throw insertRes.error;

      setNewPack({ name: '', coins: 100, price_usd: 1, bonus_coins: 0 });
      await loadCoinPacks();
      alert('Coin pack added!');
    } catch (error) {
      console.error('Error adding coin pack:', error);
      const msg = getErrorMessage(error);
      setErrorMessage(msg);
      alert(`Failed to add coin pack: ${msg}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePack = async () => {
    if (!editingPack) return;

    setActionLoading(true);
    setErrorMessage(null);
    try {
      const byIdClause = typeof editingPack.db_id === 'number' && !Number.isNaN(editingPack.db_id);
      const updatePayload = {
        name: editingPack.name,
        coins: editingPack.coins,
        price_usd: editingPack.price_usd,
        bonus_coins: editingPack.bonus_coins,
        is_active: editingPack.is_active,
        is_popular: editingPack.is_popular,
      };

      let updateRes = byIdClause
        ? await supabase
            .from('coin_packs')
            .update(updatePayload)
            .eq('id', editingPack.db_id as number)
            .select('*')
            .single()
        : await supabase
            .from('coin_packs')
            .update(updatePayload)
            .eq('sku', editingPack.id)
            .select('*')
            .single();

      if (updateRes.error && isMissingColumnError(updateRes.error)) {
        const legacyPayload = {
          name: editingPack.name,
          coins_amount: editingPack.coins,
          price_cents: Math.round(editingPack.price_usd * 100),
          active: editingPack.is_active,
        };

        updateRes = byIdClause
          ? await supabase
              .from('coin_packs')
              .update(legacyPayload)
              .eq('id', editingPack.db_id as number)
              .select('*')
              .single()
          : await supabase
              .from('coin_packs')
              .update(legacyPayload)
              .eq('sku', editingPack.id)
              .select('*')
              .single();
      }

      if (updateRes.error) throw updateRes.error;

      await loadCoinPacks();
      setEditingPack(null);
      alert('Coin pack updated!');
    } catch (error) {
      console.error('Error updating coin pack:', error);
      const msg = getErrorMessage(error);
      setErrorMessage(msg);
      alert(`Failed to update coin pack: ${msg}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePack = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coin pack?')) return;

    setActionLoading(true);
    setErrorMessage(null);
    try {
      const asNumber = Number(id);
      const canUseNumericId = Number.isFinite(asNumber) && String(asNumber) === String(id);

      let delRes = await supabase
        .from('coin_packs')
        .delete()
        .eq('id', canUseNumericId ? asNumber : id)
        .select('id')
        .single();

      if (delRes.error) {
        delRes = await supabase
          .from('coin_packs')
          .delete()
          .eq('sku', id)
          .select('id')
          .single();
      }

      if (delRes.error) throw delRes.error;

      await loadCoinPacks();
      alert('Coin pack deleted!');
    } catch (error) {
      console.error('Error deleting coin pack:', error);
      const msg = getErrorMessage(error);
      setErrorMessage(msg);
      alert(`Failed to delete coin pack: ${msg}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading gifts admin...</p>
        </div>
      </div>
    );
  }

  // Access denied state
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You don't have permission to access this page.</p>
          <Button variant="ghost" onClick={() => router.back()}>
            ← Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Build tabs
  const tabs: DashboardTab[] = [
    {
      id: 'gifts',
      label: 'Gift Types',
      icon: <Gift className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          {/* Add New Gift */}
          <DashboardSection title="Add New Gift Type">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                placeholder="Emoji (e.g. 🎁)"
                value={newGift.emoji}
                onChange={(e) => setNewGift({ ...newGift, emoji: e.target.value })}
                className="text-center text-2xl"
                maxLength={2}
              />
              <Input
                placeholder="Gift Name"
                value={newGift.name}
                onChange={(e) => setNewGift({ ...newGift, name: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Coin Cost"
                value={newGift.coin_cost}
                onChange={(e) => setNewGift({ ...newGift, coin_cost: parseInt(e.target.value) || 0 })}
                min={1}
              />
              <Button
                onClick={handleAddGift}
                disabled={actionLoading}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Gift
              </Button>
            </div>
          </DashboardSection>

          {/* Gift Types List */}
          <DashboardSection>
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Emoji</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Cost</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {giftTypes.map((gift) => (
                    <tr key={gift.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4 text-2xl">
                        {editingGift?.id === gift.id ? (
                          <Input
                            value={editingGift.emoji}
                            onChange={(e) => setEditingGift({ ...editingGift, emoji: e.target.value })}
                            className="w-16 text-center"
                            maxLength={2}
                            size="sm"
                          />
                        ) : (
                          gift.emoji
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {editingGift?.id === gift.id ? (
                          <Input
                            value={editingGift.name}
                            onChange={(e) => setEditingGift({ ...editingGift, name: e.target.value })}
                            size="sm"
                          />
                        ) : (
                          <span className="font-medium text-foreground">{gift.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {editingGift?.id === gift.id ? (
                          <Input
                            type="number"
                            value={editingGift.coin_cost}
                            onChange={(e) => setEditingGift({ ...editingGift, coin_cost: parseInt(e.target.value) || 0 })}
                            className="w-24"
                            size="sm"
                            min={1}
                          />
                        ) : (
                          <span className="text-warning">🪙 {gift.coin_cost}</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {editingGift?.id === gift.id ? (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingGift.is_active}
                              onChange={(e) => setEditingGift({ ...editingGift, is_active: e.target.checked })}
                              className="rounded"
                            />
                            <span className="text-sm">Active</span>
                          </label>
                        ) : (
                          <Badge variant={gift.is_active ? 'success' : 'default'} size="sm">
                            {gift.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {editingGift?.id === gift.id ? (
                          <div className="flex justify-end gap-1">
                            <IconButton
                              variant="ghost"
                              size="sm"
                              icon={<Save className="w-4 h-4" />}
                              onClick={handleUpdateGift}
                              aria-label="Save changes"
                              className="text-success"
                            />
                            <IconButton
                              variant="ghost"
                              size="sm"
                              icon={<X className="w-4 h-4" />}
                              onClick={() => setEditingGift(null)}
                              aria-label="Cancel editing"
                            />
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <IconButton
                              variant="ghost"
                              size="sm"
                              icon={<Edit className="w-4 h-4" />}
                              onClick={() => setEditingGift(gift)}
                              aria-label="Edit gift"
                              className="text-primary"
                            />
                            <IconButton
                              variant="ghost"
                              size="sm"
                              icon={<Trash2 className="w-4 h-4" />}
                              onClick={() => handleDeleteGift(gift.id)}
                              aria-label="Delete gift"
                              className="text-destructive"
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DashboardSection>
        </div>
      ),
    },
    {
      id: 'coins',
      label: 'Coin Packs',
      icon: <Coins className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          {/* Add New Pack */}
          <DashboardSection title="Add New Coin Pack">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Input
                placeholder="Pack Name"
                value={newPack.name}
                onChange={(e) => setNewPack({ ...newPack, name: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Coins"
                value={newPack.coins}
                onChange={(e) => setNewPack({ ...newPack, coins: parseInt(e.target.value) || 0 })}
                min={1}
              />
              <Input
                type="number"
                placeholder="Price (USD)"
                value={newPack.price_usd}
                onChange={(e) => setNewPack({ ...newPack, price_usd: parseFloat(e.target.value) || 0 })}
                min={0.01}
                step={0.01}
              />
              <Input
                type="number"
                placeholder="Bonus Coins"
                value={newPack.bonus_coins}
                onChange={(e) => setNewPack({ ...newPack, bonus_coins: parseInt(e.target.value) || 0 })}
                min={0}
              />
              <Button
                onClick={handleAddCoinPack}
                disabled={actionLoading}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Pack
              </Button>
            </div>
          </DashboardSection>

          {/* Coin Packs List */}
          <DashboardSection>
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Coins</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Bonus</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {coinPacks.map((pack) => (
                    <tr key={pack.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4">
                        {editingPack?.id === pack.id ? (
                          <Input
                            value={editingPack.name}
                            onChange={(e) => setEditingPack({ ...editingPack, name: e.target.value })}
                            size="sm"
                          />
                        ) : (
                          <span className="font-medium text-foreground">{pack.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {editingPack?.id === pack.id ? (
                          <Input
                            type="number"
                            value={editingPack.coins}
                            onChange={(e) => setEditingPack({ ...editingPack, coins: parseInt(e.target.value) || 0 })}
                            className="w-24"
                            size="sm"
                          />
                        ) : (
                          <span className="text-warning">🪙 {pack.coins.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {editingPack?.id === pack.id ? (
                          <Input
                            type="number"
                            value={editingPack.bonus_coins}
                            onChange={(e) => setEditingPack({ ...editingPack, bonus_coins: parseInt(e.target.value) || 0 })}
                            className="w-24"
                            size="sm"
                          />
                        ) : pack.bonus_coins > 0 ? (
                          <span className="text-success">+{pack.bonus_coins.toLocaleString()}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {editingPack?.id === pack.id ? (
                          <Input
                            type="number"
                            value={editingPack.price_usd}
                            onChange={(e) => setEditingPack({ ...editingPack, price_usd: parseFloat(e.target.value) || 0 })}
                            className="w-24"
                            size="sm"
                            step={0.01}
                          />
                        ) : (
                          <span className="text-foreground">${pack.price_usd}</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {editingPack?.id === pack.id ? (
                            <>
                              <label className="flex items-center gap-1 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editingPack.is_active}
                                  onChange={(e) => setEditingPack({ ...editingPack, is_active: e.target.checked })}
                                  className="rounded"
                                />
                                Active
                              </label>
                              <label className="flex items-center gap-1 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editingPack.is_popular}
                                  onChange={(e) => setEditingPack({ ...editingPack, is_popular: e.target.checked })}
                                  className="rounded"
                                />
                                Popular
                              </label>
                            </>
                          ) : (
                            <>
                              {pack.is_popular && (
                                <Badge variant="primary" size="sm">Popular</Badge>
                              )}
                              <Badge variant={pack.is_active ? 'success' : 'default'} size="sm">
                                {pack.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {editingPack?.id === pack.id ? (
                          <div className="flex justify-end gap-1">
                            <IconButton
                              variant="ghost"
                              size="sm"
                              icon={<Save className="w-4 h-4" />}
                              onClick={handleUpdatePack}
                              aria-label="Save changes"
                              className="text-success"
                            />
                            <IconButton
                              variant="ghost"
                              size="sm"
                              icon={<X className="w-4 h-4" />}
                              onClick={() => setEditingPack(null)}
                              aria-label="Cancel editing"
                            />
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <IconButton
                              variant="ghost"
                              size="sm"
                              icon={<Edit className="w-4 h-4" />}
                              onClick={() => setEditingPack(pack)}
                              aria-label="Edit pack"
                              className="text-primary"
                            />
                            <IconButton
                              variant="ghost"
                              size="sm"
                              icon={<Trash2 className="w-4 h-4" />}
                              onClick={() => handleDeletePack(pack.id)}
                              aria-label="Delete pack"
                              className="text-destructive"
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DashboardSection>
        </div>
      ),
    },
  ];

  return (
    <DashboardPage
      title="Gift & Coin Management"
      description="Manage gift types and coin packs"
      icon={<Gift className="w-6 h-6" />}
      tabs={tabs}
      defaultTab="gifts"
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab as 'gifts' | 'coins')}
      showRefresh={false}
      error={errorMessage}
    />
  );
}
