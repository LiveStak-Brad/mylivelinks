import Link from 'next/link';

import { PolicyFooter } from '@/components/PolicyFooter';
import { POLICIES } from '@/shared/policies';

export default function PoliciesIndexPage() {
  return (
    <main id="main" tabIndex={-1} className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold text-foreground">Policies</h1>
          <p className="mt-2 text-muted-foreground">
            These policies apply to MyLiveLinks. They are available without login.
          </p>

          <div className="mt-8 space-y-4">
            {POLICIES.map((policy) => (
              <Link
                key={policy.id}
                href={`/policies/${policy.id}`}
                className="block rounded-xl border border-border bg-card p-4 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-foreground">{policy.title}</div>
                    {policy.summary ? (
                      <div className="mt-1 text-sm text-muted-foreground">{policy.summary}</div>
                    ) : null}
                  </div>
                  <div className="text-sm text-muted-foreground">Effective {policy.effectiveDate}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <PolicyFooter />
    </main>
  );
}

