'use client';

import { useState, useEffect } from 'react';
import { X, Gift, ArrowUpRight, ArrowDownLeft, Coins, Inbox } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Skeleton, EmptyState, IconButton } from '@/components/ui';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import Link from 'next/link';

interface Transaction {
  id: string;
  type: 'coin_purchase' | 'gift_sent' | 'gift_received' | 'conversion' | 'cashout';
  asset: 'coin' | 'diamond' | 'usd';
  amount: number;
  direction: 'in' | 'out';
  description: string;
  created_at: string;
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

      const res = await fetch('/api/transactions?limit=50&offset=0', { cache: 'no-store' });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error || `Failed to load transactions (HTTP ${res.status})`);
      }

      const txs = Array.isArray(body?.transactions) ? (body.transactions as Transaction[]) : [];
      setTransactions(txs);
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            <span>Gifts & Transactions</span>
          </div>
          <IconButton aria-label="Close" onClick={onClose}>
            <X className="w-4 h-4" />
          </IconButton>
        </div>
      </ModalHeader>
      
      <ModalBody className="p-0">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <div className="px-4 border-b border-border">
            <TabsList className="bg-transparent -mb-px">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="sent">Sent</TabsTrigger>
              <TabsTrigger value="received">Received</TabsTrigger>
            </TabsList>
          </div>
          
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <EmptyState
                icon={<Inbox className="w-8 h-8" />}
                title="No transactions yet"
                description="Send or receive gifts to see them here"
                size="sm"
              />
            ) : (
              <div className="space-y-2">
                {filteredTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.type === 'gift_sent' || (tx.direction === 'out' && tx.asset !== 'usd')
                        ? 'bg-destructive/10'
                        : 'bg-success/10'
                    }`}>
                      {tx.type === 'gift_sent' || (tx.direction === 'out' && tx.asset !== 'usd') ? (
                        <ArrowUpRight className="w-5 h-5 text-destructive" />
                      ) : (
                        <ArrowDownLeft className="w-5 h-5 text-success" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {tx.description}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(tx.created_at)}
                      </p>
                    </div>
                    <div className={`font-bold ${
                      tx.type === 'gift_sent' || (tx.direction === 'out' && tx.asset !== 'usd')
                        ? 'text-destructive'
                        : 'text-success'
                    }`}>
                      {tx.direction === 'out' ? '-' : '+'}
                      {tx.amount.toLocaleString()}
                      <span className="text-xs ml-1">
                        {tx.asset === 'coin' ? '🪙' : tx.asset === 'diamond' ? '💎' : '$'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Tabs>
      </ModalBody>
      
      <ModalFooter className="bg-muted/30">
        <Link href="/wallet" onClick={onClose} className="w-full">
          <Button variant="ghost" className="w-full">
            View Full Wallet →
          </Button>
        </Link>
      </ModalFooter>
    </Modal>
  );
}
