'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy, RefreshCw, Mail } from 'lucide-react';

type WaitlistResp =
  | { ok: true; total: number; active: number; unsubscribed: number; emails: string[]; note?: string }
  | { ok: false; message?: string };

export default function OwnerWaitlistMobilePage() {
  const [data, setData] = useState<WaitlistResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const emailList = useMemo(() => {
    if (!data || data.ok !== true) return '';
    return (data.emails ?? []).join('\n');
  }, [data]);

  const load = async () => {
    setLoading(true);
    setCopied(false);
    try {
      const res = await fetch('/api/owner/waitlist/mobile', { cache: 'no-store' });
      const json = (await res.json()) as WaitlistResp;
      setData(json);
    } catch {
      setData({ ok: false, message: 'Failed to load' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(emailList);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  const ok = data && data.ok === true;

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Mail className="h-5 w-5 text-white" aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-foreground">Mobile App Waitlist</h1>
              <p className="text-sm text-muted-foreground">Email opt-ins for the mobile app launch update.</p>
            </div>
          </div>

          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted transition"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Total</div>
            <div className="text-2xl font-extrabold">{ok ? data.total : '—'}</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Active</div>
            <div className="text-2xl font-extrabold">{ok ? data.active : '—'}</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Unsubscribed</div>
            <div className="text-2xl font-extrabold">{ok ? data.unsubscribed : '—'}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="text-sm font-bold">Email list</div>
              <div className="text-xs text-muted-foreground">Copy/paste into email tools.</div>
              {ok && data.note ? <div className="text-xs text-amber-600 mt-1">{data.note}</div> : null}
              {data && data.ok === false ? <div className="text-xs text-rose-600 mt-1">{data.message || 'Error'}</div> : null}
            </div>
            <button
              onClick={onCopy}
              disabled={!emailList}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF5AAE] via-[#9B5EFF] to-[#0AEFFF] px-4 py-2 text-sm font-bold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Copy className="h-4 w-4" aria-hidden />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <textarea
            className="w-full min-h-[280px] rounded-xl border border-border bg-background p-3 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={emailList}
            readOnly
            placeholder={loading ? 'Loading…' : 'No emails yet.'}
          />
        </div>
      </div>
    </div>
  );
}

