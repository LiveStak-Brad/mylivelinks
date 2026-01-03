import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronRight } from 'lucide-react';

import { PolicyFooter } from '@/components/PolicyFooter';
import {
  getWebPolicyById,
  WEB_RECOMMENDED_POLICY_IDS,
  WEB_REQUIRED_POLICY_IDS,
} from '@/lib/policies.web';

export const metadata: Metadata = {
  title: 'Safety & Policies | MyLiveLinks',
  description:
    'MyLiveLinks Safety & Policies Center. Read our Terms, Privacy, Community Guidelines, and other compliance policies. Available without login.',
  robots: { index: true, follow: true },
};

export default function PoliciesIndexPage() {
  const requiredPolicies = WEB_REQUIRED_POLICY_IDS
    .map((id) => getWebPolicyById(id))
    .filter((p): p is NonNullable<ReturnType<typeof getWebPolicyById>> => p !== null);
  const recommendedPolicies = WEB_RECOMMENDED_POLICY_IDS
    .map((id) => getWebPolicyById(id))
    .filter((p): p is NonNullable<ReturnType<typeof getWebPolicyById>> => p !== null);

  return (
    <main id="main" tabIndex={-1} className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold text-foreground">Safety &amp; Policies</h1>

          <div className="mt-10">
            <h2 className="text-lg font-bold text-foreground">Required</h2>
            <div className="mt-4 space-y-3">
              {requiredPolicies.map((policy) => (
                <Link
                  key={policy.id}
                  href={`/policies/${policy.id}`}
                  className="block rounded-xl border border-border bg-card p-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-lg font-semibold text-foreground">{policy.title}</div>
                      {policy.summary ? (
                        <div className="mt-1 text-sm text-muted-foreground">{policy.summary}</div>
                      ) : null}
                      <div className="mt-2 text-xs text-muted-foreground">Last updated {policy.lastUpdated}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:block text-sm text-muted-foreground">Effective {policy.effectiveDate}</div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-12">
            <h2 className="text-lg font-bold text-foreground">Recommended</h2>
            <div className="mt-4 space-y-3">
              {recommendedPolicies.map((policy) => (
                <Link
                  key={policy.id}
                  href={`/policies/${policy.id}`}
                  className="block rounded-xl border border-border bg-card p-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-lg font-semibold text-foreground">{policy.title}</div>
                      {policy.summary ? (
                        <div className="mt-1 text-sm text-muted-foreground">{policy.summary}</div>
                      ) : null}
                      <div className="mt-2 text-xs text-muted-foreground">Last updated {policy.lastUpdated}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:block text-sm text-muted-foreground">Effective {policy.effectiveDate}</div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <PolicyFooter />
    </main>
  );
}

