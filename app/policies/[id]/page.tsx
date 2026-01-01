import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PolicyFooter } from '@/components/PolicyFooter';
import { getPolicyById } from '@/shared/policies';

export default function PolicyPage({ params }: { params: { id: string } }) {
  const policy = getPolicyById(params.id);
  if (!policy) return notFound();

  return (
    <main id="main" tabIndex={-1} className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-3xl">
          <div className="mb-6">
            <Link href="/policies" className="text-sm text-primary hover:underline">
              Back to Policies
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-foreground">{policy.title}</h1>
          <div className="mt-2 text-sm text-muted-foreground">
            Effective {policy.effectiveDate} · Last updated {policy.lastUpdated}
          </div>

          <div className="mt-8 space-y-8">
            {policy.sections.map((section) => (
              <section key={section.heading} className="space-y-2">
                <h2 className="text-xl font-bold text-foreground">{section.heading}</h2>
                <div className="text-sm leading-6 text-foreground whitespace-pre-wrap">{section.content}</div>
              </section>
            ))}
          </div>
        </div>
      </div>

      <PolicyFooter />
    </main>
  );
}

