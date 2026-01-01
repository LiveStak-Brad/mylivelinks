'use client';

import Link from 'next/link';

import { getWebPolicyById, WEB_POLICY_FOOTER_LINKS, type WebPolicyId } from '@/lib/policies.web';

export function PolicyFooter() {
  const footerPolicies = WEB_POLICY_FOOTER_LINKS
    .map((id: WebPolicyId) => {
      const policy = getWebPolicyById(id);
      if (!policy) return null;

      let label = policy.title;
      if (policy.id === 'terms-of-service') label = 'Terms of Service';
      if (policy.id === 'privacy-policy') label = 'Privacy Policy';
      if (policy.id === 'community-guidelines') label = 'Community Guidelines';
      if (policy.id === 'payments-virtual-currency') label = 'Payments & Virtual Currency Policy';
      if (policy.id === 'fraud-chargeback') label = 'Fraud & Chargeback Policy';
      if (policy.id === 'creator-earnings-payout') label = 'Creator Earnings & Payout Policy';

      return { id: policy.id, label };
    })
    .filter((p): p is { id: WebPolicyId; label: string } => p !== null);

  return (
    <footer className="w-full border-t border-border bg-background">
      <div className="container mx-auto px-4 py-6 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link href="/policies" className="hover:text-foreground">
            Safety &amp; Policies
          </Link>
          {footerPolicies.map((policy) => (
            <Link key={policy.id} href={`/policies/${policy.id}`} className="hover:text-foreground">
              {policy.label}
            </Link>
          ))}
        </div>
        <div className="mt-4 text-center">© 2026 MyLiveLinks. All rights reserved.</div>
      </div>
    </footer>
  );
}
