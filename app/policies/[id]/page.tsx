import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { PolicyFooter } from '@/components/PolicyFooter';
import { getWebPolicyById } from '@/lib/policies.web';

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const policy = getWebPolicyById(params.id);
  if (!policy) {
    return {
      title: 'Policy Not Found | MyLiveLinks',
      description: 'This policy page could not be found.',
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${policy.title} | MyLiveLinks`,
    description:
      policy.summary || `Read the ${policy.title} for MyLiveLinks. Available without login.`,
    robots: { index: true, follow: true },
  };
}

export default function PolicyPage({ params }: { params: { id: string } }) {
  const policy = getWebPolicyById(params.id);
  if (!policy) return notFound();

  return (
    <main id="main" tabIndex={-1} className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="max-w-3xl">
            <Link href="/policies" className="text-sm font-medium text-primary hover:underline">
              Back to All Policies
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold text-foreground">{policy.title}</h1>

          <div className="mt-4 rounded-xl border border-border bg-card p-4 text-sm text-foreground">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <div className="text-xs font-semibold text-muted-foreground">Effective Date</div>
                <div className="mt-0.5">{policy.effectiveDate}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground">Last Updated</div>
                <div className="mt-0.5">{policy.lastUpdated}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground">Legal Entity</div>
                <div className="mt-0.5">{policy.legalEntity}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground">Contact</div>
                <div className="mt-0.5">
                  <a className="text-primary hover:underline" href={`mailto:${policy.contactEmail}`}>
                    {policy.contactEmail}
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 space-y-10">
            {policy.sections.map((section) => (
              <section key={section.heading} className="space-y-3">
                <h2 className="text-xl font-bold text-foreground">{section.heading}</h2>
                <div className="text-sm leading-7 text-foreground whitespace-pre-wrap">{section.content}</div>
              </section>
            ))}
          </div>
        </div>
      </div>

      <PolicyFooter />
    </main>
  );
}
