'use client';

import { useState, useEffect } from 'react';
import { X, Gift, ArrowUpRight, ArrowDownLeft, Coins } from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface Transaction {
  id: string;
  type: 'gift_sent' | 'gift_received' | 'coin_purchase' | 'diamond_conversion';
  amount: number;
  description: string;
  created_at: string;
  other_username?: string;
}

interface TransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TransactionsModal({ isOpen, onClose }: TransactionsModalProps) {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'sent' | 'received'>('all');
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      loadTransactions();
    }
  }, [isOpen]);

  const loadTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load gifts sent
      const { data: giftsSent } = await supabase
        .from('gifts')
        .select(`
          id,
          coins_spent,
          created_at,
          to_profile:profiles!gifts_to_profile_id_fkey(username)
        `)
        .eq('from_profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      // Load gifts received  
      const { data: giftsReceived } = await supabase
        .from('gifts')
        .select(`
          id,
          diamonds_awarded,
          created_at,
          from_profile:profiles!gifts_from_profile_id_fkey(username)
        `)
        .eq('to_profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      // Combine and format transactions
      const formattedTransactions: Transaction[] = [];

      if (giftsSent) {
        giftsSent.forEach((gift: any) => {
          formattedTransactions.push({
            id: `sent-${gift.id}`,
            type: 'gift_sent',
            amount: gift.coins_spent || 0,
            description: `Gift sent to ${gift.to_profile?.username || 'Unknown'}`,
            created_at: gift.created_at,
            other_username: gift.to_profile?.username,
          });
        });
      }

      if (giftsReceived) {
        giftsReceived.forEach((gift: any) => {
          formattedTransactions.push({
            id: `received-${gift.id}`,
            type: 'gift_received',
            amount: gift.diamonds_awarded || 0,
            description: `Gift from ${gift.from_profile?.username || 'Anonymous'}`,
            created_at: gift.created_at,
            other_username: gift.from_profile?.username,
          });
        });
      }

      // Sort by date
      formattedTransactions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    if (activeTab === 'sent') return t.type === 'gift_sent';
    if (activeTab === 'received') return t.type === 'gift_received';
    return true;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-lg w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-500" />
            Gifts & Transactions
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-4">
          {(['all', 'sent', 'received'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium capitalize transition border-b-2 -mb-px ${
                activeTab === tab
                  ? 'text-purple-600 dark:text-purple-400 border-purple-600 dark:border-purple-400'
                  : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No transactions yet</p>
              <p className="text-sm mt-1">Send or receive gifts to see them here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.type === 'gift_sent'
                      ? 'bg-red-100 dark:bg-red-900/30'
                      : 'bg-green-100 dark:bg-green-900/30'
                  }`}>
                    {tx.type === 'gift_sent' ? (
                      <ArrowUpRight className="w-5 h-5 text-red-500 dark:text-red-400" />
                    ) : (
                      <ArrowDownLeft className="w-5 h-5 text-green-500 dark:text-green-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {tx.description}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(tx.created_at)}
                    </p>
                  </div>
                  <div className={`font-bold ${
                    tx.type === 'gift_sent'
                      ? 'text-red-500 dark:text-red-400'
                      : 'text-green-500 dark:text-green-400'
                  }`}>
                    {tx.type === 'gift_sent' ? '-' : '+'}
                    {tx.amount.toLocaleString()}
                    <span className="text-xs ml-1">
                      {tx.type === 'gift_sent' ? '🪙' : '💎'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <a
            href="/wallet"
            className="block w-full text-center py-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View Full Wallet →
          </a>
        </div>
      </div>
    </div>
  );
}

