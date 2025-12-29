'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Radio, 
  Search, 
  Filter, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Activity,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SkeletonCard, EmptyState } from '@/components/ui';
import { PageShell, PageHeader, PageSection } from '@/components/layout';
import StreamRow from '@/components/owner/StreamRow';
import StreamDetailDrawer from '@/components/owner/StreamDetailDrawer';
import { useOwnerLiveOpsData, type LiveOpsStreamData } from '@/hooks';

type RegionFilter = 'all' | 'us-east' | 'us-west' | 'eu-west' | 'ap-south';
type StatusFilter = 'all' | 'live' | 'starting' | 'ending';

export default function LiveOpsPage() {
  const router = useRouter();
  const { streams, loading, error, refetch } = useOwnerLiveOpsData();
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStream, setSelectedStream] = useState<LiveOpsStreamData | null>(null);
  const itemsPerPage = 10;

  const handleStreamClick = (stream: LiveOpsStreamData) => {
    setSelectedStream(stream);
  };

  const handleCloseDrawer = () => {
    setSelectedStream(null);
  };

  // Filter and search streams
  const filteredStreams = streams
    .filter(stream => {
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          stream.streamer.toLowerCase().includes(q) || 
          stream.room.toLowerCase().includes(q) ||
          stream.roomId?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .filter(stream => {
      // Region filter
      if (regionFilter !== 'all' && stream.region !== regionFilter) {
        return false;
      }
      return true;
    })
    .filter(stream => {
      // Status filter
      if (statusFilter !== 'all' && stream.status !== statusFilter) {
        return false;
      }
      return true;
    });

  // Pagination
  const totalPages = Math.ceil(filteredStreams.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStreams = filteredStreams.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, regionFilter, statusFilter]);

  return (
    <>
      <PageShell maxWidth="2xl" padding="md">
        <PageHeader
          title="Live Operations"
          description="Monitor and manage active live streams"
          icon={<Radio className="w-8 h-8 text-primary" />}
          backLink="/owner"
          backLabel="Back to Dashboard"
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          }
        />

        {/* Filters and Search Toolbar */}
        <PageSection>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by streamer, room, or room ID..."
                leftIcon={<Search className="w-4 h-4" />}
                inputSize="md"
              />
            </div>
            
            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Region Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value as RegionFilter)}
                  className="h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none min-w-[140px]"
                >
                  <option value="all">All Regions</option>
                  <option value="us-east">US East</option>
                  <option value="us-west">US West</option>
                  <option value="eu-west">EU West</option>
                  <option value="ap-south">AP South</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="relative">
                <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none min-w-[140px]"
                >
                  <option value="all">All Status</option>
                  <option value="live">Live</option>
                  <option value="starting">Starting</option>
                  <option value="ending">Ending</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {paginatedStreams.length} of {filteredStreams.length} streams
            {searchQuery || regionFilter !== 'all' || statusFilter !== 'all' ? ' (filtered)' : ''}
          </div>
        </PageSection>

        {/* Streams Table */}
        <PageSection>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <SkeletonCard key={i} showImage={false} textLines={2} />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12 bg-card border border-border rounded-xl">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Streams</h3>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={refetch} variant="outline">
                Try Again
              </Button>
            </div>
          ) : filteredStreams.length === 0 ? (
            <EmptyState
              icon={<Radio className="w-12 h-12" />}
              title={searchQuery || regionFilter !== 'all' || statusFilter !== 'all' ? 'No streams found' : 'No live streams'}
              description={searchQuery || regionFilter !== 'all' || statusFilter !== 'all' ? 'Try adjusting your filters' : 'There are no active streams at the moment'}
              size="md"
            />
          ) : (
            <>
              {/* Table */}
              <div className="space-y-2">
                {paginatedStreams.map((stream) => (
                  <StreamRow
                    key={stream.id}
                    stream={stream}
                    onClick={handleStreamClick}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="gap-1"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </PageSection>
      </PageShell>

      {/* Stream Detail Drawer */}
      {selectedStream && (
        <StreamDetailDrawer
          stream={selectedStream}
          isOpen={!!selectedStream}
          onClose={handleCloseDrawer}
        />
      )}
    </>
  );
}

