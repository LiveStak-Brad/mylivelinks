'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

interface GiftType {
  id: number;
  name: string;
  coin_cost: number;
  icon_url?: string;
  tier: number;
}

interface GiftModalProps {
  recipientId: string;
  recipientUsername: string;
  slotIndex?: number;
  liveStreamId?: number;
  onGiftSent: () => void;
  onClose: () => void;
}

export default function GiftModal({
  recipientId,
  recipientUsername,
  slotIndex,
  liveStreamId,
  onGiftSent,
  onClose,
}: GiftModalProps) {
  const [giftTypes, setGiftTypes] = useState<GiftType[]>([]);
  const [selectedGift, setSelectedGift] = useState<GiftType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userCoinBalance, setUserCoinBalance] = useState<number>(0);

  const supabase = createClient();

  // Load gift types and user balance on mount
  useEffect(() => {
    loadGiftTypes();
    loadUserBalance();
  }, []);

  const loadGiftTypes = async () => {
    const { data, error } = await supabase
      .from('gift_types')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    
    if (!error && data) {
      setGiftTypes(data);
    }
  };

  const loadUserBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('coin_balance')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      setUserCoinBalance((data as any).coin_balance);
    }
  };

  const handleSendGift = async () => {
    if (!selectedGift) return;

    if (userCoinBalance < selectedGift.coin_cost) {
      setError('Insufficient coin balance');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Call RPC function
      const { data, error: rpcError } = await (supabase.rpc as any)('process_gift', {
        p_sender_id: user.id,
        p_recipient_id: recipientId,
        p_gift_type_id: selectedGift.id,
        p_slot_index: slotIndex || null,
        p_live_stream_id: liveStreamId || null,
      });

      if (rpcError) throw rpcError;

      // Refresh balance
      await loadUserBalance();

      // Post chat message: "sender sent 'gift' to recipient +points"
      // Get sender's username
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      
      if (senderProfile) {
        await supabase.from('chat_messages').insert({
          profile_id: user.id,
          message: `${senderProfile.username} sent "${selectedGift.name}" to ${recipientUsername} +${selectedGift.coin_cost} coins`,
          message_type: 'gift',
        });
      }

      onGiftSent();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send gift');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Send Gift to {recipientUsername}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Your Coins: <span className="font-bold">{userCoinBalance.toLocaleString()}</span>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 mb-4 max-h-64 overflow-y-auto">
          {giftTypes.map((gift) => (
            <button
              key={gift.id}
              onClick={() => setSelectedGift(gift)}
              className={`p-3 border-2 rounded-lg transition ${
                selectedGift?.id === gift.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {gift.icon_url ? (
                <img src={gift.icon_url} alt={gift.name} className="w-12 h-12 mx-auto mb-1" />
              ) : (
                <div className="w-12 h-12 mx-auto mb-1 bg-gray-200 rounded" />
              )}
              <p className="text-xs font-medium">{gift.name}</p>
              <p className="text-xs text-gray-600">{gift.coin_cost} coins</p>
            </button>
          ))}
        </div>

        {selectedGift && (
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <p className="text-sm">
              <span className="font-medium">Selected:</span> {selectedGift.name}
            </p>
            <p className="text-sm">
              <span className="font-medium">Cost:</span> {selectedGift.coin_cost} coins
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Recipient will earn {selectedGift.coin_cost} diamonds (1:1)
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSendGift}
            disabled={!selectedGift || loading || userCoinBalance < (selectedGift?.coin_cost || 0)}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Gift'}
          </button>
        </div>
      </div>
    </div>
  );
}

