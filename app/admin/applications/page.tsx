'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileCheck, ArrowLeft, Shield, Check, X, Clock, User, ExternalLink, Inbox } from 'lucide-react';
import { PageShell, PageHeader, PageSection } from '@/components/layout';
import { Button, Card, CardContent, Badge, Skeleton, EmptyState, IconButton } from '@/components/ui';

interface Application {
  id: string;
  profile_id: string;
  display_name: string;
  bio: string | null;
  social_links: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at: string | null;
  profile: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export default function ApplicationsPage() {
  const router = useRouter();
  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/');
  };
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const isAllowedAdmin = (userId?: string | null, email?: string | null) => {
    const envIds = (process.env.NEXT_PUBLIC_ADMIN_PROFILE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
    const envEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const hardcodedIds = ['2b4a1178-3c39-4179-94ea-314dd824a818'];
    const hardcodedEmails = ['wcba.mo@gmail.com'];
    const idMatch = userId && (envIds.includes(userId) || hardcodedIds.includes(userId));
    const emailMatch = email && (envEmails.includes(email.toLowerCase()) || hardcodedEmails.includes(email.toLowerCase()));
    return !!(idMatch || emailMatch);
  };

  const checkAdminAndLoad = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const adminStatus = isAllowedAdmin(user.id, user.email);
      setIsAdmin(adminStatus);

      if (adminStatus) {
        await loadApplications();
      }
    } catch (error) {
      console.error('Error checking admin:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('room_applications')
        .select(`
          *,
          profile:profiles(username, display_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setApplications(data);
      }
    } catch (error) {
      console.error('Error loading applications:', error);
    }
  };

  const handleUpdateStatus = async (applicationId: string, profileId: string, status: 'approved' | 'rejected') => {
    if (!confirm(`Are you sure you want to ${status === 'approved' ? 'approve' : 'reject'} this application?`)) return;

    setActionLoading(applicationId);
    try {
      // Update application status
      const { error: appError } = await supabase
        .from('room_applications')
        .update({ 
          status,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', applicationId);

      if (appError) throw appError;

      // If approved, update profile to allow streaming
      if (status === 'approved') {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            can_stream: true,
            room_approved: true,
          })
          .eq('id', profileId);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }
      }

      // Update local state
      setApplications(applications.map(app => 
        app.id === applicationId 
          ? { ...app, status, reviewed_at: new Date().toISOString() }
          : app
      ));

      alert(`Application ${status}!`);
    } catch (error) {
      console.error('Error updating application:', error);
      alert('Failed to update application');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredApplications = applications.filter(app => 
    filter === 'all' || app.status === filter
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const pendingCount = applications.filter(a => a.status === 'pending').length;

  if (loading) {
    return (
      <PageShell maxWidth="xl" padding="lg">
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-2 mt-6">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-10 w-24" />
            ))}
          </div>
          <div className="space-y-4 mt-6">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </PageShell>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-12 pb-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <Shield className="w-10 h-10 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-6">You don't have permission to access this page.</p>
            <Button onClick={goBack} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PageShell maxWidth="xl" padding="lg">
      <PageHeader 
        title="Room Applications"
        description="Review and approve streamer applications"
        backLink="/owner"
        backLabel="Back to Owner Panel"
        icon={<FileCheck className="w-8 h-8 text-success" />}
      />

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
          <Button
            key={status}
            onClick={() => setFilter(status)}
            variant={filter === status ? 'primary' : 'secondary'}
            size="sm"
          >
            <span className="capitalize">{status}</span>
            {status === 'pending' && pendingCount > 0 && (
              <Badge variant="warning" className="ml-2">{pendingCount}</Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {filteredApplications.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <EmptyState
                icon={<Inbox className="w-8 h-8" />}
                title={`No ${filter !== 'all' ? filter : ''} applications`}
                description="When users apply for streaming rooms, they will appear here."
              />
            </CardContent>
          </Card>
        ) : (
          filteredApplications.map((app) => (
            <Card
              key={app.id}
              className={app.status === 'pending' ? 'border-l-4 border-l-warning' : ''}
            >
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex-shrink-0">
                    {app.profile?.avatar_url ? (
                      <img src={app.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-bold text-lg text-foreground">
                        {app.display_name || app.profile?.display_name || 'Unknown'}
                      </h3>
                      <Link
                        href={`/${app.profile?.username}`}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        @{app.profile?.username}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                      <Badge 
                        variant={
                          app.status === 'pending' ? 'warning' : 
                          app.status === 'approved' ? 'success' : 
                          'destructive'
                        }
                      >
                        {app.status.toUpperCase()}
                      </Badge>
                    </div>

                    {app.bio && (
                      <p className="text-muted-foreground mb-3 line-clamp-2">
                        {app.bio}
                      </p>
                    )}

                    {app.social_links && (
                      <p className="text-sm text-muted-foreground mb-3">
                        <strong>Social:</strong> {app.social_links}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Applied: {formatDate(app.created_at)}
                      </span>
                      {app.reviewed_at && (
                        <span>
                          Reviewed: {formatDate(app.reviewed_at)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {app.status === 'pending' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        onClick={() => handleUpdateStatus(app.id, app.profile_id, 'approved')}
                        disabled={actionLoading === app.id}
                        isLoading={actionLoading === app.id}
                        variant="primary"
                        size="sm"
                        leftIcon={<Check className="w-4 h-4" />}
                        className="bg-success hover:bg-success/90"
                      >
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleUpdateStatus(app.id, app.profile_id, 'rejected')}
                        disabled={actionLoading === app.id}
                        variant="destructive"
                        size="sm"
                        leftIcon={<X className="w-4 h-4" />}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </PageShell>
  );
}
