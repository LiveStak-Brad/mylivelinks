'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Gift, ArrowLeft, Shield, Plus, Trash2, Edit, Save, X, Coins, DollarSign } from 'lucide-react';

interface GiftType {
  id: string;
  name: string;
  emoji: string;
  coin_cost: number;
  display_order: number;
  is_active: boolean;
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
}

export default function GiftsAdminPage() {
  const router = useRouter();
  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/');
  };
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'gifts' | 'coins'>('gifts');
  const [giftTypes, setGiftTypes] = useState<GiftType[]>([]);
  const [coinPacks, setCoinPacks] = useState<CoinPack[]>([]);
  const [editingGift, setEditingGift] = useState<GiftType | null>(null);
  const [editingPack, setEditingPack] = useState<CoinPack | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
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
        setGiftTypes(data);
      }
    } catch (error) {
      console.error('Error loading gift types:', error);
    }
  };

  const loadCoinPacks = async () => {
    try {
      const { data, error } = await supabase
        .from('coin_packs')
        .select('*')
        .order('price_usd', { ascending: true });

      if (!error && data) {
        setCoinPacks(data);
      }
    } catch (error) {
      console.error('Error loading coin packs:', error);
    }
  };

  const handleAddGift = async () => {
    if (!newGift.name || !newGift.emoji) {
      alert('Please fill in all fields');
      return;
    }

    setActionLoading(true);
    try {
      const { data, error } = await supabase
        .from('gift_types')
        .insert({
          name: newGift.name,
          emoji: newGift.emoji,
          coin_cost: newGift.coin_cost,
          display_order: giftTypes.length + 1,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setGiftTypes([...giftTypes, data]);
      setNewGift({ name: '', emoji: '🎁', coin_cost: 10 });
      alert('Gift type added!');
    } catch (error) {
      console.error('Error adding gift:', error);
      alert('Failed to add gift type');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateGift = async () => {
    if (!editingGift) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('gift_types')
        .update({
          name: editingGift.name,
          emoji: editingGift.emoji,
          coin_cost: editingGift.coin_cost,
          is_active: editingGift.is_active,
        })
        .eq('id', editingGift.id);

      if (error) throw error;

      setGiftTypes(giftTypes.map(g => g.id === editingGift.id ? editingGift : g));
      setEditingGift(null);
      alert('Gift type updated!');
    } catch (error) {
      console.error('Error updating gift:', error);
      alert('Failed to update gift type');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteGift = async (id: string) => {
    if (!confirm('Are you sure you want to delete this gift type?')) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('gift_types')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setGiftTypes(giftTypes.filter(g => g.id !== id));
      alert('Gift type deleted!');
    } catch (error) {
      console.error('Error deleting gift:', error);
      alert('Failed to delete gift type');
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
    try {
      const { data, error } = await supabase
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

      if (error) throw error;

      setCoinPacks([...coinPacks, data]);
      setNewPack({ name: '', coins: 100, price_usd: 1, bonus_coins: 0 });
      alert('Coin pack added!');
    } catch (error) {
      console.error('Error adding coin pack:', error);
      alert('Failed to add coin pack');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePack = async () => {
    if (!editingPack) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('coin_packs')
        .update({
          name: editingPack.name,
          coins: editingPack.coins,
          price_usd: editingPack.price_usd,
          bonus_coins: editingPack.bonus_coins,
          is_active: editingPack.is_active,
          is_popular: editingPack.is_popular,
        })
        .eq('id', editingPack.id);

      if (error) throw error;

      setCoinPacks(coinPacks.map(p => p.id === editingPack.id ? editingPack : p));
      setEditingPack(null);
      alert('Coin pack updated!');
    } catch (error) {
      console.error('Error updating coin pack:', error);
      alert('Failed to update coin pack');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePack = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coin pack?')) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('coin_packs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCoinPacks(coinPacks.filter(p => p.id !== id));
      alert('Coin pack deleted!');
    } catch (error) {
      console.error('Error deleting coin pack:', error);
      alert('Failed to delete coin pack');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">You don't have permission to access this page.</p>
          <button onClick={goBack} className="text-blue-500 hover:underline">
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={goBack} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Gift className="w-8 h-8 text-pink-500" />
                Gift & Coin Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400">Manage gift types and coin packs</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('gifts')}
            className={`px-6 py-3 rounded-lg font-medium transition flex items-center gap-2 ${
              activeTab === 'gifts'
                ? 'bg-pink-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Gift className="w-4 h-4" />
            Gift Types
          </button>
          <button
            onClick={() => setActiveTab('coins')}
            className={`px-6 py-3 rounded-lg font-medium transition flex items-center gap-2 ${
              activeTab === 'coins'
                ? 'bg-yellow-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Coins className="w-4 h-4" />
            Coin Packs
          </button>
        </div>

        {/* Gift Types Tab */}
        {activeTab === 'gifts' && (
          <div className="space-y-6">
            {/* Add New Gift */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
              <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">Add New Gift Type</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Emoji (e.g. 🎁)"
                  value={newGift.emoji}
                  onChange={(e) => setNewGift({ ...newGift, emoji: e.target.value })}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-center text-2xl"
                  maxLength={2}
                />
                <input
                  type="text"
                  placeholder="Gift Name"
                  value={newGift.name}
                  onChange={(e) => setNewGift({ ...newGift, name: e.target.value })}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
                <input
                  type="number"
                  placeholder="Coin Cost"
                  value={newGift.coin_cost}
                  onChange={(e) => setNewGift({ ...newGift, coin_cost: parseInt(e.target.value) || 0 })}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  min="1"
                />
                <button
                  onClick={handleAddGift}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Gift
                </button>
              </div>
            </div>

            {/* Gift Types List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Emoji</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {giftTypes.map((gift) => (
                    <tr key={gift.id}>
                      <td className="px-6 py-4 text-2xl">
                        {editingGift?.id === gift.id ? (
                          <input
                            type="text"
                            value={editingGift.emoji}
                            onChange={(e) => setEditingGift({ ...editingGift, emoji: e.target.value })}
                            className="w-16 px-2 py-1 border rounded text-center"
                            maxLength={2}
                          />
                        ) : (
                          gift.emoji
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingGift?.id === gift.id ? (
                          <input
                            type="text"
                            value={editingGift.name}
                            onChange={(e) => setEditingGift({ ...editingGift, name: e.target.value })}
                            className="px-2 py-1 border rounded"
                          />
                        ) : (
                          <span className="font-medium text-gray-900 dark:text-white">{gift.name}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingGift?.id === gift.id ? (
                          <input
                            type="number"
                            value={editingGift.coin_cost}
                            onChange={(e) => setEditingGift({ ...editingGift, coin_cost: parseInt(e.target.value) || 0 })}
                            className="w-24 px-2 py-1 border rounded"
                            min="1"
                          />
                        ) : (
                          <span className="text-yellow-600">🪙 {gift.coin_cost}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingGift?.id === gift.id ? (
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={editingGift.is_active}
                              onChange={(e) => setEditingGift({ ...editingGift, is_active: e.target.checked })}
                            />
                            Active
                          </label>
                        ) : (
                          <span className={`px-2 py-1 text-xs rounded ${gift.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                            {gift.is_active ? 'Active' : 'Inactive'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {editingGift?.id === gift.id ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={handleUpdateGift}
                              className="p-2 text-green-600 hover:bg-green-50 rounded"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingGift(null)}
                              className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingGift(gift)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteGift(gift.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Coin Packs Tab */}
        {activeTab === 'coins' && (
          <div className="space-y-6">
            {/* Add New Pack */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
              <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">Add New Coin Pack</h3>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                <input
                  type="text"
                  placeholder="Pack Name"
                  value={newPack.name}
                  onChange={(e) => setNewPack({ ...newPack, name: e.target.value })}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
                <input
                  type="number"
                  placeholder="Coins"
                  value={newPack.coins}
                  onChange={(e) => setNewPack({ ...newPack, coins: parseInt(e.target.value) || 0 })}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  min="1"
                />
                <input
                  type="number"
                  placeholder="Price (USD)"
                  value={newPack.price_usd}
                  onChange={(e) => setNewPack({ ...newPack, price_usd: parseFloat(e.target.value) || 0 })}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  min="0.01"
                  step="0.01"
                />
                <input
                  type="number"
                  placeholder="Bonus Coins"
                  value={newPack.bonus_coins}
                  onChange={(e) => setNewPack({ ...newPack, bonus_coins: parseInt(e.target.value) || 0 })}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  min="0"
                />
                <button
                  onClick={handleAddCoinPack}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Pack
                </button>
              </div>
            </div>

            {/* Coin Packs List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Coins</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bonus</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {coinPacks.map((pack) => (
                    <tr key={pack.id}>
                      <td className="px-6 py-4">
                        {editingPack?.id === pack.id ? (
                          <input
                            type="text"
                            value={editingPack.name}
                            onChange={(e) => setEditingPack({ ...editingPack, name: e.target.value })}
                            className="px-2 py-1 border rounded"
                          />
                        ) : (
                          <span className="font-medium text-gray-900 dark:text-white">{pack.name}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingPack?.id === pack.id ? (
                          <input
                            type="number"
                            value={editingPack.coins}
                            onChange={(e) => setEditingPack({ ...editingPack, coins: parseInt(e.target.value) || 0 })}
                            className="w-24 px-2 py-1 border rounded"
                          />
                        ) : (
                          <span className="text-yellow-600">🪙 {pack.coins.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingPack?.id === pack.id ? (
                          <input
                            type="number"
                            value={editingPack.bonus_coins}
                            onChange={(e) => setEditingPack({ ...editingPack, bonus_coins: parseInt(e.target.value) || 0 })}
                            className="w-24 px-2 py-1 border rounded"
                          />
                        ) : pack.bonus_coins > 0 ? (
                          <span className="text-green-600">+{pack.bonus_coins.toLocaleString()}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingPack?.id === pack.id ? (
                          <input
                            type="number"
                            value={editingPack.price_usd}
                            onChange={(e) => setEditingPack({ ...editingPack, price_usd: parseFloat(e.target.value) || 0 })}
                            className="w-24 px-2 py-1 border rounded"
                            step="0.01"
                          />
                        ) : (
                          <span className="text-gray-900 dark:text-white">${pack.price_usd}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {editingPack?.id === pack.id ? (
                            <>
                              <label className="flex items-center gap-1 text-xs">
                                <input
                                  type="checkbox"
                                  checked={editingPack.is_active}
                                  onChange={(e) => setEditingPack({ ...editingPack, is_active: e.target.checked })}
                                />
                                Active
                              </label>
                              <label className="flex items-center gap-1 text-xs">
                                <input
                                  type="checkbox"
                                  checked={editingPack.is_popular}
                                  onChange={(e) => setEditingPack({ ...editingPack, is_popular: e.target.checked })}
                                />
                                Popular
                              </label>
                            </>
                          ) : (
                            <>
                              {pack.is_popular && (
                                <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">Popular</span>
                              )}
                              {pack.is_active ? (
                                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Active</span>
                              ) : (
                                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">Inactive</span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {editingPack?.id === pack.id ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={handleUpdatePack}
                              className="p-2 text-green-600 hover:bg-green-50 rounded"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingPack(null)}
                              className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingPack(pack)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePack(pack.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

