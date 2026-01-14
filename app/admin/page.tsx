'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Users,
  Gift,
  Flag,
  FileCheck,
  BarChart3,
  Settings,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

/* =============================================================================
   ADMIN DASHBOARD PAGE
   
   Route: /admin
   
   Central hub for all admin functions.
   Links to:
   - /admin/moderation (User moderation, reports)
   - /admin/applications (Broadcaster applications)
   - /admin/gifts (Gift management)
   
   Only accessible to users with admin privileges.
   UI-only scaffolding with clear indicators for backend wiring.
============================================================================= */

interface AdminStats {
  pendingReports: number;
  pendingApplications: number;
  activeUsers: number;
  activeStreams: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<AdminStats>({
    pendingReports: 0,
    pendingApplications: 0,
    activeUsers: 0,
    activeStreams: 0,
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      // Check if user is admin - env vars with hardcoded fallback
      const FALLBACK_ADMIN_IDS = ['2b4a1178-3c39-4179-94ea-314dd824a818', '0b47a2d7-43fb-4d38-b321-2d5d0619aabf'];
      const FALLBACK_ADMIN_EMAILS = ['wcba.mo@gmail.com', 'brad@mylivelinks.com'];
      
      const envIds = (process.env.NEXT_PUBLIC_ADMIN_PROFILE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
      const envEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      
      const adminIds = envIds.length > 0 ? envIds : FALLBACK_ADMIN_IDS;
      const adminEmails = envEmails.length > 0 ? envEmails : FALLBACK_ADMIN_EMAILS;
      
      const idMatch = adminIds.includes(user.id);
      const emailMatch = user.email && adminEmails.includes(user.email.toLowerCase());
      
      if (!idMatch && !emailMatch) {
        // Not an admin, redirect
        router.push('/');
        return;
      }

      setIsAdmin(true);
      
      // Load admin stats from owner summary API
      try {
        const res = await fetch('/api/owner/summary');
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.stats) {
            setStats({
              pendingReports: data.stats.reports_pending ?? 0,
              pendingApplications: data.stats.applications_pending ?? 0,
              activeUsers: data.stats.users_active_24h ?? 0,
              activeStreams: data.stats.streams_live ?? 0,
            });
          }
        }
      } catch (statsErr) {
        console.error('Failed to load admin stats:', statsErr);
      }
      
    } catch (error) {
      console.error('Error checking admin access:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main 
        id="main"
        className="min-h-[calc(100vh-7rem)] bg-background pb-24 md:pb-8 flex items-center justify-center"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect in useEffect
  }

  return (
    <main 
      id="main"
      className="min-h-[calc(100vh-7rem)] bg-background pb-24 md:pb-8"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        
        {/* Page Header */}
        <header className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500 to-orange-600">
              <Shield className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Admin Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Platform management and moderation
              </p>
            </div>
          </div>

          {/* Admin Badge */}
          <Badge variant="destructive" className="gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Administrator
          </Badge>
        </header>

        <div className="space-y-6">
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-up">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <Flag className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {stats.pendingReports}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Pending Reports
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <FileCheck className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {stats.pendingApplications}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Applications
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <Users className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {stats.activeUsers}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Active Users
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {stats.activeStreams}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Live Streams
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Admin Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
            
            {/* Moderation */}
            <Link href="/admin/moderation">
              <Card className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-destructive/10 group-hover:bg-destructive/20 transition-colors">
                      <Flag className="w-6 h-6 text-destructive" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                        Moderation
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Review reports, manage users, and handle content moderation
                      </p>
                      {stats.pendingReports > 0 && (
                        <Badge variant="destructive" size="sm">
                          {stats.pendingReports} pending
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Applications */}
            <Link href="/admin/applications">
              <Card className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                      <FileCheck className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                        Applications
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Review broadcaster applications and approve streaming access
                      </p>
                      {stats.pendingApplications > 0 && (
                        <Badge variant="warning" size="sm">
                          {stats.pendingApplications} pending
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Gifts */}
            <Link href="/admin/gifts">
              <Card className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Gift className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                        Gifts
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Manage gift catalog, pricing, and gift-related settings
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Linkler Prompt */}
            <Link href="/admin/linkler">
              <Card className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors">
                      <Settings className="w-6 h-6 text-indigo-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                        Linkler Prompt
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Edit Linkler’s runtime instructions without redeploying the platform.
                      </p>
                      <Badge variant="secondary" size="sm">
                        Runtime
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Users (Coming Soon) */}
            <Card className="opacity-60">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-muted">
                    <Users className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      User Management
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      View and manage user accounts, profiles, and permissions
                    </p>
                    <Badge variant="secondary" size="sm">
                      Coming Soon
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Analytics (Coming Soon) */}
            <Card className="opacity-60">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-muted">
                    <BarChart3 className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Analytics
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Platform-wide statistics, reports, and insights
                    </p>
                    <Badge variant="secondary" size="sm">
                      Coming Soon
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Settings (Coming Soon) */}
            <Card className="opacity-60">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-muted">
                    <Settings className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Platform Settings
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Configure platform-wide settings and features
                    </p>
                    <Badge variant="secondary" size="sm">
                      Coming Soon
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Notice */}
          <Card className="bg-amber-500/10 border-amber-500/30 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <CardContent className="p-4">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-900 dark:text-amber-300 mb-1">
                    Admin Dashboard Status
                  </p>
                  <p className="text-amber-800 dark:text-amber-400">
                    This dashboard provides UI scaffolding for admin functions. Backend integration is in progress. 
                    Currently, Moderation, Applications, and Gifts pages are available with basic functionality.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </main>
  );
}


