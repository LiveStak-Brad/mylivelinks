import ConsentClient from './ConsentClient';

// Force dynamic rendering; needs live auth/session + URL params (no static export).
export const dynamic = 'force-dynamic';
export const revalidate = false;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

export default function OAuthConsentPage() {
  return <ConsentClient />;
}
