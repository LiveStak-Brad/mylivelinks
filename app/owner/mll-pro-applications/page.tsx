'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Loader2, Eye, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Application {
  id: string;
  created_at: string;
  status: 'submitted' | 'reviewing' | 'approved' | 'declined';
  reviewed_at: string | null;
  reviewed_by: string | null;
  display_name: string;
  mll_username: string;
  email: string;
  phone: string | null;
  country: string | null;
  timezone: string | null;
  currently_streaming: boolean;
  platforms: Array<{ platform: string; username: string }>;
  streaming_duration: string | null;
  categories: string[];
  schedule: string | null;
  avg_stream_length: string | null;
  avg_viewers: string | null;
  strengths: string | null;
  growth_plan: string | null;
  promotion_methods: string[];
  will_share_link: boolean | null;
  community_goal: string | null;
  invited_already: boolean | null;
  invited_count: number | null;
  referral_info: string | null;
  fit_reason: string | null;
  vod_links: string[];
  agrees_to_standards: boolean;
  consent_transactional: boolean;
  consent_updates: boolean;
  opt_out_marketing: boolean;
  meta: any;
}

export default function MllProApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/owner/mll-pro/applications');
      const data = await response.json();
      if (response.ok) {
        setApplications(data.applications || []);
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/owner/mll-pro/applications/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        await fetchApplications();
        if (selectedApp?.id === id) {
          const updated = applications.find(app => app.id === id);
          if (updated) {
            setSelectedApp({ ...updated, status: status as any });
          }
        }
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      submitted: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      reviewing: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      approved: 'bg-green-500/20 text-green-400 border-green-500/30',
      declined: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    const icons = {
      submitted: FileText,
      reviewing: Clock,
      approved: CheckCircle,
      declined: XCircle,
    };
    const Icon = icons[status as keyof typeof icons];
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${styles[status as keyof typeof styles]}`}>
        <Icon className="w-4 h-4" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">MLL PRO Applications</h1>
        <p className="text-gray-400">Review and manage MLL PRO program applications</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Applications List */}
        <div className="bg-white/5 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            Applications ({applications.length})
          </h2>
          
          {applications.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No applications yet</p>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <div
                  key={app.id}
                  onClick={() => setSelectedApp(app)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                    selectedApp?.id === app.id
                      ? 'bg-purple-500/20 border-purple-500'
                      : 'bg-white/5 border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-white">{app.display_name}</h3>
                      <p className="text-sm text-gray-400">@{app.mll_username}</p>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>
                  <p className="text-sm text-gray-400">{app.email}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Application Detail */}
        <div className="bg-white/5 rounded-xl p-6">
          {!selectedApp ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Eye className="w-12 h-12 mb-4 opacity-50" />
              <p>Select an application to view details</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedApp.display_name}</h2>
                    <p className="text-gray-400">@{selectedApp.mll_username}</p>
                  </div>
                  {getStatusBadge(selectedApp.status)}
                </div>

                {/* Status Actions */}
                <div className="flex gap-2 mb-6">
                  <Button
                    onClick={() => updateStatus(selectedApp.id, 'reviewing')}
                    disabled={updatingStatus || selectedApp.status === 'reviewing'}
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white text-sm"
                  >
                    Mark Reviewing
                  </Button>
                  <Button
                    onClick={() => updateStatus(selectedApp.id, 'approved')}
                    disabled={updatingStatus || selectedApp.status === 'approved'}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm"
                  >
                    Approve
                  </Button>
                  <Button
                    onClick={() => updateStatus(selectedApp.id, 'declined')}
                    disabled={updatingStatus || selectedApp.status === 'declined'}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm"
                  >
                    Decline
                  </Button>
                </div>
              </div>

              <div className="space-y-4 max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
                {/* Contact Info */}
                <section>
                  <h3 className="text-lg font-semibold text-white mb-2">Contact Information</h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-300"><span className="text-gray-500">Email:</span> {selectedApp.email}</p>
                    {selectedApp.phone && <p className="text-gray-300"><span className="text-gray-500">Phone:</span> {selectedApp.phone}</p>}
                    {selectedApp.country && <p className="text-gray-300"><span className="text-gray-500">Country:</span> {selectedApp.country}</p>}
                    {selectedApp.timezone && <p className="text-gray-300"><span className="text-gray-500">Timezone:</span> {selectedApp.timezone}</p>}
                  </div>
                </section>

                {/* Streaming Background */}
                <section>
                  <h3 className="text-lg font-semibold text-white mb-2">Streaming Background</h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-300">
                      <span className="text-gray-500">Currently Streaming:</span> {selectedApp.currently_streaming ? 'Yes' : 'No'}
                    </p>
                    {selectedApp.platforms.length > 0 && (
                      <div>
                        <p className="text-gray-500 mb-1">Platforms:</p>
                        <ul className="space-y-1 ml-4">
                          {selectedApp.platforms.map((p, i) => (
                            <li key={i} className="text-gray-300">
                              {p.platform}: {p.username}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedApp.streaming_duration && (
                      <p className="text-gray-300"><span className="text-gray-500">Duration:</span> {selectedApp.streaming_duration}</p>
                    )}
                    {selectedApp.categories.length > 0 && (
                      <p className="text-gray-300"><span className="text-gray-500">Categories:</span> {selectedApp.categories.join(', ')}</p>
                    )}
                    {selectedApp.schedule && (
                      <p className="text-gray-300"><span className="text-gray-500">Schedule:</span> {selectedApp.schedule}</p>
                    )}
                    {selectedApp.avg_stream_length && (
                      <p className="text-gray-300"><span className="text-gray-500">Avg Stream Length:</span> {selectedApp.avg_stream_length}</p>
                    )}
                    {selectedApp.avg_viewers && (
                      <p className="text-gray-300"><span className="text-gray-500">Avg Viewers:</span> {selectedApp.avg_viewers}</p>
                    )}
                    {selectedApp.strengths && (
                      <div>
                        <p className="text-gray-500 mb-1">Strengths:</p>
                        <p className="text-gray-300 ml-4">{selectedApp.strengths}</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Growth Intent */}
                <section>
                  <h3 className="text-lg font-semibold text-white mb-2">Growth Intent</h3>
                  <div className="space-y-2 text-sm">
                    {selectedApp.growth_plan && (
                      <div>
                        <p className="text-gray-500 mb-1">Growth Plan:</p>
                        <p className="text-gray-300 ml-4">{selectedApp.growth_plan}</p>
                      </div>
                    )}
                    {selectedApp.promotion_methods.length > 0 && (
                      <p className="text-gray-300"><span className="text-gray-500">Promotion Methods:</span> {selectedApp.promotion_methods.join(', ')}</p>
                    )}
                    {selectedApp.will_share_link !== null && (
                      <p className="text-gray-300"><span className="text-gray-500">Will Share Link:</span> {selectedApp.will_share_link ? 'Yes' : 'No'}</p>
                    )}
                    {selectedApp.community_goal && (
                      <div>
                        <p className="text-gray-500 mb-1">Community Goal:</p>
                        <p className="text-gray-300 ml-4">{selectedApp.community_goal}</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Referral */}
                <section>
                  <h3 className="text-lg font-semibold text-white mb-2">Referral Activity</h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-300">
                      <span className="text-gray-500">Invited Others:</span> {selectedApp.invited_already ? 'Yes' : 'No'}
                    </p>
                    {selectedApp.invited_already && selectedApp.invited_count && (
                      <p className="text-gray-300"><span className="text-gray-500">Count:</span> {selectedApp.invited_count}</p>
                    )}
                  </div>
                </section>

                {/* Quality */}
                <section>
                  <h3 className="text-lg font-semibold text-white mb-2">Why MLL PRO?</h3>
                  <div className="space-y-2 text-sm">
                    {selectedApp.fit_reason && (
                      <p className="text-gray-300">{selectedApp.fit_reason}</p>
                    )}
                    {selectedApp.vod_links.length > 0 && (
                      <div>
                        <p className="text-gray-500 mb-1">VOD Links:</p>
                        <ul className="space-y-1 ml-4">
                          {selectedApp.vod_links.map((link, i) => (
                            <li key={i}>
                              <a href={link} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">
                                {link}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </section>

                {/* Consent */}
                <section>
                  <h3 className="text-lg font-semibold text-white mb-2">Email Consent</h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-300">
                      <span className="text-gray-500">Transactional:</span> {selectedApp.consent_transactional ? 'Yes' : 'No'}
                    </p>
                    <p className="text-gray-300">
                      <span className="text-gray-500">Updates:</span> {selectedApp.consent_updates ? 'Yes' : 'No'}
                    </p>
                    <p className="text-gray-300">
                      <span className="text-gray-500">Opt-out Marketing:</span> {selectedApp.opt_out_marketing ? 'Yes' : 'No'}
                    </p>
                  </div>
                </section>

                {/* Metadata */}
                <section className="text-xs text-gray-500">
                  <p>Submitted: {new Date(selectedApp.created_at).toLocaleString()}</p>
                  {selectedApp.reviewed_at && (
                    <p>Reviewed: {new Date(selectedApp.reviewed_at).toLocaleString()}</p>
                  )}
                </section>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
